[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / isConnectUserError

# Function: isConnectUserError()

> **isConnectUserError**(`error`): `error is ConnectUserError`

Narrows a value caught from [connectUser](connectUser.md) to a [ConnectUserError](../interfaces/ConnectUserError.md).

Returns `true` for any rejection carrying a string `code`, including a code not listed in
[ConnectUserErrorCode](../type-aliases/ConnectUserErrorCode.md) — an unrecognised failure is still a failure and must not be
mistaken for a successful connection.

A string `message` is required as well, so the two properties you actually read are both
checked. The check is structural rather than an `instanceof Error`: a rejection that crossed a
serialisation boundary (a state store, a worker) is no longer an `Error` instance but still
carries both fields. The trade-off is that the rest of `Error` is taken on trust — a value that
lost its `name` or `stack` on the way still narrows, so do not depend on those two.

## Parameters

### error

`unknown`

The value caught from a rejected `connectUser` call.

## Returns

`error is ConnectUserError`

Whether `error` carries a connection-failure code.

## Example

```typescript
try {
  await connectUser({ userId });
} catch (error) {
  if (isConnectUserError(error) && error.code === 'USER_BANNED') {
    showBannedDialog(error.message); // backend-provided, displayable
  } else {
    showGenericLoginError();
  }
}
```
