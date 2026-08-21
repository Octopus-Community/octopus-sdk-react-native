/**
 * The reason {@link followGroup} or {@link unfollowGroup} was rejected.
 *
 * | Code | Meaning | Emitted on |
 * |---|---|---|
 * | `MISSING_GROUP` | The group id does not match any known group. | Android, iOS |
 * | `UNFOLLOWABLE_GROUP` | The group cannot be followed/unfollowed by the user (e.g. an essential group forced by community admins). | Android, iOS |
 * | `GROUP_ALREADY_FOLLOWED` | `followGroup` was called on a group already followed. | Android, iOS |
 * | `GROUP_ALREADY_UNFOLLOWED` | `unfollowGroup` was called on a group already unfollowed. | Android, iOS |
 * | `LAST_FOLLOWED_GROUP` | `unfollowGroup` was called on the user's last followed group. Android-only: iOS has no equivalent guard and silently succeeds in that case (see {@link unfollowGroup}). | Android |
 * | `NO_NETWORK` | The device has no network connection. | Android, iOS |
 * | `NOT_CONNECTED` | No user is currently connected. | Android, iOS |
 * | `NOT_INITIALIZED` | The SDK's `initialize()` has not been called yet. Distinct from `NOT_CONNECTED`, which means the SDK is running but no user is connected. | Android, iOS |
 * | `SERVER_ERROR` | The server returned an unexpected error. | Android, iOS |
 * | `GROUP_FOLLOW_UNFOLLOW_ERROR` | Fallback for any other/unclassified failure. | Android, iOS |
 *
 * @see {@link GroupFollowUnfollowError} – the shape of the rejected error.
 * @see {@link isGroupFollowUnfollowError} – narrow an unknown caught value.
 */
export type GroupFollowUnfollowErrorCode =
  | 'MISSING_GROUP'
  | 'UNFOLLOWABLE_GROUP'
  | 'GROUP_ALREADY_FOLLOWED'
  | 'GROUP_ALREADY_UNFOLLOWED'
  | 'LAST_FOLLOWED_GROUP'
  | 'NO_NETWORK'
  | 'NOT_CONNECTED'
  | 'NOT_INITIALIZED'
  | 'SERVER_ERROR'
  | 'GROUP_FOLLOW_UNFOLLOW_ERROR';

/**
 * The error rejected by {@link followGroup} / {@link unfollowGroup}.
 *
 * The `code` type keeps room (`| (string & {})`) for a future native code that predates its
 * addition to {@link GroupFollowUnfollowErrorCode} on the consuming app's SDK version.
 */
export interface GroupFollowUnfollowError extends Error {
  readonly code: GroupFollowUnfollowErrorCode | (string & {});
}

/**
 * Narrows an unknown caught value to a {@link GroupFollowUnfollowError}.
 *
 * @example
 * ```typescript
 * try {
 *   await followGroup(groupId);
 * } catch (error) {
 *   if (isGroupFollowUnfollowError(error)) {
 *     console.warn(error.code);
 *   }
 * }
 * ```
 */
export function isGroupFollowUnfollowError(
  error: unknown
): error is GroupFollowUnfollowError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  );
}
