import type { OctopusLocalizedText } from '../types/octopusLocalizedText';

/**
 * The flat wire fields both native bridges decode an {@link OctopusLocalizedText} from. Flat
 * rather than nested so the Android fullscreen path can carry them as Intent extras.
 *
 * - `autoTranslated`: `text` set, `language` and `texts` `null`.
 * - `perLanguage`: `language` and `texts` set, `text` `null`.
 *
 * The natives build a per-language text as soon as `language` or `texts` is non-null, and let
 * the native SDK validate it — it is the authority on what a valid language is.
 */
export interface NativeLocalizedText {
  text: string | null;
  language: string | null;
  texts: Record<string, string> | null;
}

/** The wire fields of "no text at all". */
export const NO_NATIVE_LOCALIZED_TEXT: NativeLocalizedText = {
  text: null,
  language: null,
  texts: null,
};

/**
 * Normalizes a public {@link OctopusLocalizedText} into its wire fields.
 *
 * Only the shape is checked here — a plain-JS caller can hand anything over. The rules on the
 * languages and texts themselves are the native SDK's, so both platforms refuse the same values.
 *
 * @param field - Names the value in thrown messages.
 * @throws Error when `value` is not an `autoTranslated` / `perLanguage` object, or carries a
 * text that is not a string.
 */
export function localizedTextToWire(
  value: OctopusLocalizedText,
  field: string
): NativeLocalizedText {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`${field} must be an OctopusLocalizedText`);
  }
  switch (value.type) {
    case 'autoTranslated':
      if (typeof value.text !== 'string') {
        throw new Error(`${field}.text must be a string`);
      }
      return { text: value.text, language: null, texts: null };
    case 'perLanguage': {
      if (typeof value.defaultLanguage !== 'string') {
        throw new Error(`${field}.defaultLanguage must be a string`);
      }
      if (typeof value.texts !== 'object' || value.texts === null) {
        throw new Error(
          `${field}.texts must be an object of language tag to text`
        );
      }
      const texts: Record<string, string> = {};
      for (const [language, text] of Object.entries(value.texts)) {
        if (typeof text !== 'string') {
          throw new Error(`${field}.texts['${language}'] must be a string`);
        }
        texts[language] = text;
      }
      return { text: null, language: value.defaultLanguage, texts };
    }
    default:
      throw new Error(
        `${field}.type must be 'autoTranslated' or 'perLanguage'`
      );
  }
}

/**
 * Copies the `languageCode` a native `OctopusLocalizedText` validation error carries in its
 * `userInfo` onto the error itself, where {@link ClientPostError} and
 * {@link NavigateToOctopusCreatePostError} document it. Anything else is returned untouched.
 */
export function withLanguageCode(error: unknown): unknown {
  if (typeof error !== 'object' || error === null || 'languageCode' in error) {
    return error;
  }
  const userInfo = (error as { userInfo?: unknown }).userInfo;
  if (typeof userInfo !== 'object' || userInfo === null) return error;
  const languageCode = (userInfo as { languageCode?: unknown }).languageCode;
  if (typeof languageCode === 'string') {
    Object.assign(error, { languageCode });
  }
  return error;
}
