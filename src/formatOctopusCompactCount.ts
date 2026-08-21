/**
 * Languages whose locale uses a comma decimal separator. Hardcoded rather than delegating to
 * `Intl.NumberFormat`, for two reasons: the Hermes builds React Native ships without
 * `Intl` would silently fall back to `.` for every locale, and this list has to stay
 * character-for-character identical to the Flutter plugin's — the two wrappers render the same
 * counts next to the same native feed. Drawn from CLDR: continental European, Slavic, Baltic,
 * Turkic, Nordic, …
 */
const COMMA_DECIMAL_LANGUAGES: ReadonlySet<string> = new Set([
  // Romance (excl. Romanian dialects that vary)
  'fr',
  'es',
  'pt',
  'it',
  'ca',
  'gl',
  'oc',
  'co',
  'br',
  'wa',
  // Germanic (excl. English)
  'de',
  'nl',
  'da',
  'sv',
  'no',
  'nb',
  'nn',
  'fi',
  'is',
  'fy',
  // Slavic
  'pl',
  'cs',
  'sk',
  'hr',
  'sr',
  'sl',
  'bg',
  'mk',
  'ru',
  'uk',
  'be',
  // Baltic
  'lv',
  'lt',
  // Other European
  'hu',
  'ro',
  'el',
  'sq',
  'mt',
  'et',
  'eu',
  // Turkic / Caucasian
  'tr',
  'az',
  'kk',
  'ky',
  // Asian / other
  'vi',
  'id',
  'mn',
]);

/** Options for {@link formatOctopusCompactCount}. */
export interface FormatOctopusCompactCountOptions {
  /**
   * The locale whose decimal separator to use — a BCP 47 tag (`'fr'`, `'fr-FR'`) or the
   * underscore form (`'fr_FR'`); only the language subtag is read. `null`, `undefined` or an
   * unrecognised language all fall back to `.`.
   */
  readonly locale?: string | null;
}

/**
 * Returns `,` for languages whose locale uses a comma decimal separator, otherwise `.`.
 */
function decimalSeparator(locale?: string | null): string {
  if (!locale) return '.';
  const languageCode = locale.split(/[-_]/)[0]?.toLowerCase();
  if (!languageCode) return '.';
  return COMMA_DECIMAL_LANGUAGES.has(languageCode) ? ',' : '.';
}

function formatBand(
  count: number,
  divisor: number,
  suffix: string,
  locale?: string | null
): string {
  const value = count / divisor;
  if (value < 10) {
    // Truncate to one decimal (floor, not round) — matches the native SDKs.
    const truncated = Math.floor(value * 10) / 10;
    if (Number.isInteger(truncated)) {
      // Whole-number truncated value — drop the decimal (`2K`, not `2.0K`).
      return `${truncated}${suffix}`;
    }
    return `${truncated.toFixed(1).replace('.', decimalSeparator(locale))}${suffix}`;
  }
  return `${Math.floor(value)}${suffix}`;
}

/**
 * Formats `count` as a compact, human-readable string in the same style as the embedded
 * community UI on both native platforms: `0`–`999` raw, then `K` / `M` / `B` for thousands /
 * millions / billions.
 *
 * Use it to render the counts carried by {@link OctopusPost} (`commentCount`, `viewCount`) and
 * {@link OctopusReactionCount} (`count`) consistently with the native Octopus feed.
 *
 * Pure TypeScript — no native call, no `Intl`, safe to call during render and safe to call
 * before `initialize()`.
 *
 * ## Algorithm
 * - `0`–`999` → `'0'` … `'999'`
 * - `1_000`–`999_999` → `'1K'`, `'1.2K'`, `'9.9K'`, `'12K'`, … `'999K'`
 * - `1_000_000`–`999_999_999` → `'1M'`, `'1.2M'`, … `'999M'`
 * - `≥ 1_000_000_000` → `'1B'`, `'1.2B'`, …
 *
 * Within a band the value is divided by the band's divisor and **floored** to one decimal
 * (truncation, not rounding — `1999` → `'1.9K'`, never `'2.0K'`). One decimal is shown only
 * when the truncated value is `< 10`; otherwise the integer form is used (`'12K'`, `'999K'`).
 * A whole-number truncated value drops the decimal (`'2K'`, not `'2.0K'`).
 *
 * ## Locale
 * `options.locale` controls the decimal separator **only**: `'1,2K'` for languages that use a
 * comma decimal (French, German, Spanish, …) and `'1.2K'` for the rest. The `K` / `M` / `B`
 * suffixes are not translated — they match what the native SDKs render. Pass the locale you
 * handed to {@link overrideDefaultLocale}, so the formatted counts match the embedded UI.
 *
 * ## Negative and non-integer values
 * Negative numbers are returned unchanged (`-12345` → `'-12345'`) — counts are expected to be
 * non-negative, and the bug case is exposed rather than silently rebanded. A non-integer is
 * truncated toward zero before formatting; a non-finite number is stringified as-is.
 *
 * @param count - The raw count to format.
 * @param options - Optional formatting options.
 * @returns The compact representation.
 *
 * @example
 * ```typescript
 * formatOctopusCompactCount(1234);                        // '1.2K'
 * formatOctopusCompactCount(1234, { locale: 'fr-FR' });   // '1,2K'
 * formatOctopusCompactCount(12345);                       // '12K'
 * formatOctopusCompactCount(1_234_567_890);               // '1.2B'
 * ```
 */
export function formatOctopusCompactCount(
  count: number,
  options?: FormatOctopusCompactCountOptions
): string {
  if (!Number.isFinite(count)) return String(count);
  const value = Math.trunc(count);
  const locale = options?.locale;
  if (value < 1000) return String(value);
  if (value >= 1000000000) return formatBand(value, 1000000000, 'B', locale);
  if (value >= 1000000) return formatBand(value, 1000000, 'M', locale);
  return formatBand(value, 1000, 'K', locale);
}
