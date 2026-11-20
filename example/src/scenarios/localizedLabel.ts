import { OctopusLocalizedText } from '@octopus-community/react-native';

/** One extra language of a per-language label, as typed in the form. */
export interface LocalizedLabelRow {
  /** Stable React key; never sent. */
  id: number;
  /** BCP 47 language tag, e.g. `fr` or `pt-BR`. */
  language: string;
  label: string;
}

/**
 * The per-language label form of the bridge and create-post scenarios, as in the native
 * samples: off, the scenario sends its plain label, auto-translated; on, a default label with an
 * editable language (prefilled `en`) plus any number of language + label rows.
 */
export interface LocalizedLabelForm {
  perLanguage: boolean;
  defaultLanguage: string;
  defaultLabel: string;
  rows: readonly LocalizedLabelRow[];
}

export const initialLocalizedLabelForm = (
  defaultLabel: string
): LocalizedLabelForm => ({
  perLanguage: false,
  defaultLanguage: 'en',
  defaultLabel,
  rows: [],
});

/**
 * The label the scenario sends.
 *
 * Off: `defaultLabel`, auto-translated. On: one text per language. A row left fully empty is
 * ignored; a half-filled one is sent as it is, so the SDK's own validation error shows (a blank
 * text, an empty language). Two rows naming the same language are refused here, since one JS
 * object cannot hold them both: the second would silently replace the first.
 *
 * @throws Error naming the language given twice.
 */
export function buildLocalizedLabel(
  form: LocalizedLabelForm
): OctopusLocalizedText {
  if (!form.perLanguage) {
    return OctopusLocalizedText.autoTranslated(form.defaultLabel);
  }
  const defaultLanguage = form.defaultLanguage.trim();
  const texts: Record<string, string> = {
    [defaultLanguage]: form.defaultLabel,
  };
  for (const row of form.rows) {
    const language = row.language.trim();
    if (language === '' && row.label === '') continue;
    if (Object.prototype.hasOwnProperty.call(texts, language)) {
      throw new Error(
        `The language "${language}" is given twice: keep one row per language.`
      );
    }
    texts[language] = row.label;
  }
  return OctopusLocalizedText.perLanguage(texts, defaultLanguage);
}

/**
 * One line for the scenario result: the error code, the language a `LOCALIZED_TEXT_…` error
 * names, then the message.
 */
export function describeBridgeError(error: unknown): string {
  if (typeof error !== 'object' || error === null) return String(error);
  const { code, languageCode, message } = error as {
    code?: unknown;
    languageCode?: unknown;
    message?: unknown;
  };
  const text = typeof message === 'string' ? message : String(error);
  if (typeof code !== 'string') return text;
  const language =
    typeof languageCode === 'string' ? ` (language ${languageCode})` : '';
  return `${code}${language}: ${text}`;
}
