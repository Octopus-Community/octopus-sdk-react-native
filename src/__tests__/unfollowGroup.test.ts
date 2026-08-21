import { unfollowGroup } from '../unfollowGroup';

const mockUnfollowGroup = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    unfollowGroup: (...args: unknown[]) => mockUnfollowGroup(...args),
  },
}));

const nativeRejection = (code: string, message: string): Error =>
  Object.assign(new Error(message), { code });

beforeEach(() => {
  mockUnfollowGroup.mockReset();
  mockUnfollowGroup.mockResolvedValue(undefined);
});

describe('unfollowGroup', () => {
  it('forwards the group id to the native module', async () => {
    await unfollowGroup('group-1');
    expect(mockUnfollowGroup).toHaveBeenCalledTimes(1);
    expect(mockUnfollowGroup).toHaveBeenCalledWith('group-1');
  });

  it('resolves when the native module resolves', async () => {
    await expect(unfollowGroup('group-1')).resolves.toBeUndefined();
  });

  it('propagates the Android-only last-followed-group refusal', async () => {
    // This is the one code with no iOS equivalent — see the TSDoc on `unfollowGroup`. The JS
    // wrapper itself does not special-case it; it is a plain rejection like any other.
    mockUnfollowGroup.mockRejectedValue(
      nativeRejection('LAST_FOLLOWED_GROUP', 'Cannot unfollow the last group.')
    );
    await expect(unfollowGroup('group-1')).rejects.toMatchObject({
      code: 'LAST_FOLLOWED_GROUP',
    });
  });

  it('propagates a generic refusal instead of resolving', async () => {
    mockUnfollowGroup.mockRejectedValue(
      nativeRejection('GROUP_ALREADY_UNFOLLOWED', 'Already unfollowed.')
    );
    await expect(unfollowGroup('group-1')).rejects.toMatchObject({
      code: 'GROUP_ALREADY_UNFOLLOWED',
    });
  });

  it('propagates the not-initialized guard', async () => {
    mockUnfollowGroup.mockRejectedValue(
      nativeRejection(
        'NOT_INITIALIZED',
        'SDK not initialized. Call initialize() first.'
      )
    );
    await expect(unfollowGroup('group-1')).rejects.toMatchObject({
      code: 'NOT_INITIALIZED',
    });
  });
});
