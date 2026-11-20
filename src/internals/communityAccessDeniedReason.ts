import type { CommunityAccessDeniedReason } from '../types/communityAccessDeniedReason';

const BY_NATIVE_NAME: Record<string, CommunityAccessDeniedReason> = {
  NOT_IN_COHORT: 'notInCohort',
  COMMUNITY_TEMPORARILY_DISABLED: 'communityTemporarilyDisabled',
  COMMUNITY_CLOSED: 'communityClosed',
  MEMBER_EXCLUDED: 'memberExcluded',
  ACCOUNT_BANNED: 'accountBanned',
  ACCOUNT_DELETED: 'accountDeleted',
  UNKNOWN: 'unknown',
};

/**
 * Decodes the `reason` of a `communityAccessDeniedReasonChanged` payload.
 *
 * Both bridges send the native enum name (`ACCOUNT_BANNED`, …), or `null` when the access is
 * granted or not known yet. Any other value — a name a newer native SDK added — is `'unknown'`.
 */
export function parseCommunityAccessDeniedReason(
  value: unknown
): CommunityAccessDeniedReason | null {
  if (value === null || value === undefined) return null;
  if (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(BY_NATIVE_NAME, value)
  ) {
    return BY_NATIVE_NAME[value] as CommunityAccessDeniedReason;
  }
  return 'unknown';
}
