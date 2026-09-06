import { openUI, type OpenUIOptions } from './openUI';
import type { OctopusNotification } from './types/octopusNotification';

/**
 * Options `openNotification` shares with {@link openUI} — it presents the very same
 * fullscreen container, so the callback means exactly the same thing there.
 */
export type OpenNotificationOptions = Pick<OpenUIOptions, 'onBackRequested'>;

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
 *
 * @param notification - The parsed Octopus notification to open on.
 * @param options - Optional; only {@link OpenUIOptions.onBackRequested} today, with the
 *   same contract and the same last-write-wins registration as on `openUI` — the UI still
 *   closes itself, and omitting it clears any previous registration.
 */
export function openNotification(
  notification: OctopusNotification,
  options?: OpenNotificationOptions
): Promise<void> {
  return openUI({ notification, onBackRequested: options?.onBackRequested });
}
