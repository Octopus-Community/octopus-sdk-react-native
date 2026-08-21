import { OctopusReactNativeSdk } from './internals/nativeModule';
import {
  statusFromWire,
  type SyncFollowGroupAction,
  type SyncFollowGroupResult,
} from './types/syncFollowGroup';

/**
 * Batch follow/unfollow groups in a single round-trip. Each action carries
 * its own timestamp so the backend can reject stale actions. Match results
 * back to inputs by `groupId` — order is not guaranteed.
 *
 * Requires a connected user. Rejects with a native error code on RPC failure
 * (`not_connected`, `no_network`, `server`, `other`).
 *
 * An empty `actions` list short-circuits to `[]` without crossing the bridge.
 */
export async function syncFollowGroups(
  actions: SyncFollowGroupAction[]
): Promise<SyncFollowGroupResult[]> {
  if (actions.length === 0) return [];
  const wire = actions.map((a) => ({
    groupId: a.groupId,
    followed: a.followed,
    actionDateMs: a.actionDate.getTime(),
  }));
  const raw = (await OctopusReactNativeSdk.syncFollowGroups(wire)) as Array<{
    groupId: string;
    status: string;
  }>;
  return raw.map((r) => ({
    groupId: r.groupId,
    status: statusFromWire(r.status),
  }));
}
