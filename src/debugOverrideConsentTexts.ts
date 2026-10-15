import { OctopusReactNativeSdk } from './internals/nativeModule';
import type { OctopusConsentTexts } from './types/consentTexts';

/**
 * **Debug-only.** Overrides the community consent wordings for local testing.
 * Texts are forwarded verbatim, including blank fields and markdown. The native SDK handles
 * fallback, links and layout, and shows its own wording when the variant does not match the
 * effective terms-acceptance mode. This call does not change that mode; use
 * {@link debugOverrideTermsAcceptanceMode} independently. Not for use in production apps.
 *
 * @param texts - The wordings to apply, or `null` to restore the backend-provided texts.
 * @returns A promise that resolves when the override has been applied.
 */
export function debugOverrideConsentTexts(
  texts: OctopusConsentTexts | null
): Promise<void> {
  return OctopusReactNativeSdk.debugOverrideConsentTexts(texts);
}
