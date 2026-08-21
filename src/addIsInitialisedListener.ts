import type { EmitterSubscription } from 'react-native';
import { isInitialisedChannel } from './internals/stateChannels';

export type IsInitialisedListenerCallback = (isInitialised: boolean) => void;

/**
 * Adds a listener for the SDK initialization state.
 *
 * Fires `true` once the SDK is initialized, and `false` when it goes back to uninitialized.
 * Consecutive duplicates are collapsed. Unlike the other state listeners this one always has a
 * value to replay — the SDK genuinely starts uninitialized — so a listener added before
 * `initialize()` is called back with `false` straight away, then with `true`. A listener added
 * after `initialize()` has resolved is called back with `true` only: `initialize()` publishes the
 * transition itself, so there is no spurious `false` for a host that subscribes late. The other
 * lifecycle calls publish the same way: `stop()` fires `false` and `switchCommunity()` fires
 * `true` as they resolve.
 *
 * Mirrors the native Android `OctopusSDK.isInitialisedFlow`. iOS has no native equivalent: there,
 * the presence of an SDK instance is the source of truth, exactly as in the Flutter wrapper.
 *
 * @param callback - Called with the current value, then on every change.
 * @returns A subscription object with a `remove()` method to unsubscribe.
 *
 * @see {@link isInitialised} – the synchronous current value.
 *
 * @example
 * ```typescript
 * const subscription = addIsInitialisedListener((ready) => {
 *   setSdkReady(ready);
 * });
 *
 * // Later, to unsubscribe:
 * subscription.remove();
 * ```
 */
export function addIsInitialisedListener(
  callback: IsInitialisedListenerCallback
): EmitterSubscription {
  return isInitialisedChannel.subscribe(callback);
}
