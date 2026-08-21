import { isOctopusFlag } from './types/octopusNotification';

/**
 * Returns true when the payload's `is_octopus_notification` flag is set.
 * Pure JS — safe to call before `initialize()`.
 *
 * Accepts both Android FCM (flat) and iOS APNs (`data`-envelope) shapes.
 */
export function isOctopusNotification(payload: Record<string, any>): boolean {
  return isOctopusFlag(payload);
}
