import { OctopusReactNativeSdk } from './internals/nativeModule';
import type { OctopusGroup } from './types/octopusGroup';

/**
 * Fetches the groups visible to the current user.
 *
 * There is no dedicated typed-rejection guard for this call: none of the three native SDKs
 * (Android, iOS, and Flutter's own bridge) classify a `fetchGroups` failure any further than
 * connection-level codes.
 *
 * @returns The up-to-date list of groups.
 * @throws An error whose `code` is one of `NOT_INITIALIZED` (the SDK's `initialize()` has not
 * been called yet), `NO_NETWORK`, `NOT_CONNECTED`, `SERVER_ERROR`, `CONTENT_UNAVAILABLE`, or the
 * fallback `FETCH_GROUPS_ERROR`.
 *
 * @example
 * ```typescript
 * const groups = await fetchGroups();
 * ```
 */
export async function fetchGroups(): Promise<OctopusGroup[]> {
  return (await OctopusReactNativeSdk.fetchGroups()) as OctopusGroup[];
}
