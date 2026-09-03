[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / OverrideCommunityAccessError

# Interface: OverrideCommunityAccessError

The error rejected by [overrideCommunityAccess](../functions/overrideCommunityAccess.md).

The `code` type keeps room (`| (string & {})`) for a future native code that predates its
addition to [OverrideCommunityAccessErrorCode](../type-aliases/OverrideCommunityAccessErrorCode.md) on the consuming app's SDK version.

## Extends

- `Error`

## Properties

### cause?

> `optional` **cause**: `unknown`

#### Inherited from

`Error.cause`

---

### code

> `readonly` **code**: `string` & `object` \| `"OVERRIDE_ERROR"`

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
