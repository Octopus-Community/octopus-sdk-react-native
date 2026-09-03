[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / RefreshEntitlementsError

# Interface: RefreshEntitlementsError

The error rejected by [refreshEntitlements](../functions/refreshEntitlements.md).

The `code` type keeps room (`| (string & {})`) for a future native code that predates its
addition to [RefreshEntitlementsErrorCode](../type-aliases/RefreshEntitlementsErrorCode.md) on the consuming app's SDK version.

## Extends

- `Error`

## Properties

### cause?

> `optional` **cause**: `unknown`

#### Inherited from

`Error.cause`

---

### code

> `readonly` **code**: `string` & `object` \| [`RefreshEntitlementsErrorCode`](../type-aliases/RefreshEntitlementsErrorCode.md)

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
