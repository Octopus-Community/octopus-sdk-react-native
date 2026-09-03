[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / unfollowGroup

# Function: unfollowGroup()

> **unfollowGroup**(`groupId`): `Promise`\<`void`\>

Makes the current user unfollow a group.

iOS has no native per-group unfollow method: the bridge implements this call by delegating to
the batch `syncFollowGroups` API with a single action and inspecting its result status. This
mirrors the approach already shipped by the Flutter SDK's own iOS plugin.

Unfollowing the user's last followed group is refused on Android with
`LAST_FOLLOWED_GROUP` (see [GroupFollowUnfollowError](../interfaces/GroupFollowUnfollowError.md)). iOS has no equivalent guard —
that case succeeds silently there.

## Parameters

### groupId

`string`

The id of the group to unfollow.

## Returns

`Promise`\<`void`\>

A promise that resolves when the group is unfollowed.

## Throws

A [GroupFollowUnfollowError](../interfaces/GroupFollowUnfollowError.md) — see [isGroupFollowUnfollowError](isGroupFollowUnfollowError.md) to narrow it.

## Example

```typescript
try {
  await unfollowGroup(groupId);
} catch (error) {
  if (isGroupFollowUnfollowError(error)) {
    console.warn(`unfollowGroup failed — ${error.code}: ${error.message}`);
  }
}
```
