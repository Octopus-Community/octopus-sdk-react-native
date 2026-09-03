[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / setReaction

# Function: setReaction()

> **setReaction**(`postId`, `reaction`): `Promise`\<`void`\>

Applies or removes the current user's reaction on a post.

Passing `null` removes the current user's active reaction. Calling with `null` when no
reaction is currently set is a silent no-op. Setting the same reaction twice is idempotent.

## Parameters

### postId

`string`

The id of the post to react on.

### reaction

The reaction to set, or `null` to remove the current reaction.

[`OctopusReactionKind`](../type-aliases/OctopusReactionKind.md) | `null`

## Returns

`Promise`\<`void`\>

A promise that resolves when the reaction has been applied.

## Throws

A [SetReactionError](../interfaces/SetReactionError.md) — see [isSetReactionError](isSetReactionError.md) to narrow it.

## Example

```typescript
try {
  await setReaction(postId, 'heart');
} catch (error) {
  if (isSetReactionError(error)) {
    console.warn(`setReaction failed — ${error.code}: ${error.message}`);
  }
}
```
