import { OctopusReactNativeSdk } from './internals/nativeModule';

/**
 * **Debug-only.** Forces the `exposeClientUserId` community flag — the Unified Profile
 * activation flag — overriding the backend-provided community config, for local testing of
 * profile-tap interception before the backend serves the flag. Not part of the stable public
 * API surface and not for use in production apps.
 *
 * The flag is only half of the activation contract: Unified Profile routing also requires
 * profile taps to be intercepted (`interceptProfileTaps: true` on `openUI()` or
 * `<OctopusUIView>`).
 *
 * @param enabled - The value to force, or `null` to restore the backend-provided config.
 * @returns A promise that resolves when the override has been applied.
 */
export function debugOverrideExposeClientUserId(
  enabled: boolean | null
): Promise<void> {
  // A primitive boolean cannot carry null across the bridge on both platforms,
  // so the tri-state travels as `{ value } | null`, like the other overrides'
  // map payloads.
  return OctopusReactNativeSdk.debugOverrideExposeClientUserId(
    enabled === null ? null : { value: enabled }
  );
}
