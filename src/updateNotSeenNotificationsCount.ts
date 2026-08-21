import { OctopusReactNativeSdk } from './internals/nativeModule';

/**
 * Force refresh the unseen notification count from the server.
 *
 * This method triggers a manual update of the notification badge count.
 * The updated count will be emitted via the notSeenNotificationsCountChanged event.
 * Use `addNotSeenNotificationsCountListener` to listen for count changes.
 *
 * @returns A promise that resolves when the update is complete.
 * @throws An error if the SDK is not initialized or if the update fails.
 *
 * @example
 * ```typescript
 * // Listen to count changes
 * const subscription = addNotSeenNotificationsCountListener((count) => {
 *   console.log(`Unseen notifications: ${count}`);
 *   // Update your badge UI
 * });
 *
 * // Manually refresh the count
 * await updateNotSeenNotificationsCount();
 *
 * // Later, unsubscribe
 * subscription.remove();
 * ```
 */
export function updateNotSeenNotificationsCount(): Promise<void> {
  return OctopusReactNativeSdk.updateNotSeenNotificationsCount();
}
