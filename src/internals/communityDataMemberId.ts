import type { CommunityDataMemberId } from '../types/octopusCommunityData';

/** The member id, normalized for the native bridge: an absent id is `null`, never `''`. */
export interface NormalizedMemberId {
  profileId: string | null;
  clientUserId: string | null;
}

/**
 * Enforces the "exactly one of profileId / clientUserId" contract shared by every community-data
 * entry point, synchronously — before any native call is made — so a caller supplying both or
 * neither gets an immediate, in-process error rather than a native round trip.
 *
 * Returns the normalized ids so callers forward the exact values this check validated: an empty
 * string is normalized to `null` here, before the exactly-one comparison, so a caller cannot
 * validate against one notion of "absent" (falsy) while forwarding another (nullish) — which
 * previously let `{ profileId: '', clientUserId: 'x' }` pass this guard and still cross the
 * bridge with a non-null empty `profileId`.
 */
export function requireExactlyOneMemberId(
  memberId: CommunityDataMemberId,
  callerName: string
): NormalizedMemberId {
  const profileId = memberId.profileId || null;
  const clientUserId = memberId.clientUserId || null;
  const hasProfileId = profileId !== null;
  const hasClientUserId = clientUserId !== null;
  if (hasProfileId === hasClientUserId) {
    throw new Error(
      `${callerName}: exactly one of "profileId" or "clientUserId" must be provided (got ${
        hasProfileId ? 'both' : 'neither'
      }).`
    );
  }
  return { profileId, clientUserId };
}
