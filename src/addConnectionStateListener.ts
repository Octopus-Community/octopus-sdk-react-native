import type { EmitterSubscription } from 'react-native';
import { connectionStateChannel } from './internals/stateChannels';
import type { OctopusConnectionState } from './types/octopusConnectionState';

export type ConnectionStateListenerCallback = (
  state: OctopusConnectionState
) => void;

/**
 * Adds a listener for the current {@link OctopusConnectionState}.
 *
 * Fires whenever the user transitions between connected and not-connected, and whenever the guest
 * flag flips. Consecutive duplicate values are collapsed. **The current state is replayed
 * immediately** to a listener added after the SDK already published one.
 *
 * Mirrors the native Android `OctopusSDK.connectionState`; on iOS the value is derived from the
 * `profile` publisher and the guest flag is read from `OctopusProfile.isGuest` (native iOS
 * 1.12.6+).
 *
 * @param callback - Called with the current state, then on every change.
 * @returns A subscription object with a `remove()` method to unsubscribe.
 *
 * @see {@link getConnectionState} – the synchronous current value.
 * @see {@link isUserConnected} – the simpler "a real, non-guest user is connected" signal.
 *
 * @example
 * ```typescript
 * const subscription = addConnectionStateListener((state) => {
 *   if (state.connected && state.isGuest) {
 *     showJoinTheCommunityBanner();
 *   }
 * });
 *
 * // Later, to unsubscribe:
 * subscription.remove();
 * ```
 */
export function addConnectionStateListener(
  callback: ConnectionStateListenerCallback
): EmitterSubscription {
  return connectionStateChannel.subscribe(callback);
}

/**
 * The current {@link OctopusConnectionState} as last published by the SDK.
 *
 * The value tracked here is the last one received from the native side. Tracking starts when
 * `initialize()` is called, and the native side pushes its current state asynchronously, so a read
 * taken in the very tick `initialize()` resolves may still report `{ connected: false }` even
 * though a user is connected. For UI, prefer {@link addConnectionStateListener}: it replays the
 * state as soon as it is known.
 */
export function getConnectionState(): OctopusConnectionState {
  return connectionStateChannel.current();
}
