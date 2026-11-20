/**
 * A text given either for automatic translation or per language: the label of a prefilled
 * post's call-to-action button ({@link OctopusPostCTA.localizedLabel}) and of the button of a
 * post linked to one of your objects ({@link ClientPost.viewObjectButton}).
 *
 * - `autoTranslated` — one text, which Octopus translates automatically for every reader. This
 *   is what a plain `string` label means.
 * - `perLanguage` — one text per language your app has, plus the default language. A reader
 *   whose language is in the list sees that text as is; any other reader sees an automatic
 *   translation of the default language's text.
 *
 * Build one with {@link OctopusLocalizedText.autoTranslated} or
 * {@link OctopusLocalizedText.perLanguage}, or write the object literal yourself.
 *
 * ## Languages
 *
 * A language is a BCP 47 language tag: a language, optionally a script, optionally a region
 * (`'en'`, `'pt-BR'`, `'zh-Hant-TW'`). The tags are sent as given; the only conversion, made by
 * the bridge the same way on Android and iOS, reads an underscore as a hyphen (`'pt_BR'` is
 * `'pt-BR'`) before the native SDK parses the tag as a locale. The native SDK sends each one as
 * `language[-Script][-REGION]`; variants and extensions are dropped. Octopus groups the regions
 * of one language together, except for Chinese.
 *
 * ## Validation
 *
 * The native SDK validates a `perLanguage` text when the call that carries it reaches it, and
 * refuses it with one of these codes, the same on Android and iOS:
 *
 * | Code | Meaning |
 * |---|---|
 * | `LOCALIZED_TEXT_EMPTY_TEXTS` | `texts` is empty. |
 * | `LOCALIZED_TEXT_BLANK_TEXT` | The text of a language is empty or whitespace-only. The error's `languageCode` names it. |
 * | `LOCALIZED_TEXT_EMPTY_LANGUAGE` | A language of `texts`, or `defaultLanguage`, has no language part (`''`). |
 * | `LOCALIZED_TEXT_DUPLICATE_LANGUAGE` | Two languages of `texts` give the same code, such as `'en-US'` and `'en-us'`, or `'pt-BR'` and `'pt_BR'`. The error's `languageCode` names it. |
 * | `LOCALIZED_TEXT_DEFAULT_LANGUAGE_MISSING` | `defaultLanguage` is not exactly one of the languages of `texts` (`'en-US'` when only `'en'` is given). The error's `languageCode` names it. |
 *
 * The code is the `code` of a {@link NavigateToOctopusCreatePostError} for a prefilled post, and of
 * a {@link ClientPostError} for a client post. The factories neither check nor convert anything:
 * the native SDK is the single judge, when the call reaches it, so every wrapper and both
 * platforms refuse the same texts.
 */
export type OctopusLocalizedText =
  | OctopusAutoTranslatedText
  | OctopusPerLanguageText;

/**
 * One text, which Octopus translates automatically for every reader. See
 * {@link OctopusLocalizedText}.
 */
export interface OctopusAutoTranslatedText {
  /** Discriminant: always `'autoTranslated'`. Build it with `OctopusLocalizedText.autoTranslated`. */
  readonly type: 'autoTranslated';
  /** The text, in any language. */
  readonly text: string;
}

/**
 * One text per language, with the language to start from for the readers whose language is not
 * listed. See {@link OctopusLocalizedText}.
 */
export interface OctopusPerLanguageText {
  /** Discriminant: always `'perLanguage'`. Build it with `OctopusLocalizedText.perLanguage`. */
  readonly type: 'perLanguage';
  /**
   * The text of each language, keyed by BCP 47 language tag (`'en'`, `'pt-BR'`,
   * `'zh-Hant-TW'`). Not empty, and no blank text.
   */
  readonly texts: Readonly<Record<string, string>>;
  /**
   * The language of the text shown, and translated, when none matches the reader. Must be
   * exactly one of the keys of `texts`.
   */
  readonly defaultLanguage: string;
}

/**
 * Builders for {@link OctopusLocalizedText}.
 *
 * @example
 * ```typescript
 * const label = OctopusLocalizedText.perLanguage(
 *   { 'en': 'Read the article', 'fr': "Lire l'article", 'pt-BR': 'Ler o artigo' },
 *   'en'
 * );
 * await fetchOrCreateClientObjectRelatedPost({
 *   objectId: article.id,
 *   text: article.summary,
 *   viewObjectButton: label,
 * });
 * ```
 */
export const OctopusLocalizedText = {
  /**
   * One text, translated automatically by Octopus for every reader.
   *
   * @param text - The text, in any language.
   * @returns An `autoTranslated` text.
   */
  autoTranslated(text: string): OctopusAutoTranslatedText {
    return { type: 'autoTranslated', text };
  },

  /**
   * One text per language. Not validated here: the native SDK validates it when the call that
   * carries it reaches it — see the codes on {@link OctopusLocalizedText}.
   *
   * @param texts - The text of each language, keyed by BCP 47 language tag.
   * @param defaultLanguage - The language of the text to show and translate when none matches
   * the reader; one of the keys of `texts`.
   * @returns A `perLanguage` text holding a copy of `texts`.
   */
  perLanguage(
    texts: Readonly<Record<string, string>>,
    defaultLanguage: string
  ): OctopusPerLanguageText {
    return { type: 'perLanguage', texts: { ...texts }, defaultLanguage };
  },
};
