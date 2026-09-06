import { LogLevel } from '../enums/LogLevel.enum';
import type { openNotification as OpenNotification } from '../openNotification';
import type { openUI as OpenUI } from '../openUI';
import type { OctopusNotification } from '../types/octopusNotification';

const mockOpenUI = jest.fn();
const mockAddListener = jest.fn();
const mockRemove = jest.fn();
const mockLog = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    openUI: (...args: unknown[]) => mockOpenUI(...args),
  },
}));

jest.mock('../internals/eventEmitter', () => ({
  eventEmitter: {
    addListener: (...args: unknown[]) => {
      mockAddListener(...args);
      return {
        remove: (...removeArgs: unknown[]) => mockRemove(...removeArgs),
      };
    },
  },
}));

jest.mock('../internals/logger', () => ({
  log: (...args: unknown[]) => mockLog(...args),
}));

/**
 * The registry behind the option keeps its subscribed-once state in module-level variables
 * (see `internals/fullscreenBackRequested.ts`), so each test needs a fresh module graph rather
 * than the one a previous test already subscribed.
 */
const freshModules = (): {
  openUI: typeof OpenUI;
  openNotification: typeof OpenNotification;
} => {
  jest.resetModules();
  return {
    openUI: require('../openUI').openUI,
    openNotification: require('../openNotification').openNotification,
  };
};

/** The native handler the registry subscribed, as the emitter would invoke it. */
const registeredHandler = (): (() => void) =>
  mockAddListener.mock.calls[0]?.[1] as () => void;

beforeEach(() => {
  mockOpenUI.mockReset();
  mockOpenUI.mockResolvedValue(undefined);
  mockAddListener.mockReset();
  mockRemove.mockReset();
  mockLog.mockReset();
});

describe('openUI onBackRequested', () => {
  it('subscribes to nothing when the host passes no callback', async () => {
    // The pre-callback behaviour, byte for byte: a host that never uses the option holds no
    // listener on the module event channel.
    const { openUI } = freshModules();
    await openUI();
    await openUI({ navBarLeadingAction: 'close' });

    expect(mockAddListener).not.toHaveBeenCalled();
  });

  it('subscribes to backRequested exactly once, across repeated opens', async () => {
    const { openUI } = freshModules();
    await openUI({ onBackRequested: () => {} });
    await openUI({ onBackRequested: () => {} });
    await openUI({ onBackRequested: () => {} });

    expect(mockAddListener).toHaveBeenCalledTimes(1);
    expect(mockAddListener.mock.calls[0]?.[0]).toBe('backRequested');
  });

  it('invokes the callback with no arguments when the event arrives', async () => {
    // The event carries no payload: "the user asked to leave" is the whole message, and the
    // public callback's signature says so.
    const { openUI } = freshModules();
    const onBackRequested = jest.fn();
    await openUI({ onBackRequested });

    registeredHandler()();

    expect(onBackRequested).toHaveBeenCalledTimes(1);
    expect(onBackRequested).toHaveBeenCalledWith();
  });

  it('routes the event to the most recent registration only', async () => {
    const { openUI } = freshModules();
    const first = jest.fn();
    const second = jest.fn();
    await openUI({ onBackRequested: first });
    await openUI({ onBackRequested: second });

    registeredHandler()();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('clears the registration when a later open omits the option', async () => {
    // Otherwise a UI opened without the option would still notify the previous UI's callback —
    // the option is per-open, which is what keeps "pass nothing, behave as before" true.
    const { openUI } = freshModules();
    const onBackRequested = jest.fn();
    await openUI({ onBackRequested });
    const handler = registeredHandler();
    await openUI();

    expect(mockRemove).toHaveBeenCalledTimes(1);
    handler();
    expect(onBackRequested).not.toHaveBeenCalled();
  });

  it('re-subscribes after a clearing open', async () => {
    const { openUI } = freshModules();
    await openUI({ onBackRequested: () => {} });
    await openUI();
    const onBackRequested = jest.fn();
    await openUI({ onBackRequested });

    expect(mockAddListener).toHaveBeenCalledTimes(2);
    (mockAddListener.mock.calls[1]?.[1] as () => void)();
    expect(onBackRequested).toHaveBeenCalledTimes(1);
  });

  it('logs a throwing callback instead of letting it escape the emitter', async () => {
    // The emitter has no error channel: an exception escaping the handler would surface as an
    // unhandled rejection with no indication of where it came from.
    const { openUI } = freshModules();
    const boom = new Error('host handler blew up');
    await openUI({
      onBackRequested: () => {
        throw boom;
      },
    });

    expect(() => registeredHandler()()).not.toThrow();
    expect(mockLog).toHaveBeenCalledWith(
      LogLevel.ERROR,
      expect.stringContaining('onBackRequested'),
      boom
    );
  });

  it('sends no extra key across the bridge', async () => {
    // The callback lives in JS only — the native side emits `backRequested` whether or not JS
    // listens, so there is nothing to marshal. The wire payload must be unchanged.
    const { openUI } = freshModules();
    await openUI({ onBackRequested: () => {} });

    // toStrictEqual, never toHaveBeenCalledWith/toEqual: those treat an absent key and a key
    // valued `undefined` as equal, so an `onBackRequested: undefined` leaking into the payload
    // would pass — the exact difference this golden exists to catch. Same rule as the event
    // round-trips in `.claude/commands/sync-event.md`.
    expect(mockOpenUI.mock.calls[0]?.[0]).toStrictEqual({
      interceptUrls: false,
      interceptProfileTaps: false,
      notification: undefined,
      initialScreen: undefined,
      navigationMode: 'navigationStack',
      navBarLeadingAction: undefined,
    });
  });

  it('clears the previous callback even when the open throws on a bad initialScreen', async () => {
    // `openUI` registers before resolveInitialScreen, which throws synchronously on a
    // structurally invalid initialScreen. Without that ordering the previous host's callback
    // would stay armed on a UI this call never opened, contradicting "an open that omits the
    // option clears it".
    const { openUI } = freshModules();
    const stale = jest.fn();
    await openUI({ onBackRequested: stale });
    const handler = registeredHandler();

    expect(() =>
      openUI({ initialScreen: { type: 'post', postId: '  ' } })
    ).toThrow(/initialScreen\.postId/);

    expect(mockRemove).toHaveBeenCalledTimes(1);
    handler();
    expect(stale).not.toHaveBeenCalled();
  });
});

describe('openNotification onBackRequested', () => {
  const sample: OctopusNotification = {
    title: 'T',
    body: 'B',
    linkPath: 'post/1',
    rawPayload: {
      is_octopus_notification: 'true',
      link_path: 'post/1',
      post_id: '1',
    },
  };

  it('registers the callback for the UI it opens', async () => {
    // Same native container as openUI, so the option means the same thing there.
    const { openNotification } = freshModules();
    const onBackRequested = jest.fn();
    await openNotification(sample, { onBackRequested });

    expect(mockAddListener.mock.calls[0]?.[0]).toBe('backRequested');
    registeredHandler()();
    expect(onBackRequested).toHaveBeenCalledTimes(1);
  });

  it('registers nothing when called with no options', async () => {
    const { openNotification } = freshModules();
    await openNotification(sample);

    expect(mockAddListener).not.toHaveBeenCalled();
  });
});
