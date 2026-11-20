[**@octopus-community/react-native v1.16.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / NavigateToOctopusCreatePostError

# Interface: NavigateToOctopusCreatePostError

The error [navigateToOctopusCreatePost](../functions/navigateToOctopusCreatePost.md) rejects with when the prefilled post is invalid.

## Extends

- `Error`

## Properties

### cause?

> `optional` **cause**: `unknown`

#### Inherited from

`Error.cause`

---

### code

> `readonly` **code**: `string` & `object` \| [`NavigateToOctopusCreatePostErrorCode`](../type-aliases/NavigateToOctopusCreatePostErrorCode.md)

---

### languageCode?

> `readonly` `optional` **languageCode**: `string`

The code of the language at fault (`'en'`, `'pt-BR'`), for `LOCALIZED_TEXT_BLANK_TEXT`,
`LOCALIZED_TEXT_DUPLICATE_LANGUAGE` and `LOCALIZED_TEXT_DEFAULT_LANGUAGE_MISSING`. It is the
code the native SDK built from your language tag, so its case may differ from what you
wrote. Absent for every other code.

---

### message

> **message**: `string`

#### Inherited from

`Error.message`

---

### name

> **name**: `string`

#### Inherited from

`Error.name`

---

### stack?

> `optional` **stack**: `string`

#### Inherited from

`Error.stack`
