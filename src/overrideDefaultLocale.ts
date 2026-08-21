import { OctopusReactNativeSdk } from './internals/nativeModule';

/**
 * Parameters for overriding the default locale used by the Octopus SDK UI.
 * Uses ISO 639-1 language code and optional ISO 3166-1 alpha-2 country code.
 */
export interface OverrideLocaleParams {
  /** ISO 639-1 language code (e.g. `"en"`, `"fr"`). */
  languageCode: string;
  /** Optional ISO 3166-1 alpha-2 country code (e.g. `"US"`, `"FR"`). */
  countryCode?: string;
}

/** ISO 639-1: exactly 2 alphabetic characters (case-insensitive, normalized to lowercase). */
const LANGUAGE_CODE_REGEX = /^[a-zA-Z]{2}$/;

/** ISO 3166-1 alpha-2: exactly 2 alphabetic characters (case-insensitive, normalized to uppercase). */
const COUNTRY_CODE_REGEX = /^[a-zA-Z]{2}$/;

function validateAndNormalizeLocale(locale: OverrideLocaleParams): {
  languageCode: string;
  countryCode: string | null;
} {
  const lang = locale.languageCode?.trim() ?? '';
  if (!LANGUAGE_CODE_REGEX.test(lang)) {
    throw new Error(
      "overrideDefaultLocale: languageCode must be a 2-letter ISO 639-1 code (e.g. 'en', 'fr')"
    );
  }
  const country = locale.countryCode?.trim();
  if (country !== undefined && country !== '') {
    if (!COUNTRY_CODE_REGEX.test(country)) {
      throw new Error(
        "overrideDefaultLocale: countryCode must be a 2-letter ISO 3166-1 alpha-2 code (e.g. 'US', 'FR')"
      );
    }
    return {
      languageCode: lang.toLowerCase(),
      countryCode: country.toUpperCase(),
    };
  }
  return {
    languageCode: lang.toLowerCase(),
    countryCode: null,
  };
}

/**
 * Override the default locale used by the Octopus SDK for its UI.
 *
 * The change takes effect immediately for subsequently displayed SDK screens.
 * Pass `null` to reset to the system default locale.
 *
 * @param locale - Object with `languageCode` and optional `countryCode`
 *   (e.g. `{ languageCode: 'fr' }` or `{ languageCode: 'en', countryCode: 'US' }`).
 *   Pass `null` to use the system default (no override).
 * @returns A promise that resolves when the override has been applied.
 * @throws An error if the SDK is not initialized or the call fails.
 * @throws An error if locale is invalid (e.g. non-ISO language/country codes).
 *
 * @example
 * ```typescript
 * // Use French
 * await overrideDefaultLocale({ languageCode: 'fr' });
 *
 * // Use English (US)
 * await overrideDefaultLocale({ languageCode: 'en', countryCode: 'US' });
 *
 * // Reset to system default
 * await overrideDefaultLocale(null);
 * ```
 */
export function overrideDefaultLocale(
  locale: OverrideLocaleParams | null
): Promise<void> {
  if (locale === null) {
    return OctopusReactNativeSdk.overrideDefaultLocale(null, null);
  }
  try {
    const { languageCode, countryCode } = validateAndNormalizeLocale(locale);
    return OctopusReactNativeSdk.overrideDefaultLocale(
      languageCode,
      countryCode
    );
  } catch (e) {
    return Promise.reject(e);
  }
}
