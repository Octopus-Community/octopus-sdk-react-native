import { fromMap, type OctopusNotification } from './types/octopusNotification';

/**
 * Parses an Octopus push-notification payload into a typed
 * `OctopusNotification`. Returns `null` when `link_path` is missing.
 * Pure JS — safe to call before `initialize()`.
 */
export function getOctopusNotification(
  payload: Record<string, any>
): OctopusNotification | null {
  return fromMap(payload);
}
