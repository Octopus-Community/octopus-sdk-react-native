import { OctopusReactNativeSdk } from './internals/nativeModule';
import { requireExactlyOneMemberId } from './internals/communityDataMemberId';
import type {
  CommunityDataMemberId,
  OctopusCommunityData,
} from './types/octopusCommunityData';

/**
 * Fetches a one-shot refresh of a member's public Octopus stats (message count, gamification).
 *
 * @param memberId - Exactly one of `profileId` or `clientUserId` must be set.
 * @returns The member's community data, or `null` when the member is unknown.
 * @throws A plain `Error` synchronously when `memberId` carries both or neither id.
 *
 * @see {@link startObservingCommunityData} – the reactive counterpart.
 *
 * @example
 * ```typescript
 * const data = await fetchCommunityData({ clientUserId: myOwnUserId });
 * ```
 */
export function fetchCommunityData(
  memberId: CommunityDataMemberId
): Promise<OctopusCommunityData | null> {
  const normalized = requireExactlyOneMemberId(memberId, 'fetchCommunityData');
  return OctopusReactNativeSdk.fetchCommunityData(
    normalized.profileId,
    normalized.clientUserId
  );
}
