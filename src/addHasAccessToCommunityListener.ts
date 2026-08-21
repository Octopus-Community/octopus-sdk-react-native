import { eventEmitter } from './internals/eventEmitter';

export type HasAccessToCommunityListenerCallback = (hasAccess: boolean) => void;

/**
 * Adds a listener for community access changes.
 *
 * This listener receives the **Octopus-managed** access state: the cohort value that determines
 * whether the user has access to the community (when the SDK manages the A/B logic). It is triggered
 * when that state changes — e.g. after you call `overrideCommunityAccess`, or when the cohort is
 * updated by Octopus. Use it to show or hide community entry points in your UI. If your app manages
 * access itself (and only reports it via `trackCommunityAccess`), this listener is less relevant,
 * since the SDK is not the source of the access decision.
 *
 * @param callback - Function called when the access status changes
 * @returns A subscription object with a `remove()` method to unsubscribe
 * @see {@link overrideCommunityAccess} – set the cohort when Octopus manages A/B.
 * @see {@link trackCommunityAccess} – report access for analytics when your app manages access.
 *
 * @example
 * ```typescript
 * const subscription = addHasAccessToCommunityListener((hasAccess) => {
 *   console.log(`Has access to community: ${hasAccess}`);
 *   // Show or hide community features based on access
 * });
 * subscription.remove();
 * ```
 */
export function addHasAccessToCommunityListener(
  callback: HasAccessToCommunityListenerCallback
) {
  return eventEmitter.addListener(
    'hasAccessToCommunityChanged',
    (data: { hasAccess: boolean }) => {
      callback(data.hasAccess);
    }
  );
}
