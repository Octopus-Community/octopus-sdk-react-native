[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / SetReactionError

# Interface: SetReactionError

The error [setReaction](../functions/setReaction.md) rejects with when the native SDK refuses the call.

## Extends

- `Error`

## Properties

### cause?

> `optional` **cause**: `unknown`

#### Inherited from

`Error.cause`

---

### code

> `readonly` **code**: `string` & `object` \| [`SetReactionErrorCode`](../type-aliases/SetReactionErrorCode.md)

Why the call was refused. See [SetReactionErrorCode](../type-aliases/SetReactionErrorCode.md).

Typed as an open string on purpose: a native SDK upgrade may introduce a code this version
does not list yet. Compare against [SetReactionErrorCode](../type-aliases/SetReactionErrorCode.md) values and keep a default
branch.

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
