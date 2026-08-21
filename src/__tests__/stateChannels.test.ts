import type { DeviceEventEmitterStatic } from 'react-native';
import { LogLevel } from '../enums/LogLevel.enum';

/**
 * The state channels reproduce the Flutter wrapper's stream semantics on the RN bridge:
 * the last value received is replayed to every new subscriber, consecutive duplicates are
 * collapsed, and unsubscribing releases the host callback.
 *
 * Each test loads a FRESH module registry: the channels are module-level singletons holding the
 * cache, so leaking one across tests would make a replay assertion pass on a stale value.
 */

const mockRequestStateSnapshot = jest.fn();
const mockInitialize = jest.fn();
/** Flipped by the "JS newer than the native binary" test. */
let mockSnapshotAvailable = true;

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    // `NativeEventEmitter` calls these on every add/remove.
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    initialize: (...args: unknown[]) => mockInitialize(...args),
    get requestStateSnapshot() {
      return mockSnapshotAvailable
        ? (...args: unknown[]) => mockRequestStateSnapshot(...args)
        : undefined;
    },
  },
}));

type StateApi = typeof import('../addProfileListener') &
  typeof import('../addGroupsListener') &
  typeof import('../addConnectionStateListener') &
  typeof import('../addIsUserConnectedListener') &
  typeof import('../addIsInitialisedListener') &
  typeof import('../isInitialised') &
  typeof import('../initialize') &
  typeof import('../internals/logger');

/**
 * `jest.isolateModules` gives the code loaded inside it its OWN module registry — react-native
 * included, so the `RCTDeviceEventEmitter` singleton the channels subscribe to is not the one an
 * outer `import { DeviceEventEmitter }` would resolve to. Events must therefore be emitted on the
 * instance taken from inside the isolate, which `loadApi` captures here.
 */
let deviceEvents: DeviceEventEmitterStatic;

const loadApi = (): StateApi => {
  let api: StateApi | undefined;
  jest.isolateModules(() => {
    deviceEvents = require('react-native').DeviceEventEmitter;
    api = {
      ...require('../addProfileListener'),
      ...require('../addGroupsListener'),
      ...require('../addConnectionStateListener'),
      ...require('../addIsUserConnectedListener'),
      ...require('../addIsInitialisedListener'),
      ...require('../isInitialised'),
      ...require('../initialize'),
      ...require('../internals/logger'),
    };
  });
  return api as StateApi;
};

const emit = (event: string, payload: unknown): void => {
  deviceEvents.emit(event, payload);
};

const initializeParams = {
  apiKey: 'k',
  connectionMode: { type: 'octopus' as const },
};

const wireGroup = (overrides: Record<string, unknown> = {}) => ({
  id: 'g1',
  name: 'General',
  isFollowed: true,
  canChangeFollowStatus: false,
  canAccess: true,
  canCreateChildren: false,
  ...overrides,
});

beforeEach(() => {
  mockSnapshotAvailable = true;
  mockRequestStateSnapshot.mockReset();
  mockRequestStateSnapshot.mockResolvedValue(undefined);
  mockInitialize.mockReset();
  mockInitialize.mockResolvedValue(undefined);
});

