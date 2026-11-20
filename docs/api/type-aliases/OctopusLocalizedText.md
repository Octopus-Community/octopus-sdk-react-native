[**@octopus-community/react-native v1.16.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusLocalizedText

# Type Alias: OctopusLocalizedText

> **OctopusLocalizedText** = [`OctopusAutoTranslatedText`](../interfaces/OctopusAutoTranslatedText.md) \| [`OctopusPerLanguageText`](../interfaces/OctopusPerLanguageText.md)

A text given either for automatic translation or per language: the label of a prefilled
post's call-to-action button ([OctopusPostCTA.localizedLabel](../interfaces/OctopusPostCTA.md#localizedlabel)) and of the button of a
post linked to one of your objects ([ClientPost.viewObjectButton](../interfaces/ClientPost.md#viewobjectbutton)).

- `autoTranslated` — one text, which Octopus translates automatically for every reader. This
  is what a plain `string` label means.
- `perLanguage` — one text per language your app has, plus the default language. A reader
  whose language is in the list sees that text as is; any other reader sees an automatic
  translation of the default language's text.

Build one with [OctopusLocalizedText.autoTranslated](../variables/OctopusLocalizedText.md#autotranslated) or
[OctopusLocalizedText.perLanguage](../variables/OctopusLocalizedText.md#perlanguage), or write the object literal yourself.

## Languages

A language is a BCP 47 language tag: a language, optionally a script, optionally a region
(`'en'`, `'pt-BR'`, `'zh-Hant-TW'`). The tags are sent as given; the only conversion, made by
the bridge the same way on Android and iOS, reads an underscore as a hyphen (`'pt_BR'` is
`'pt-BR'`) before the native SDK parses the tag as a locale. The native SDK sends each one as
`language[-Script][-REGION]`; variants and extensions are dropped. Octopus groups the regions
of one language together, except for Chinese.

## Validation

The native SDK validates a `perLanguage` text when the call that carries it reaches it, and
refuses it with one of these codes, the same on Android and iOS:

| Code                                      | Meaning                                                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `LOCALIZED_TEXT_EMPTY_TEXTS`              | `texts` is empty.                                                                                                                              |
| `LOCALIZED_TEXT_BLANK_TEXT`               | The text of a language is empty or whitespace-only. The error's `languageCode` names it.                                                       |
| `LOCALIZED_TEXT_EMPTY_LANGUAGE`           | A language of `texts`, or `defaultLanguage`, has no language part (`''`).                                                                      |
| `LOCALIZED_TEXT_DUPLICATE_LANGUAGE`       | Two languages of `texts` give the same code, such as `'en-US'` and `'en-us'`, or `'pt-BR'` and `'pt_BR'`. The error's `languageCode` names it. |
| `LOCALIZED_TEXT_DEFAULT_LANGUAGE_MISSING` | `defaultLanguage` is not exactly one of the languages of `texts` (`'en-US'` when only `'en'` is given). The error's `languageCode` names it.   |

The code is the `code` of a [NavigateToOctopusCreatePostError](../interfaces/NavigateToOctopusCreatePostError.md) for a prefilled post, and of
a [ClientPostError](../interfaces/ClientPostError.md) for a client post. The factories neither check nor convert anything:
the native SDK is the single judge, when the call reaches it, so every wrapper and both
platforms refuse the same texts.
