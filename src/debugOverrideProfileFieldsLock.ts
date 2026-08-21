import { OctopusReactNativeSdk } from './internals/nativeModule';
import type { ProfileFieldsLock } from './types/profileFieldsLock';

/**
 * **Debug-only.** Forces the per-field profile lock, overriding the backend-provided community
 * config, for local testing of the profile / profile-edit screens. Not part of the stable public
 * API surface and not for use in production apps.
 *
 * @param lock - The lock to apply, or `null` to restore the backend-provided config.
 * @returns A promise that resolves when the override has been applied.
 */
export function debugOverrideProfileFieldsLock(
  lock: ProfileFieldsLock | null
): Promise<void> {
  return OctopusReactNativeSdk.debugOverrideProfileFieldsLock(lock);
}
