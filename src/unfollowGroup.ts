import { OctopusReactNativeSdk } from './internals/nativeModule';

/**
 * Makes the current user unfollow a group.
 *
 * iOS has no native per-group unfollow method: the bridge implements this call by delegating to
 * the batch `syncFollowGroups` API with a single action and inspecting its result status. This
 * mirrors the approach already shipped by the Flutter SDK's own iOS plugin.
 *
 * Unfollowing the user's last followed group is refused on Android with
 * `LAST_FOLLOWED_GROUP` (see {@link GroupFollowUnfollowError}). iOS has no equivalent guard —
 * that case succeeds silently there.
 *
 * @param groupId - The id of the group to unfollow.
 * @returns A promise that resolves when the group is unfollowed.
 * @throws A {@link GroupFollowUnfollowError} — see {@link isGroupFollowUnfollowError} to narrow it.
 *
 * @example
 * ```typescript
 * try {
 *   await unfollowGroup(groupId);
 * } catch (error) {
 *   if (isGroupFollowUnfollowError(error)) {
 *     console.warn(`unfollowGroup failed — ${error.code}: ${error.message}`);
 *   }
 * }
 * ```
 */
export function unfollowGroup(groupId: string): Promise<void> {
  return OctopusReactNativeSdk.unfollowGroup(groupId);
}
