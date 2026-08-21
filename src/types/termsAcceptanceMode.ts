/**
 * How the community requires users to accept its legal documents (terms, privacy policy,
 * community rules) at their first contribution.
 *
 * - `implicit`: today's default — a legal disclaimer is shown at the bottom of the editor and
 *   acceptance is implicit when the user publishes.
 * - `explicitMultiCheckbox`: a bottom sheet with one checkbox per legal document (all required)
 *   is shown at the first contribution.
 * - `explicitSingleCheckbox`: same bottom sheet with a single combined checkbox.
 *
 * Mirrors the native `CommunityConfig.TermsAcceptanceMode` config type — see
 * {@link debugOverrideTermsAcceptanceMode}. This is a **debug-only** testing hatch: it does not
 * exist on a real production community config, which is set server-side.
 */
export type TermsAcceptanceMode =
  | 'implicit'
  | 'explicitMultiCheckbox'
  | 'explicitSingleCheckbox';
