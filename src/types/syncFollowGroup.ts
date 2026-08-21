/**
 * Outcome of an individual follow/unfollow action in a syncFollowGroups batch.
 * Stable wire values match the native SDK (`applied`, `skipped`,
 * `group_not_found`, `not_followable`, `not_unfollowable`, `already_followed`,
 * `already_unfollowed`, `unknown_error`).
 */
export enum SyncFollowGroupStatus {
  Applied = 'applied',
  Skipped = 'skipped',
  GroupNotFound = 'group_not_found',
  NotFollowable = 'not_followable',
  NotUnfollowable = 'not_unfollowable',
  AlreadyFollowed = 'already_followed',
  AlreadyUnfollowed = 'already_unfollowed',
  UnknownError = 'unknown_error',
}

/**
 * A single follow/unfollow action submitted to a `syncFollowGroups` batch.
 */
export type SyncFollowGroupAction = {
  /** Identifier of the group to follow or unfollow. */
  groupId: string;
  /** `true` = follow, `false` = unfollow. */
  followed: boolean;
  /** Backend rejects actions older than its stored timestamp. */
  actionDate: Date;
};

/**
 * Outcome reported by `syncFollowGroups` for one submitted action. Match it
 * back to its action by `groupId` — result order is not guaranteed.
 */
export type SyncFollowGroupResult = {
  /** Identifier of the group the action targeted. */
  groupId: string;
  /**
   * Whether the action was applied, or the reason it was not. `unknown_error`
   * also stands in for any status this SDK version does not recognize, in
   * which case the action may still have been applied.
   */
  status: SyncFollowGroupStatus;
};

const KNOWN_STATUSES = new Set<string>(Object.values(SyncFollowGroupStatus));

export function statusFromWire(wire: string): SyncFollowGroupStatus {
  return KNOWN_STATUSES.has(wire)
    ? (wire as SyncFollowGroupStatus)
    : SyncFollowGroupStatus.UnknownError;
}
