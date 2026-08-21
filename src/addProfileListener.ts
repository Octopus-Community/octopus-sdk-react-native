import type { EmitterSubscription } from 'react-native';
import { profileChannel } from './internals/stateChannels';
import type { OctopusProfile } from './types/octopusProfile';

export type ProfileListenerCallback = (profile: OctopusProfile | null) => void;

/**
 * Adds a listener for the connected user's public {@link OctopusProfile}, or `null` when no user is
 * connected.
 *
 * Emits whenever the profile changes — including when entitlements are refreshed. Consecutive
 * duplicate values are collapsed, so it fires only on an actual change (consistent on Android and
 * iOS). **The current value is replayed immediately** to a listener added after the SDK already
 * published one, so a screen mounting later still sees the profile without waiting for the next
 * change. Nothing is replayed before the first value is known — `null` (not connected) is a real
 * value, distinct from "not known yet".
 *
 * Mirrors the native `OctopusSDK.profile`.
 *
 * @param callback - Called with the current profile, then on every change.
 * @returns A subscription object with a `remove()` method to unsubscribe.
 *
 * @see {@link getProfile} – the synchronous current value.
 *
 * @example
 * ```typescript
 * const subscription = addProfileListener((profile) => {
 *   console.log('entitlements', profile?.entitlements ?? []);
 * });
 *
 * // Later, to unsubscribe:
 * subscription.remove();
 * ```
 */
export function addProfileListener(
  callback: ProfileListenerCallback
): EmitterSubscription {
  return profileChannel.subscribe(callback);
}

/**
 * The connected user's public {@link OctopusProfile} as last published by the SDK, or `null` when
 * no user is connected.
 *
 * The value tracked here is the last one received from the native side. Tracking starts when
 * `initialize()` is called, and the native side pushes its current state asynchronously, so a read
 * taken in the very tick `initialize()` resolves may still report `null` even though a user is
 * connected. For UI, prefer {@link addProfileListener}: it replays the value as soon as it is
 * known.
 */
export function getProfile(): OctopusProfile | null {
  return profileChannel.current();
}