describe('last-value replay', () => {
  it('replays the profile received before the listener was added', () => {
    const api = loadApi();
    // Attach the channel first (as `initialize()` would), then let the native side publish while
    // nobody is subscribed yet.
    expect(api.getProfile()).toBeNull();
    emit('profileChanged', {
      profile: { entitlements: ['premium'], clientUserId: 'u1' },
    });

    const seen: Array<unknown> = [];
    api.addProfileListener((profile) => seen.push(profile));

    expect(seen).toEqual([{ entitlements: ['premium'], clientUserId: 'u1' }]);
  });

  it('replays synchronously, before addProfileListener returns', () => {
    const api = loadApi();
    api.getProfile();
    emit('profileChanged', { profile: { entitlements: [] } });

    let calledBeforeReturn = false;
    let returned = false;
    api.addProfileListener(() => {
      calledBeforeReturn = !returned;
    });
    returned = true;

    expect(calledBeforeReturn).toBe(true);
  });

  it('does not replay anything before a first profile is known', () => {
    const api = loadApi();
    const listener = jest.fn();
    api.addProfileListener(listener);
    // `null` is a real profile value ("not connected") and must stay distinguishable from
    // "nothing received yet" — so nothing is replayed here.
    expect(listener).not.toHaveBeenCalled();
  });

  it('replays a null profile once one has been received', () => {
    const api = loadApi();
    api.getProfile();
    emit('profileChanged', { profile: null });

    const listener = jest.fn();
    api.addProfileListener(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(null);
  });

  it('replays the last groups list and keeps serving new subscribers', () => {
    const api = loadApi();
    api.getGroups();
    emit('groupsChanged', { groups: [wireGroup()] });

    const first = jest.fn();
    const second = jest.fn();
    api.addGroupsListener(first);
    api.addGroupsListener(second);

    const expected = [
      {
        id: 'g1',
        name: 'General',
        isFollowed: true,
        canChangeFollowStatus: false,
        canAccess: true,
        canCreateChildren: false,
      },
    ];
    expect(first).toHaveBeenCalledWith(expected);
    expect(second).toHaveBeenCalledWith(expected);
    expect(api.getGroups()).toEqual(expected);
  });

  it('replays the connection state, guest flag included', () => {
    const api = loadApi();
    api.getConnectionState();
    emit('connectionStateChanged', { connected: true, isGuest: true });

    const listener = jest.fn();
    api.addConnectionStateListener(listener);

    expect(listener).toHaveBeenCalledWith({ connected: true, isGuest: true });
    expect(api.getConnectionState()).toEqual({
      connected: true,
      isGuest: true,
    });
  });

  it('replays `false` for isInitialised before any native event', () => {
    const api = loadApi();
    const listener = jest.fn();
    api.addIsInitialisedListener(listener);

    // The SDK genuinely starts uninitialised, so this channel is seeded rather than "unknown".
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(false);
    expect(api.isInitialised()).toBe(false);
  });

  it('serves a listener subscribed from inside a running fanout', () => {
    const api = loadApi();
    const late = jest.fn();
    const nesting = jest.fn(() => {
      if (nesting.mock.calls.length === 1) api.addGroupsListener(late);
    });
    api.addGroupsListener(nesting);

    emit('groupsChanged', { groups: [wireGroup()] });
    // Replayed once on subscribe, and not a second time for the fanout it was born in.
    expect(late).toHaveBeenCalledTimes(1);
    expect(late).toHaveBeenCalledWith([expect.objectContaining({ id: 'g1' })]);

    emit('groupsChanged', { groups: [] });
    expect(late).toHaveBeenCalledTimes(2);
    expect(late).toHaveBeenLastCalledWith([]);
  });
});

describe('duplicate collapsing', () => {
  it('does not re-fire on an identical profile', () => {
    const api = loadApi();
    const listener = jest.fn();
    api.addProfileListener(listener);

    emit('profileChanged', {
      profile: { entitlements: ['a', 'b'], clientUserId: 'u1' },
    });
    // Same value, entitlements in another order: a set, as on the native side.
    emit('profileChanged', {
      profile: { entitlements: ['b', 'a'], clientUserId: 'u1' },
    });

    expect(listener).toHaveBeenCalledTimes(1);

    emit('profileChanged', {
      profile: { entitlements: ['b'], clientUserId: 'u1' },
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does not re-fire on an identical groups list', () => {
    const api = loadApi();
    const listener = jest.fn();
    api.addGroupsListener(listener);

    emit('groupsChanged', { groups: [wireGroup()] });
    emit('groupsChanged', { groups: [wireGroup()] });
    expect(listener).toHaveBeenCalledTimes(1);

    emit('groupsChanged', { groups: [wireGroup({ isFollowed: false })] });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('collapses a live value equal to the one just replayed', () => {
    const api = loadApi();
    api.getConnectionState();
    emit('connectionStateChanged', { connected: true, isGuest: false });

    const listener = jest.fn();
    api.addConnectionStateListener(listener);
    expect(listener).toHaveBeenCalledTimes(1);

    // iOS's `@Published profile` re-emits on every assignment; the JS layer normalises it.
    emit('connectionStateChanged', { connected: true, isGuest: false });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('isUserConnected', () => {
  it('is true only for a connected, non-guest user', () => {
    const api = loadApi();
    const listener = jest.fn();
    api.addIsUserConnectedListener(listener);

    emit('connectionStateChanged', { connected: true, isGuest: true });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(false);
    expect(api.isUserConnected()).toBe(false);

    emit('connectionStateChanged', { connected: true, isGuest: false });
    expect(listener).toHaveBeenLastCalledWith(true);
    expect(api.isUserConnected()).toBe(true);

    emit('connectionStateChanged', { connected: false });
    expect(listener).toHaveBeenLastCalledWith(false);
    expect(api.isUserConnected()).toBe(false);
  });

  it('does not re-fire when the connection state changes but the derived value does not', () => {
    const api = loadApi();
    const listener = jest.fn();
    api.addIsUserConnectedListener(listener);

    emit('connectionStateChanged', { connected: false });
    expect(listener).toHaveBeenCalledTimes(1);
    // Not connected → guest connected: a connection-state change, but still "no real user".
    emit('connectionStateChanged', { connected: true, isGuest: true });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('replays the derived value to a listener added after the state was published', () => {
    const api = loadApi();
    api.getConnectionState();
    emit('connectionStateChanged', { connected: true, isGuest: false });

    const late = jest.fn();
    api.addIsUserConnectedListener(late);

    // The derivation sits on top of the replaying channel, so it replays too.
    expect(late).toHaveBeenCalledTimes(1);
    expect(late).toHaveBeenCalledWith(true);
  });
});

describe('unsubscribe', () => {
  it('stops delivering to the removed listener only', () => {
    const api = loadApi();
    const removed = jest.fn();
    const kept = jest.fn();
    const subscription = api.addGroupsListener(removed);
    api.addGroupsListener(kept);

    subscription.remove();
    emit('groupsChanged', { groups: [wireGroup()] });

    expect(removed).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledTimes(1);
  });

  it('is idempotent and does not remove a later listener registered by the same host', () => {
    const api = loadApi();
    const first = jest.fn();
    const second = jest.fn();
    const subscription = api.addProfileListener(first);

    subscription.remove();
    api.addProfileListener(second);
    // A second call must not take out the listener that took the freed slot.
    subscription.remove();

    emit('profileChanged', { profile: { entitlements: [] } });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('keeps no reference to a removed listener', () => {
    const api = loadApi();
    const listener = jest.fn();
    const subscription = api.addIsInitialisedListener(listener);
    listener.mockClear();

    subscription.remove();
    emit('isInitialisedChanged', { isInitialised: true });

    expect(listener).not.toHaveBeenCalled();
    // The channel itself stays attached — one internal listener keeping the cache warm, whatever
    // the host does — so the next subscriber still gets the replay.
    expect(deviceEvents.listenerCount('isInitialisedChanged')).toBe(1);
    const late = jest.fn();
    api.addIsInitialisedListener(late);
    expect(late).toHaveBeenCalledWith(true);
  });

  it('survives a listener unsubscribing from inside its own callback', () => {
    const api = loadApi();
    const other = jest.fn();
    let remove = (): void => {};
    const selfRemoving = jest.fn(() => remove());
    const subscription = api.addGroupsListener(selfRemoving);
    remove = () => subscription.remove();
    api.addGroupsListener(other);

    emit('groupsChanged', { groups: [wireGroup()] });
    emit('groupsChanged', { groups: [] });

    expect(selfRemoving).toHaveBeenCalledTimes(1);
    // Removing one listener mid-fanout must not skip the next one.
    expect(other).toHaveBeenCalledTimes(2);
  });
});

describe('host isolation', () => {
  it('isolates a listener that throws, in the fanout and in the replay', () => {
    const api = loadApi();
    const logger = jest.fn();
    api.setLogger(logger);

    const thrower = jest.fn(() => {
      throw new Error('boom');
    });
    const healthy = jest.fn();
    api.addGroupsListener(thrower);
    api.addGroupsListener(healthy);

    expect(() =>
      emit('groupsChanged', { groups: [wireGroup()] })
    ).not.toThrow();
    expect(thrower).toHaveBeenCalledTimes(1);
    // A throwing listener must not starve the ones registered after it.
    expect(healthy).toHaveBeenCalledTimes(1);

    const lateThrower = jest.fn(() => {
      throw new Error('boom');
    });
    // Same isolation on the replay path: `addGroupsListener` itself must not throw.
    expect(() => api.addGroupsListener(lateThrower)).not.toThrow();
    expect(lateThrower).toHaveBeenCalledTimes(1);

    expect(
      logger.mock.calls.filter(([level]) => level === LogLevel.WARN)
    ).toHaveLength(2);
  });

  it('hands out copies, so a host mutation cannot corrupt the cache', () => {
    const api = loadApi();
    api.getGroups();
    emit('groupsChanged', { groups: [wireGroup()] });

    const fromGetter = api.getGroups();
    fromGetter.length = 0;
    expect(api.getGroups()).toHaveLength(1);

    let fromListener: ReturnType<typeof api.getGroups> = [];
    api.addGroupsListener((groups) => {
      fromListener = groups;
    });
    fromListener.length = 0;
    // An in-place mutation of a delivered list would otherwise defeat the duplicate check below.
    emit('groupsChanged', { groups: [wireGroup()] });
    expect(api.getGroups()).toHaveLength(1);
  });
});

describe('wire decoding', () => {
  it('falls back to the native defaults for a malformed group', () => {
    const api = loadApi();
    const listener = jest.fn();
    api.addGroupsListener(listener);

    emit('groupsChanged', { groups: [{ id: 42 }, 'not-a-group', null] });

    expect(listener).toHaveBeenCalledWith([
      {
        id: '',
        name: '',
        isFollowed: false,
        canChangeFollowStatus: true,
        canAccess: true,
        canCreateChildren: true,
      },
    ]);
  });

  it('drops non-string entitlements and a missing clientUserId', () => {
    const api = loadApi();
    const listener = jest.fn();
    api.addProfileListener(listener);

    emit('profileChanged', { profile: { entitlements: ['a', 7, 'a'] } });

    expect(listener).toHaveBeenCalledWith({
      entitlements: ['a'],
      clientUserId: null,
    });
  });

  it('treats anything but an explicit `connected: true` as not connected', () => {
    const api = loadApi();
    const listener = jest.fn();
    api.addConnectionStateListener(listener);

    emit('connectionStateChanged', {});
    expect(listener).toHaveBeenLastCalledWith({ connected: false });

    emit('connectionStateChanged', { connected: true });
    expect(listener).toHaveBeenLastCalledWith({
      connected: true,
      isGuest: false,
    });
  });
});

describe('native snapshot request', () => {
  it('asks the native side to re-emit once, whatever attaches', () => {
    const api = loadApi();
    expect(mockRequestStateSnapshot).not.toHaveBeenCalled();

    api.addProfileListener(jest.fn());
    expect(mockRequestStateSnapshot).toHaveBeenCalledTimes(1);

    // One round-trip covers every channel, so nothing else attaching asks again.
    api.addProfileListener(jest.fn());
    api.getProfile();
    api.addGroupsListener(jest.fn());
    api.addConnectionStateListener(jest.fn());
    api.addIsInitialisedListener(jest.fn());
    expect(mockRequestStateSnapshot).toHaveBeenCalledTimes(1);
  });

  it('does not reject into the host app when the snapshot fails, and retries later', async () => {
    mockRequestStateSnapshot.mockRejectedValueOnce(new Error('bridge is gone'));
    const api = loadApi();

    expect(() => api.addGroupsListener(jest.fn())).not.toThrow();
    // Flush the rejection: an unhandled one would fail the test run.
    await Promise.resolve();

    api.addProfileListener(jest.fn());
    expect(mockRequestStateSnapshot).toHaveBeenCalledTimes(2);
  });

  it('warns instead of throwing when the native binary predates the method', () => {
    mockSnapshotAvailable = false;
    const api = loadApi();
    const logger = jest.fn();
    api.setLogger(logger);

    // JS newer than the app binary: live events still work, only the snapshot is missing.
    expect(() => api.addProfileListener(jest.fn())).not.toThrow();
    // Warned once, not on every channel that attaches afterwards: a method absent from the app
    // binary will not appear later in the same session.
    api.addGroupsListener(jest.fn());
    api.addConnectionStateListener(jest.fn());
    expect(logger).toHaveBeenCalledTimes(1);
    expect(logger.mock.calls[0]?.[0]).toBe(LogLevel.WARN);
    expect(String(logger.mock.calls[0]?.[1])).toContain('requestStateSnapshot');
  });
});

describe('initialize()', () => {
  it('attaches the channels and reports the SDK initialised as soon as it resolves', async () => {
    const api = loadApi();
    expect(mockRequestStateSnapshot).not.toHaveBeenCalled();

    await api.initialize(initializeParams);

    expect(mockRequestStateSnapshot).toHaveBeenCalledTimes(1);
    // No native `isInitialisedChanged` round-trip needed for the getter to be right.
    expect(api.isInitialised()).toBe(true);
  });

  it('does not replay a spurious `false` to a host subscribing after initialization', async () => {
    const api = loadApi();
    await api.initialize(initializeParams);

    const listener = jest.fn();
    api.addIsInitialisedListener(listener);

    expect(listener.mock.calls).toEqual([[true]]);
  });

  it('collapses the native isInitialisedChanged(true) that follows', async () => {
    const api = loadApi();
    const listener = jest.fn();
    api.addIsInitialisedListener(listener);

    await api.initialize(initializeParams);
    emit('isInitialisedChanged', { isInitialised: true });

    expect(listener.mock.calls).toEqual([[false], [true]]);
  });

  it('captures a value published while initialization is still running', async () => {
    const api = loadApi();
    mockInitialize.mockImplementation(async () => {
      emit('profileChanged', {
        profile: { entitlements: [], clientUserId: 'u1' },
      });
    });

    await api.initialize(initializeParams);

    // Attaching before the native call is what makes this value survive to a late subscriber.
    expect(api.getProfile()).toEqual({ entitlements: [], clientUserId: 'u1' });
  });
});
