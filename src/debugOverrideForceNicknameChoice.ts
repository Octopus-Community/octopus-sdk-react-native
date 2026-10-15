import { OctopusReactNativeSdk } from './internals/nativeModule';

/**
 * **Debug-only.** Overrides whether members must type a nickname before their first contribution.
 * `true` starts the native nickname field empty; `false` prefills the generated nickname.
 * The native SDK still decides whether the screen is needed: a confirmed, locked or app-managed
 * nickname can exempt the member. Not for use in production apps.
 *
 * @param enabled - The value to force, or `null` to restore the backend-provided config.
 * @returns A promise that resolves when the override has been applied.
 */
export function debugOverrideForceNicknameChoice(
  enabled: boolean | null
): Promise<void> {
  return OctopusReactNativeSdk.debugOverrideForceNicknameChoice(
    enabled === null ? null : { value: enabled }
  );
}
