import { DeviceEventEmitter } from 'react-native';
import type { EmitterSubscription } from 'react-native';
import { eventEmitter } from './eventEmitter';
import { OctopusReactNativeSdk } from './nativeModule';
import { log } from './logger';
import { LogLevel } from '../enums/LogLevel.enum';
import type { OctopusGroup } from '../types/octopusGroup';
import type { OctopusProfile } from '../types/octopusProfile';
import type { OctopusConnectionState } from '../types/octopusConnectionState';

/**
 * One reactive state channel: a native event name, the last value seen on it, and the host
 * listeners subscribed to it.
 *
 * The native sides collect hot sources (Kotlin `StateFlow`, Combine `@Published`), which replay
 * their current value the moment collection starts — typically while `initialize()` is still
 * resolving. A host that subscribes *after* that would otherwise never see the value until it
 * changed again, which is why this class caches the last value and replays it to every new
 * subscriber. That is the same contract the Flutter wrapper exposes on its streams
 * (`_seedThenListen` in `octopus_sdk.dart`), reproduced here:
 *
 * - the listener is registered on the emitter **before** the cached value is replayed, so a value
 *   fired in the register→replay gap is not dropped;
 * - `equals` collapses consecutive duplicates *per subscriber*, including a live value equal to
 *   the one just replayed — the same scope as Dart's `.distinct()`, which is applied per
 *   subscription. On the profile channel this also normalises a native asymmetry: Android's
 *   `profile` Flow is already `distinctUntilChanged`, while iOS's `@Published profile` re-emits on
 *   every assignment.
 *
 * Every host listener is a real `NativeEventEmitter` registration, so the object handed back is a
 * genuine `EmitterSubscription` — the same unsubscribe contract as every other listener in this
 * package. The cache is kept by one *separate* internal registration, attached by
 * {@link attachStateChannels} (from `initialize()`) or lazily by the first `subscribe`/`current`.
 * It is deliberately never removed: dropping it would leave the cache stale for the next
 * subscriber, and the cache is what makes the replay work.
 */
class StateChannel<T> {
  private cacheSubscription: EmitterSubscription | null = null;
  private value: T;
  private hasValue: boolean;

  /**
   * @param eventName - Native event carrying this channel's payload.
   * @param decode - Turns the raw event body into a value. Reads defensively — a malformed payload
   * yields the same defaults as the native models rather than throwing into the host app.
   * @param equals - Consecutive-duplicate test.
   * @param copy - Returns a detached copy, so neither a getter's caller nor a replayed listener can
   * mutate the cache (an in-place sort of the groups array would otherwise defeat `equals`).
   * @param fallback - Value reported by {@link current} before anything has been received.
   * @param seeded - When `true`, `fallback` is a real value rather than "not known yet", so it is
   * replayed to subscribers as-is. Only `isInitialised` is seeded: it genuinely starts `false`,
   * exactly as in the Flutter wrapper.
   */
  constructor(
    private readonly eventName: string,
    private readonly decode: (payload: unknown) => T,
    private readonly equals: (a: T, b: T) => boolean,
    private readonly copy: (value: T) => T,
    fallback: T,
    seeded = false
  ) {
    this.value = fallback;
    this.hasValue = seeded;
  }

  /** The last value received, or the channel's fallback when nothing has arrived yet. */
  current(): T {
    this.attach();
    return this.copy(this.value);
  }

  /**
   * Registers `listener`, replays the last known value to it, and returns its subscription.
   *
   * A listener that throws is logged and isolated: the exception never escapes into the emitter's
   * fanout (which would starve the listeners registered after it) nor out of `addXxxListener`
   * itself during the replay. Flutter's `StreamController` isolates subscribers the same way.
   */
  subscribe(listener: (value: T) => void): EmitterSubscription {
    this.attach();

    let hasSeen = false;
    let seen: T;
    const deliver = (next: T): void => {
      if (hasSeen && this.equals(seen, next)) return;
      hasSeen = true;
      seen = next;
      try {
        listener(this.copy(next));
      } catch (error) {
        log(
          LogLevel.WARN,
          `An Octopus ${this.eventName} listener threw`,
          error
        );
      }
    };

    const subscription = eventEmitter.addListener(
      this.eventName,
      (payload: unknown) => deliver(this.decode(payload))
    );
    // Replay AFTER registering, so a value arriving in between is delivered once, in order.
    if (this.hasValue) {
      deliver(this.value);
    }
    return subscription;
  }

