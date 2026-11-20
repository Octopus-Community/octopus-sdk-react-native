[**@octopus-community/react-native v1.16.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusPerLanguageText

# Interface: OctopusPerLanguageText

One text per language, with the language to start from for the readers whose language is not
listed. See [OctopusLocalizedText](../variables/OctopusLocalizedText.md).

## Properties

### defaultLanguage

> `readonly` **defaultLanguage**: `string`

The language of the text shown, and translated, when none matches the reader. Must be
exactly one of the keys of `texts`.

---

### texts

> `readonly` **texts**: `Readonly`\<`Record`\<`string`, `string`\>\>

The text of each language, keyed by BCP 47 language tag (`'en'`, `'pt-BR'`,
`'zh-Hant-TW'`). Not empty, and no blank text.

---

### type

> `readonly` **type**: `"perLanguage"`

Discriminant: always `'perLanguage'`. Build it with `OctopusLocalizedText.perLanguage`.
