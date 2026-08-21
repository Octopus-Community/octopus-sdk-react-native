import { eventEmitter } from './internals/eventEmitter';

export type NotSeenNotificationsCountListenerCallback = (count: number) => void;

/**
 * Adds a listener for not seen notifications count changes.
 *
 * This listener is triggered whenever the count of unseen notifications changes.
 * The count is automatically updated by the SDK, but can also be manually refreshed
 * using `updateNotSeenNotificationsCount()`.
 *
 * @param callback - Function called when the notification count changes
 * @returns A subscription object with a `remove()` method to unsubscribe
 *
 * @example
 * ```typescript
 * const subscription = addNotSeenNotificationsCountListener((count) => {
 *   console.log(`Unseen notifications: ${count}`);
 *   // Update your app's badge or UI
 * });
 *
 * // Later, to unsubscribe:
 * subscription.remove();
 * ```
 */
export function addNotSeenNotificationsCountListener(
  callback: NotSeenNotificationsCountListenerCallback
) {
  return eventEmitter.addListener(
    'notSeenNotificationsCountChanged',
    (data: { count: number }) => {
      callback(data.count);
    }
  );
}
