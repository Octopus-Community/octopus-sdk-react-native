import { OctopusReactNativeSdk } from './internals/nativeModule';

/**
 * Forces a refresh of the connected user's entitlements from the server.
 *
 * Entitlements are normally kept up to date automatically; call this only when you need an
 * up-to-date value synchronously — e.g. right after your app's own purchase/subscription flow
 * completes, before checking `OctopusGroup.canAccess` on a just-unlocked group.
 *
 * @returns A promise that resolves when entitlements have been refreshed.
 * @throws A {@link RefreshEntitlementsError} — see {@link isRefreshEntitlementsError} to narrow it.
 *
 * @example
 * ```typescript
 * try {
 *   await refreshEntitlements();
 * } catch (error) {
 *   if (isRefreshEntitlementsError(error)) {
 *     console.warn(`refreshEntitlements failed — ${error.code}: ${error.message}`);
 *   }
 * }
 * ```
 */
export function refreshEntitlements(): Promise<void> {
  return OctopusReactNativeSdk.refreshEntitlements();
}
