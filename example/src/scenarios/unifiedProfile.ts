/**
 * The Unified Profile override, as the Android reference sample lays it out: a nested
 * section under Scenarios › Sign-in & user with three choices that apply live.
 *
 * Unified Profile is active only when both halves hold: the community's
 * `exposeClientUserId` flag (backend-served, overridable here) AND the host wiring
 * `onNavigateToProfile` (Config › Host callbacks, on by default). The labels and test ids
 * below are copied verbatim from the Android sample so the same QA script drives every
 * platform.
 */

/** `null` follows the backend; `true`/`false` force the flag either way. */
export type ExposeClientUserIdOverride = boolean | null;

export const UNIFIED_PROFILE_TITLE = 'Unified Profile (exposeClientUserId)';

export const UNIFIED_PROFILE_INTRO =
  'Overrides the backend exposeClientUserId flag. Use backend value (default), or ' +
  'force Unified Profile active/inactive. Watch the "Unified Profile" line below ' +
  'flip with it.';

export interface ExposeOverrideChoice {
  value: ExposeClientUserIdOverride;
  label: string;
  testID: string;
}

export const EXPOSE_OVERRIDE_CHOICES: readonly ExposeOverrideChoice[] = [
  {
    value: null,
    label: 'Use backend value',
    testID: 'expose-override-backend',
  },
  { value: true, label: 'Force active', testID: 'expose-override-on' },
  { value: false, label: 'Force inactive', testID: 'expose-override-off' },
];

/**
 * What the section's read-out line shows for the effective flag.
 *
 * `undefined` = not read yet (or the read failed), `null` = the SDK has fetched no
 * community config yet.
 */
export function describeExposeClientUserId(
  config: { exposeClientUserId: boolean } | null | undefined
): string {
  if (config === undefined) return 'unreadable here';
  if (config === null) return '— not fetched yet';
  return config.exposeClientUserId ? '✓ on' : '✗ off';
}
