import { followGroup } from '../followGroup';
import { isGroupFollowUnfollowError } from '../types/groupFollowUnfollowError';

const mockFollowGroup = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    followGroup: (...args: unknown[]) => mockFollowGroup(...args),
  },
}));

/** A rejection as React Native shapes it: an `Error` carrying the native code. */
const nativeRejection = (code: string, message: string): Error =>
  Object.assign(new Error(message), { code });

beforeEach(() => {
  mockFollowGroup.mockReset();
  mockFollowGroup.mockResolvedValue(undefined);
});

describe('followGroup', () => {
  it('forwards the group id to the native module', async () => {
    await followGroup('group-1');
    expect(mockFollowGroup).toHaveBeenCalledTimes(1);
    expect(mockFollowGroup).toHaveBeenCalledWith('group-1');
  });

  it('resolves when the native module resolves', async () => {
    await expect(followGroup('group-1')).resolves.toBeUndefined();
  });

  it('propagates a refusal instead of resolving', async () => {
    mockFollowGroup.mockRejectedValue(
      nativeRejection('UNFOLLOWABLE_GROUP', 'Group cannot be followed.')
    );
    await expect(followGroup('group-1')).rejects.toMatchObject({
      code: 'UNFOLLOWABLE_GROUP',
    });
  });

  it('propagates the not-initialized guard', async () => {
    mockFollowGroup.mockRejectedValue(
      nativeRejection(
        'NOT_INITIALIZED',
        'SDK not initialized. Call initialize() first.'
      )
    );
    await expect(followGroup('group-1')).rejects.toMatchObject({
      code: 'NOT_INITIALIZED',
    });
  });
});

describe('isGroupFollowUnfollowError', () => {
  it('accepts a rejection carrying a known code', () => {
    expect(
      isGroupFollowUnfollowError(nativeRejection('MISSING_GROUP', 'not found'))
    ).toBe(true);
  });

  it('accepts a code it does not know yet', () => {
    expect(
      isGroupFollowUnfollowError(nativeRejection('SOME_FUTURE_CODE', 'unknown'))
    ).toBe(true);
  });

  it('rejects an error with no code', () => {
    expect(isGroupFollowUnfollowError(new Error('boom'))).toBe(false);
  });

  it('rejects an error whose code is not a string', () => {
    expect(
      isGroupFollowUnfollowError(Object.assign(new Error('boom'), { code: 42 }))
    ).toBe(false);
  });

  it('rejects a code-carrying object with no message', () => {
    expect(isGroupFollowUnfollowError({ code: 'MISSING_GROUP' })).toBe(false);
  });

  it('accepts a rejection that lost its Error prototype', () => {
    expect(
      isGroupFollowUnfollowError({ code: 'MISSING_GROUP', message: 'x' })
    ).toBe(true);
  });

  it('rejects values that are not objects', () => {
    expect(isGroupFollowUnfollowError(null)).toBe(false);
    expect(isGroupFollowUnfollowError(undefined)).toBe(false);
    expect(isGroupFollowUnfollowError('MISSING_GROUP')).toBe(false);
  });
});
