import { OctopusReactNativeSdk } from './internals/nativeModule';
import { requireExactlyOneMemberId } from './internals/communityDataMemberId';
import type { CommunityDataMemberId } from './types/octopusCommunityData';

/**
 * Starts a reactive observation of a member's community data. Updates are delivered through
 * {@link addCommunityDataListener}; the current value (or `null` if the member is unknown) is
 * replayed as soon as it is known.
 *
 * Only one observation is active at a time on this wrapper: starting a new one replaces
 * whichever member was previously being observed. Call {@link stopObservingCommunityData} to
 * tear it down without starting another.
 *
 * @param memberId - Exactly one of `profileId` or `clientUserId` must be set.
 * @throws A plain `Error` synchronously when `memberId` carries both or neither id.
 *
 * @see {@link fetchCommunityData} – the one-shot counterpart.
 *
 * @example
 * ```typescript
 * const subscription = addCommunityDataListener((data) => {
 *   console.log('community data', data);
 * });
 * await startObservingCommunityData({ clientUserId: myOwnUserId });
 * // ...later
 * await stopObservingCommunityData();
 * subscription.remove();
 * ```
 */
export function startObservingCommunityData(
  memberId: CommunityDataMemberId
): Promise<void> {
  const normalized = requireExactlyOneMemberId(
    memberId,
    'startObservingCommunityData'
  );
  return OctopusReactNativeSdk.startObservingCommunityData(
    normalized.profileId,
    normalized.clientUserId
  );
}
