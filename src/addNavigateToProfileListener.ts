import { eventEmitter } from './internals/eventEmitter';

/** Payload of the `navigateToProfile` event. */
export interface NavigateToProfileEventParams {
  /**
   * The tapped member's id **in your own user base** — the `clientUserId` you
   * passed to `connectUser`, not an Octopus id. Open your own profile screen
   * for that user.
   */
  clientUserId: string;
}

export type NavigateToProfileListenerCallback = (
  params: NavigateToProfileEventParams
) => void;

/**
 * Adds a listener for profile taps inside the Octopus Community UI, so your app
 * can show its own profile screen instead of the SDK's (Unified Profile).
 *
 * Only has an effect when the UI was mounted with profile taps intercepted —
 * `openUI({ interceptProfileTaps: true })` or
 * `<OctopusUIView interceptProfileTaps />` — **and** the community is configured
 * to expose client user ids. Both halves are required: without them the SDK
 * keeps showing its own profile screens and this event is never emitted.
 *
 * Fires for any profile tapped in the community, including the connected user's
 * own. A member the SDK holds no client user id for (a guest, or a
 * back-office-created profile) opens the Octopus activity screen instead — the
 * callback is never invoked without an id.
 *
 * @param callback - Function called with the tapped member's `clientUserId`.
 * @returns A subscription object with a `remove()` method to unsubscribe.
 *
 * @example
 * ```typescript
 * const subscription = addNavigateToProfileListener(({ clientUserId }) => {
 *   navigation.navigate('Profile', { userId: clientUserId });
 * });
 *
 * // Later, to unsubscribe:
 * subscription.remove();
 * ```
 */
export function addNavigateToProfileListener(
  callback: NavigateToProfileListenerCallback
) {
  return eventEmitter.addListener('navigateToProfile', callback);
}
