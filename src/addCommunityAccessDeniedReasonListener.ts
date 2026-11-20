import { eventEmitter } from './internals/eventEmitter';
import { parseCommunityAccessDeniedReason } from './internals/communityAccessDeniedReason';
import type { CommunityAccessDeniedReason } from './types/communityAccessDeniedReason';

/**
 * Callback of {@link addCommunityAccessDeniedReasonListener}.
 *
 * @param reason - Why the current user cannot access the community, or `null` when the access is
 *   granted or not known yet.
 */
export type CommunityAccessDeniedReasonListenerCallback = (
  reason: CommunityAccessDeniedReason | null
) => void;

/**
 * Adds a listener for the reason the community access is denied.
 *
 * The callback receives why the current user cannot access the community, or `null` when the
 * access is granted or not known yet. It is the reason the Octopus UI displays its access denied
 * screen for; while the community is closed or temporarily disabled, the reason is that closure.
 * It is sent separately from {@link addHasAccessToCommunityListener}'s value, so the two can
 * briefly disagree. A reason a newer native SDK adds is reported as `'unknown'`.
 *
 * Like {@link addHasAccessToCommunityListener}, the current value is sent when `initialize()`
 * subscribes the native side and is not replayed later: register this listener before
 * `initialize()` when the first value matters.
 *
 * @param callback - Function called when the reason changes
 * @returns A subscription object with a `remove()` method to unsubscribe
 * @see {@link addHasAccessToCommunityListener} – whether the user can access the community.
 *
 * @example
 * ```typescript
 * const subscription = addCommunityAccessDeniedReasonListener((reason) => {
 *   if (reason === 'accountDeleted') {
 *     // The member's account was deleted: sign them out on your side.
 *   }
 * });
 * subscription.remove();
 * ```
 */
export function addCommunityAccessDeniedReasonListener(
  callback: CommunityAccessDeniedReasonListenerCallback
) {
  return eventEmitter.addListener(
    'communityAccessDeniedReasonChanged',
    (data: { reason?: unknown }) => {
      callback(parseCommunityAccessDeniedReason(data?.reason));
    }
  );
}
