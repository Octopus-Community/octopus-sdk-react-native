[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / isClientPostError

# Function: isClientPostError()

> **isClientPostError**(`error`): `error is ClientPostError`

Narrows a value caught from [fetchOrCreateClientObjectRelatedPost](fetchOrCreateClientObjectRelatedPost.md) to a
[ClientPostError](../interfaces/ClientPostError.md).

## Parameters

### error

`unknown`

The value caught from a rejected `fetchOrCreateClientObjectRelatedPost` call.

## Returns

`error is ClientPostError`

Whether `error` carries a client-post failure code.

## Example

```typescript
try {
  const post = await fetchOrCreateClientObjectRelatedPost({ objectId, text });
} catch (error) {
  if (isClientPostError(error) && error.code === 'NO_NETWORK') {
    // retry later
  }
}
```
