[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / isSetReactionError

# Function: isSetReactionError()

> **isSetReactionError**(`error`): `error is SetReactionError`

Narrows a value caught from [setReaction](setReaction.md) to a [SetReactionError](../interfaces/SetReactionError.md).

## Parameters

### error

`unknown`

The value caught from a rejected `setReaction` call.

## Returns

`error is SetReactionError`

Whether `error` carries a set-reaction failure code.

## Example

```typescript
try {
  await setReaction(postId, 'heart');
} catch (error) {
  if (isSetReactionError(error) && error.code === 'POST_NOT_FOUND') {
    // the post was deleted or is no longer visible
  }
}
```
