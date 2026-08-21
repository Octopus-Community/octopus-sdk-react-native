import { OctopusReactNativeSdk } from './internals/nativeModule';
import type { TermsAcceptanceMode } from './types/termsAcceptanceMode';

/**
 * **Debug-only.** Forces the terms-acceptance mode, overriding the backend-provided community
 * config, for local testing of the consent sheet. Not part of the stable public API surface and
 * not for use in production apps.
 *
 * @param mode - The mode to force, or `null` to restore the backend-provided config.
 * @returns A promise that resolves when the override has been applied.
 */
export function debugOverrideTermsAcceptanceMode(
  mode: TermsAcceptanceMode | null
): Promise<void> {
  return OctopusReactNativeSdk.debugOverrideTermsAcceptanceMode(mode);
}
