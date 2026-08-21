import { openUI } from './openUI';
import type { OctopusNotification } from './types/octopusNotification';

/**
 * Opens the Octopus UI at the deep-linked content carried by the
 * notification (e.g. a specific post or comment).
 *
 * Designed for push-tap handlers: combine with `isOctopusNotification` and
 * `getOctopusNotification` to parse the platform push payload first.
 *
 * ```ts
 * messaging().onNotificationOpenedApp((msg) => {
 *   if (!isOctopusNotification(msg.data)) return;
 *   const notif = getOctopusNotification(msg.data);
 *   if (notif) openNotification(notif);
 * });
 * ```
 */
export function openNotification(
  notification: OctopusNotification
): Promise<void> {
  return openUI({ notification });
}
