import type {
  OctopusGroup,
  SyncFollowGroupAction,
} from '@octopus-community/react-native';

/** Only server-confirmed, followable groups enter the batch. */
export function groupSyncActions(
  groups: OctopusGroup[],
  mode: 'invertAll' | 'followAll' | 'unfollowAll',
  now = new Date()
): SyncFollowGroupAction[] {
  return groups
    .filter((group) => group.canChangeFollowStatus)
    .map((group) => ({
      groupId: group.id,
      followed: mode === 'invertAll' ? !group.isFollowed : mode === 'followAll',
      actionDate: now,
    }));
}
