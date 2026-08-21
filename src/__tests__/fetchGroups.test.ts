import { fetchGroups } from '../fetchGroups';
import type { OctopusGroup } from '../types/octopusGroup';

const mockFetchGroups = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    fetchGroups: (...args: unknown[]) => mockFetchGroups(...args),
  },
}));

beforeEach(() => {
  mockFetchGroups.mockReset();
});

describe('fetchGroups', () => {
  it('returns the groups resolved by the native module unchanged', async () => {
    const groups: OctopusGroup[] = [
      {
        id: 'g1',
        name: 'General',
        isFollowed: true,
        canChangeFollowStatus: true,
        canAccess: true,
        canCreateChildren: true,
      },
      {
        id: 'g2',
        name: 'Premium',
        isFollowed: false,
        canChangeFollowStatus: true,
        canAccess: false,
        canCreateChildren: false,
      },
    ];
    mockFetchGroups.mockResolvedValue(groups);

    const result = await fetchGroups();

    expect(mockFetchGroups).toHaveBeenCalledTimes(1);
    expect(result).toEqual(groups);
  });

  it('returns an empty list when no group is visible', async () => {
    mockFetchGroups.mockResolvedValue([]);
    await expect(fetchGroups()).resolves.toEqual([]);
  });

  it('propagates a native rejection instead of resolving', async () => {
    mockFetchGroups.mockRejectedValue(
      Object.assign(new Error('No network'), { code: 'NO_NETWORK' })
    );
    await expect(fetchGroups()).rejects.toMatchObject({ code: 'NO_NETWORK' });
  });

  it('propagates the not-initialized guard', async () => {
    // Dedicated NOT_INITIALIZED, not NOT_CONNECTED — the two mean different things (no
    // `initialize()` call vs. no connected user); see the TSDoc `@throws` list.
    mockFetchGroups.mockRejectedValue(
      Object.assign(
        new Error('SDK not initialized. Call initialize() first.'),
        {
          code: 'NOT_INITIALIZED',
        }
      )
    );
    await expect(fetchGroups()).rejects.toMatchObject({
      code: 'NOT_INITIALIZED',
    });
  });
});
