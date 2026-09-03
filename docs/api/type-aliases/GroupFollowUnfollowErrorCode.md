[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / GroupFollowUnfollowErrorCode

# Type Alias: GroupFollowUnfollowErrorCode

> **GroupFollowUnfollowErrorCode** = `"MISSING_GROUP"` \| `"UNFOLLOWABLE_GROUP"` \| `"GROUP_ALREADY_FOLLOWED"` \| `"GROUP_ALREADY_UNFOLLOWED"` \| `"LAST_FOLLOWED_GROUP"` \| `"NO_NETWORK"` \| `"NOT_CONNECTED"` \| `"NOT_INITIALIZED"` \| `"SERVER_ERROR"` \| `"GROUP_FOLLOW_UNFOLLOW_ERROR"`

The reason [followGroup](../functions/followGroup.md) or [unfollowGroup](../functions/unfollowGroup.md) was rejected.

| Code                          | Meaning                                                                                                                                                                                          | Emitted on   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| `MISSING_GROUP`               | The group id does not match any known group.                                                                                                                                                     | Android, iOS |
| `UNFOLLOWABLE_GROUP`          | The group cannot be followed/unfollowed by the user (e.g. an essential group forced by community admins).                                                                                        | Android, iOS |
| `GROUP_ALREADY_FOLLOWED`      | `followGroup` was called on a group already followed.                                                                                                                                            | Android, iOS |
| `GROUP_ALREADY_UNFOLLOWED`    | `unfollowGroup` was called on a group already unfollowed.                                                                                                                                        | Android, iOS |
| `LAST_FOLLOWED_GROUP`         | `unfollowGroup` was called on the user's last followed group. Android-only: iOS has no equivalent guard and silently succeeds in that case (see [unfollowGroup](../functions/unfollowGroup.md)). | Android      |
| `NO_NETWORK`                  | The device has no network connection.                                                                                                                                                            | Android, iOS |
| `NOT_CONNECTED`               | No user is currently connected.                                                                                                                                                                  | Android, iOS |
| `NOT_INITIALIZED`             | The SDK's `initialize()` has not been called yet. Distinct from `NOT_CONNECTED`, which means the SDK is running but no user is connected.                                                        | Android, iOS |
| `SERVER_ERROR`                | The server returned an unexpected error.                                                                                                                                                         | Android, iOS |
| `GROUP_FOLLOW_UNFOLLOW_ERROR` | Fallback for any other/unclassified failure.                                                                                                                                                     | Android, iOS |

## See

- [GroupFollowUnfollowError](../interfaces/GroupFollowUnfollowError.md) – the shape of the rejected error.
- [isGroupFollowUnfollowError](../functions/isGroupFollowUnfollowError.md) – narrow an unknown caught value.