  /**
   * Starts keeping this channel's cache warm, and asks the native side for the value it holds
   * right now. Idempotent.
   */
  attach(): void {
    if (this.cacheSubscription != null) return;
    this.cacheSubscription = eventEmitter.addListener(
      this.eventName,
      (payload: unknown) => {
        this.value = this.decode(payload);
        this.hasValue = true;
      }
    );
    requestStateSnapshot();
  }
}

/**
 * Attaches every state channel, so their caches track the native state from this point on whether
 * or not a host has subscribed.
 *
 * Called by `initialize()` — the React Native counterpart of the Flutter wrapper calling
 * `_initializeEventChannel()` on entry. Without it a channel only starts caching when a host first
 * touches it, and that host's first read is necessarily the fallback.
 */
export const attachStateChannels = (): void => {
  snapshotRequested = false;
  profileChannel.attach();
  groupsChannel.attach();
  connectionStateChannel.attach();
  isInitialisedChannel.attach();
};

/**
 * Publishes a value into a channel from the JS side, exactly as if the native side had emitted it.
 *
 * Used by `initialize()` to mark the SDK initialised the moment the native promise resolves,
 * without waiting for the `isInitialisedChanged` round-trip — Flutter does the same by assigning
 * `_lastIsInitialised = true` right after its `await`. Routed through the device emitter rather
 * than poked into the cache, so subscribers and the cache see one identical path; a duplicate
 * native event arriving afterwards is collapsed by `equals`.
 */
export const publishIsInitialised = (isInitialised: boolean): void => {
  deviceEventEmitter.emit('isInitialisedChanged', { isInitialised });
};

/**
 * Resolved once, at module load, rather than on each publish.
 *
 * `react-native`'s named exports are lazy getters that `require()` on access, so reading
 * `DeviceEventEmitter` at call time resolves it against whatever module registry is current then —
 * which is not necessarily the one `eventEmitter` captured when it was constructed. Binding it here
 * guarantees both sit on the same emitter instance.
 */
const deviceEventEmitter = DeviceEventEmitter;

/**
 * Whether the native side has already been asked to re-emit its current state. Reset by
 * {@link attachStateChannels} so a re-`initialize()` asks again, and on failure so a later attach
 * retries.
 */
let snapshotRequested = false;

/**
 * Set when the native module turns out to have no `requestStateSnapshot` at all. Unlike
 * {@link snapshotRequested} this is never reset: a method missing from the app binary will not
 * appear later in the same JS session, so there is nothing to retry and nothing to re-warn about.
 */
let snapshotUnavailable = false;

/**
 * Asks the native side to re-emit the current value of every state channel.
 *
 * The JS cache is only filled from the moment a channel attaches, so a host that subscribes after
 * `initialize()` would otherwise start empty. This is the React Native counterpart of the Flutter
 * plugin re-sending its snapshot from `onListen` — `NativeEventEmitter` gives the native module no
 * usable "a listener attached" signal (see `nativeEventGate.test.ts`), so the JS side asks
 * explicitly instead.
 *
 * One call covers all four channels, so it is made once per initialisation rather than once per
 * attach. Fire-and-forget: a failure only means the snapshot is missing, and the next native change
 * still arrives normally.
 */
