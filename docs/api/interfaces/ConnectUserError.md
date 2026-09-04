[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / ConnectUserError

# Interface: ConnectUserError

The error [connectUser](../functions/connectUser.md) rejects with when the native SDK refuses the connection.

`message` is a diagnostic string for you, the integrator — with one exception: when `code` is
`USER_BANNED` it is the backend's own reason, meant to be shown to the user as-is.

## Extends

- `Error`

## Properties

### cause?

> `optional` **cause**: `unknown`

#### Inherited from

`Error.cause`

---

### code

> `readonly` **code**: [`ConnectUserErrorCode`](../type-aliases/ConnectUserErrorCode.md) \| `string` & `object`

Why the connection was refused. See [ConnectUserErrorCode](../type-aliases/ConnectUserErrorCode.md).

Typed as an open string on purpose: a native SDK upgrade may introduce a code this version
does not list yet, and such an error must still reach your handler. Compare against
[ConnectUserErrorCode](../type-aliases/ConnectUserErrorCode.md) values and keep a default branch.

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
