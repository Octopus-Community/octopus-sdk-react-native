[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / followGroup

# Function: followGroup()

> **followGroup**(`groupId`): `Promise`\<`void`\>

Makes the current user follow a group.

iOS has no native per-group follow method: the bridge implements this call by delegating to
the batch `syncFollowGroups` API with a single action and inspecting its result status. This
mirrors the approach already shipped by the Flutter SDK's own iOS plugin.

## Parameters

### groupId

`string`

The id of the group to follow.

## Returns

`Promise`\<`void`\>

A promise that resolves when the group is followed.

## Throws

A [GroupFollowUnfollowError](../interfaces/GroupFollowUnfollowError.md) — see [isGroupFollowUnfollowError](isGroupFollowUnfollowError.md) to narrow it.

## Example

```typescript
try {
  await followGroup(groupId);
} catch (error) {
  if (isGroupFollowUnfollowError(error)) {
    console.warn(`followGroup failed — ${error.code}: ${error.message}`);
  }
}
```
