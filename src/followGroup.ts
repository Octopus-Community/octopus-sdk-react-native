import { OctopusReactNativeSdk } from './internals/nativeModule';

/**
 * Makes the current user follow a group.
 *
 * iOS has no native per-group follow method: the bridge implements this call by delegating to
 * the batch `syncFollowGroups` API with a single action and inspecting its result status. This
 * mirrors the approach already shipped by the Flutter SDK's own iOS plugin.
 *
 * @param groupId - The id of the group to follow.
 * @returns A promise that resolves when the group is followed.
 * @throws A {@link GroupFollowUnfollowError} — see {@link isGroupFollowUnfollowError} to narrow it.
 *
 * @example
 * ```typescript
 * try {
 *   await followGroup(groupId);
 * } catch (error) {
 *   if (isGroupFollowUnfollowError(error)) {
 *     console.warn(`followGroup failed — ${error.code}: ${error.message}`);
 *   }
 * }
 * ```
 */
export function followGroup(groupId: string): Promise<void> {
  return OctopusReactNativeSdk.followGroup(groupId);
}