const requestStateSnapshot = (): void => {
  if (snapshotRequested || snapshotUnavailable) return;
  snapshotRequested = true;

  const request = OctopusReactNativeSdk.requestStateSnapshot as unknown;
  if (typeof request !== 'function') {
    // JS/native skew: the JS is newer than the app binary (pods or Gradle not rebuilt). The
    // channels still work off live events; only the initial snapshot is missing.
    snapshotUnavailable = true;
    log(
      LogLevel.WARN,
      'The native Octopus module has no requestStateSnapshot method. Rebuild the native app to ' +
        'get the current state replayed on subscribe.'
    );
    return;
  }

  let result: unknown;
  try {
    result = (request as () => unknown).call(OctopusReactNativeSdk);
  } catch (error) {
    snapshotRequested = false;
    log(LogLevel.WARN, 'Failed to request the Octopus state snapshot', error);
    return;
  }

  if (
    typeof result === 'object' &&
    result !== null &&
    typeof (result as Promise<void>).then === 'function'
  ) {
    (result as Promise<void>).then(undefined, (error: unknown) => {
      snapshotRequested = false;
      log(LogLevel.WARN, 'Failed to request the Octopus state snapshot', error);
    });
  }
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;

/**
 * Decodes one group. A missing/non-string `id` or `name` falls back to an empty string and missing
 * booleans use the native model's defaults — same defensive reads as the Flutter
 * `OctopusGroup.fromWire`.
 */
const decodeGroup = (wire: unknown): OctopusGroup => {
  const map = asRecord(wire) ?? {};
  return {
    id: typeof map.id === 'string' ? map.id : '',
    name: typeof map.name === 'string' ? map.name : '',
    isFollowed: typeof map.isFollowed === 'boolean' ? map.isFollowed : false,
    canChangeFollowStatus:
      typeof map.canChangeFollowStatus === 'boolean'
        ? map.canChangeFollowStatus
        : true,
    canAccess: typeof map.canAccess === 'boolean' ? map.canAccess : true,
    canCreateChildren:
      typeof map.canCreateChildren === 'boolean' ? map.canCreateChildren : true,
  };
};

const decodeGroups = (payload: unknown): OctopusGroup[] => {
  const raw = asRecord(payload)?.groups;
  return Array.isArray(raw)
    ? raw.filter((group) => asRecord(group) !== null).map(decodeGroup)
    : [];
};

const decodeProfile = (payload: unknown): OctopusProfile | null => {
  const raw = asRecord(asRecord(payload)?.profile);
  if (raw === null) return null;
  const entitlements = Array.isArray(raw.entitlements)
    ? raw.entitlements.filter(
        (entitlement): entitlement is string => typeof entitlement === 'string'
      )
    : [];
  return {
    // The native models are sets; de-duplicate so the array keeps set semantics.
    entitlements: Array.from(new Set(entitlements)),
    clientUserId:
      typeof raw.clientUserId === 'string' ? raw.clientUserId : null,
  };
};

const decodeConnectionState = (payload: unknown): OctopusConnectionState => {
  const map = asRecord(payload) ?? {};
  if (map.connected !== true) return { connected: false };
  return { connected: true, isGuest: map.isGuest === true };
};

const decodeIsInitialised = (payload: unknown): boolean =>
  asRecord(payload)?.isInitialised === true;

const profileEquals = (
  a: OctopusProfile | null,
  b: OctopusProfile | null
): boolean => {
  if (a === null || b === null) return a === b;
  if (a.clientUserId !== b.clientUserId) return false;
  if (a.entitlements.length !== b.entitlements.length) return false;
  // Unordered, like the native `Set<String>` this array stands for.
  const held = new Set(a.entitlements);
  return b.entitlements.every((entitlement) => held.has(entitlement));
};

const groupEquals = (a: OctopusGroup, b: OctopusGroup): boolean =>
  a.id === b.id &&
  a.name === b.name &&
  a.isFollowed === b.isFollowed &&
  a.canChangeFollowStatus === b.canChangeFollowStatus &&
  a.canAccess === b.canAccess &&
  a.canCreateChildren === b.canCreateChildren;

const groupsEqual = (a: OctopusGroup[], b: OctopusGroup[]): boolean =>
  a.length === b.length &&
  a.every((group, index) => groupEquals(group, b[index] as OctopusGroup));

const connectionStatesEqual = (
  a: OctopusConnectionState,
  b: OctopusConnectionState
): boolean =>
  a.connected === b.connected &&
  (!a.connected || !b.connected || a.isGuest === b.isGuest);

const copyProfile = (profile: OctopusProfile | null): OctopusProfile | null =>
  profile === null
    ? null
    : { ...profile, entitlements: profile.entitlements.slice() };

const copyGroups = (groups: OctopusGroup[]): OctopusGroup[] =>
  groups.map((group) => ({ ...group }));

const copyConnectionState = (
  state: OctopusConnectionState
): OctopusConnectionState => ({ ...state });

const identity = <T>(value: T): T => value;

export const profileChannel = new StateChannel<OctopusProfile | null>(
  'profileChanged',
  decodeProfile,
  profileEquals,
  copyProfile,
  null
);

export const groupsChannel = new StateChannel<OctopusGroup[]>(
  'groupsChanged',
  decodeGroups,
  groupsEqual,
  copyGroups,
  []
);

export const connectionStateChannel = new StateChannel<OctopusConnectionState>(
  'connectionStateChanged',
  decodeConnectionState,
  connectionStatesEqual,
  copyConnectionState,
  { connected: false }
);

export const isInitialisedChannel = new StateChannel<boolean>(
  'isInitialisedChanged',
  decodeIsInitialised,
  (a, b) => a === b,
  identity,
  false,
  // The SDK genuinely starts uninitialised — `false` is a value, not "unknown".
  true
);

/** `true` only for a connected, non-guest user. */
export const isNonGuestUserConnected = (
  state: OctopusConnectionState
): boolean => state.connected && !state.isGuest;
