import type { EmitterSubscription } from 'react-native';
import {
  connectionStateChannel,
  isNonGuestUserConnected,
} from './internals/stateChannels';

export type IsUserConnectedListenerCallback = (isConnected: boolean) => void;

/**
 * Adds a listener for "a fully authenticated (non-guest) user is connected", derived from
 * {@link addConnectionStateListener}.
 *
 * `true` only when a connected, non-guest user is present — on both platforms. (iOS distinguishes
 * guest sessions since native SDK 1.12.6; older iOS SDKs reported every connection as non-guest.)
 * Consecutive duplicate values are collapsed, and the current value is replayed immediately to a
 * listener added after the SDK already published a connection state.
 *
 * Mirrors the native Android `OctopusSDK.isUserConnected`.
 *
 * @param callback - Called with the current value, then on every change.
 * @returns A subscription object with a `remove()` method to unsubscribe.
 *
 * @see {@link isUserConnected} – the synchronous current value.
 * @see {@link addConnectionStateListener} – for guest-vs-authenticated detail.
 *
 * @example
 * ```typescript
 * const subscription = addIsUserConnectedListener((connected) => {
 *   setCanPost(connected);
 * });
 *
 * // Later, to unsubscribe:
 * subscription.remove();
 * ```
 */
export function addIsUserConnectedListener(
  callback: IsUserConnectedListenerCallback
): EmitterSubscription {
  let hasValue = false;
  let last = false;
  return connectionStateChannel.subscribe((state) => {
    const next = isNonGuestUserConnected(state);
    // `map(...).distinct()`, as on the native Flows: a guest connecting while another guest was
    // connected is a connection-state change but not an is-user-connected one.
    if (hasValue && last === next) return;
    hasValue = true;
    last = next;
    callback(next);
  });
}

/**
 * Whether a fully authenticated (non-guest) user is currently connected, as last published by the
 * SDK.
 *
 * The value tracked here is the last one received from the native side. Tracking starts when
 * `initialize()` is called, and the native side pushes its current state asynchronously, so a read
 * taken in the very tick `initialize()` resolves may still report `false` even though a user is
 * connected. For UI, prefer {@link addIsUserConnectedListener}: it replays the value as soon as it
 * is known.
 */
export function isUserConnected(): boolean {
  return isNonGuestUserConnected(connectionStateChannel.current());
}
