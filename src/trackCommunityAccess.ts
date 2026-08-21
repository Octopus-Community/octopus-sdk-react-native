import { OctopusReactNativeSdk } from './internals/nativeModule';

/**
 * Track community access for analytics without changing the actual access.
 *
 * **When to use:** When **your app manages its own A/B logic** — i.e. your app decides who can see
 * the community (e.g. via your own feature flag or experiment). Call this to report that decision
 * to Octopus for analytics only. It does not grant or restrict access in the SDK; it only records
 * the value for reporting.
 *
 * **When not to use:** If the **Octopus SDK manages the cohort** (Octopus assigns who has access),
 * use `overrideCommunityAccess` to change the cohort and `addHasAccessToCommunityListener` to react
 * to it. Use `trackCommunityAccess` only when the access decision is owned by your app and you just
 * need to report it.
 *
 * @param hasAccess - The access value to report (e.g. the variant your app decided).
 * @returns A promise that resolves when the tracking call has completed.
 * @throws An error if the SDK is not initialized or the call fails.
 * @see {@link overrideCommunityAccess} – when Octopus manages the cohort, override it (and use addHasAccessToCommunityListener to react).
 * @see {@link addHasAccessToCommunityListener} – subscribe to the Octopus-managed access state (relevant when Octopus or override sets it).
 *
 * @example
 * ```typescript
 * await trackCommunityAccess(true);
 * await trackCommunityAccess(false);
 * ```
 */
export function trackCommunityAccess(hasAccess: boolean): Promise<void> {
  return OctopusReactNativeSdk.trackCommunityAccess(hasAccess);
}
