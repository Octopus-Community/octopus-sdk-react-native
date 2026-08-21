[**@octopus-community/react-native v1.13.0**](../README.md)

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
