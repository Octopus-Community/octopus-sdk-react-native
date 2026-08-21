import { syncFollowGroups } from '../syncFollowGroups';
import { SyncFollowGroupStatus } from '../types/syncFollowGroup';

const mockSync = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    syncFollowGroups: (...args: unknown[]) => mockSync(...args),
  },
}));

beforeEach(() => {
  mockSync.mockReset();
});

describe('syncFollowGroups', () => {
  it('short-circuits on empty list without crossing the bridge', async () => {
    const result = await syncFollowGroups([]);
    expect(result).toEqual([]);
    expect(mockSync).not.toHaveBeenCalled();
  });

  it('serializes Date to actionDateMs milliseconds', async () => {
    mockSync.mockResolvedValue([]);
    const d = new Date('2026-05-21T00:00:00Z');
    await syncFollowGroups([{ groupId: 'g1', followed: true, actionDate: d }]);
    expect(mockSync).toHaveBeenCalledWith([
      { groupId: 'g1', followed: true, actionDateMs: d.getTime() },
    ]);
  });

  it('deserializes results, mapping wire strings to enum values', async () => {
    mockSync.mockResolvedValue([
      { groupId: 'g1', status: 'applied' },
      { groupId: 'g2', status: 'group_not_found' },
      { groupId: 'g3', status: 'already_unfollowed' },
    ]);
    const out = await syncFollowGroups([
      { groupId: 'g1', followed: true, actionDate: new Date() },
    ]);
    expect(out).toEqual([
      { groupId: 'g1', status: SyncFollowGroupStatus.Applied },
      { groupId: 'g2', status: SyncFollowGroupStatus.GroupNotFound },
      { groupId: 'g3', status: SyncFollowGroupStatus.AlreadyUnfollowed },
    ]);
  });

  it('maps unknown status strings to UnknownError', async () => {
    mockSync.mockResolvedValue([
      { groupId: 'g1', status: 'made_up_future_status' },
    ]);
    const out = await syncFollowGroups([
      { groupId: 'g1', followed: true, actionDate: new Date() },
    ]);
    expect(out).toEqual([
      { groupId: 'g1', status: SyncFollowGroupStatus.UnknownError },
    ]);
  });

  it('propagates native rejections', async () => {
    mockSync.mockRejectedValue(new Error('no_network'));
    await expect(
      syncFollowGroups([
        { groupId: 'g1', followed: true, actionDate: new Date() },
      ])
    ).rejects.toThrow('no_network');
  });
});
