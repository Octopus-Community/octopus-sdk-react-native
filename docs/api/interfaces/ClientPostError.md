[**@octopus-community/react-native v1.16.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / ClientPostError

# Interface: ClientPostError

The error [fetchOrCreateClientObjectRelatedPost](../functions/fetchOrCreateClientObjectRelatedPost.md) rejects with when the native SDK
refuses the call.

## Extends

- `Error`

## Properties

### cause?

> `optional` **cause**: `unknown`

#### Inherited from

`Error.cause`

---

### code

> `readonly` **code**: `string` & `object` \| [`ClientPostErrorCode`](../type-aliases/ClientPostErrorCode.md)

Why the call was refused. See [ClientPostErrorCode](../type-aliases/ClientPostErrorCode.md).

Typed as an open string on purpose: a native SDK upgrade may introduce a code this
version does not list yet. Compare against [ClientPostErrorCode](../type-aliases/ClientPostErrorCode.md) values and keep a
default branch.

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
