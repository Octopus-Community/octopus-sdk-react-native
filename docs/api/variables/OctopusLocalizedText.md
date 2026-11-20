[**@octopus-community/react-native v1.16.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusLocalizedText

# Variable: OctopusLocalizedText

> **OctopusLocalizedText**: `object`

Builders for OctopusLocalizedText.

## Type Declaration

### autoTranslated()

> **autoTranslated**(`text`): [`OctopusAutoTranslatedText`](../interfaces/OctopusAutoTranslatedText.md)

One text, translated automatically by Octopus for every reader.

#### Parameters

##### text

`string`

The text, in any language.

#### Returns

[`OctopusAutoTranslatedText`](../interfaces/OctopusAutoTranslatedText.md)

An `autoTranslated` text.

### perLanguage()

> **perLanguage**(`texts`, `defaultLanguage`): [`OctopusPerLanguageText`](../interfaces/OctopusPerLanguageText.md)

One text per language. Not validated here: the native SDK validates it when the call that
carries it reaches it — see the codes on OctopusLocalizedText.

#### Parameters

##### texts

`Readonly`\<`Record`\<`string`, `string`\>\>

The text of each language, keyed by BCP 47 language tag.

##### defaultLanguage

`string`

The language of the text to show and translate when none matches
the reader; one of the keys of `texts`.

#### Returns

[`OctopusPerLanguageText`](../interfaces/OctopusPerLanguageText.md)

A `perLanguage` text holding a copy of `texts`.

## Example

```typescript
const label = OctopusLocalizedText.perLanguage(
  { 'en': 'Read the article', 'fr': "Lire l'article", 'pt-BR': 'Ler o artigo' },
  'en'
);
await fetchOrCreateClientObjectRelatedPost({
  objectId: article.id,
  text: article.summary,
  viewObjectButton: label,
});
```
