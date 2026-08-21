import { refreshEntitlements } from '../refreshEntitlements';
import { isRefreshEntitlementsError } from '../types/refreshEntitlementsError';

const mockRefreshEntitlements = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    refreshEntitlements: (...args: unknown[]) =>
      mockRefreshEntitlements(...args),
  },
}));

const nativeRejection = (code: string, message: string): Error =>
  Object.assign(new Error(message), { code });

beforeEach(() => {
  mockRefreshEntitlements.mockReset();
  mockRefreshEntitlements.mockResolvedValue(undefined);
});

describe('refreshEntitlements', () => {
  it('calls the native module with no argument', async () => {
    await refreshEntitlements();
    expect(mockRefreshEntitlements).toHaveBeenCalledTimes(1);
    expect(mockRefreshEntitlements).toHaveBeenCalledWith();
  });

  it('resolves when the native module resolves', async () => {
    await expect(refreshEntitlements()).resolves.toBeUndefined();
  });

  it('propagates a refusal instead of resolving', async () => {
    mockRefreshEntitlements.mockRejectedValue(
      nativeRejection('USER_BANNED', 'You have been banned.')
    );
    await expect(refreshEntitlements()).rejects.toMatchObject({
      code: 'USER_BANNED',
    });
  });

  it('propagates the SSO-only guard', async () => {
    // Entitlements refresh only makes sense in SSO connection mode — see the TSDoc table on
    // `RefreshEntitlementsErrorCode`.
    mockRefreshEntitlements.mockRejectedValue(
      nativeRejection(
        'NO_CLIENT_TOKEN_PROVIDER',
        'refreshEntitlements requires .sso connection mode.'
      )
    );
    await expect(refreshEntitlements()).rejects.toMatchObject({
      code: 'NO_CLIENT_TOKEN_PROVIDER',
    });
  });

  it('propagates the not-initialized guard', async () => {
    // Dedicated NOT_INITIALIZED, not USER_NOT_CONNECTED — the two mean different things (no
    // `initialize()` call vs. no connected user); see the TSDoc table on
    // `RefreshEntitlementsErrorCode`.
    mockRefreshEntitlements.mockRejectedValue(
      nativeRejection(
        'NOT_INITIALIZED',
        'SDK not initialized. Call initialize() first.'
      )
    );
    await expect(refreshEntitlements()).rejects.toMatchObject({
      code: 'NOT_INITIALIZED',
    });
  });
});

describe('isRefreshEntitlementsError', () => {
  it('accepts a rejection carrying a known code', () => {
    expect(
      isRefreshEntitlementsError(nativeRejection('NO_NETWORK', 'offline'))
    ).toBe(true);
  });

  it('accepts a code it does not know yet', () => {
    expect(
      isRefreshEntitlementsError(nativeRejection('SOME_FUTURE_CODE', 'unknown'))
    ).toBe(true);
  });

  it('rejects an error with no code', () => {
    expect(isRefreshEntitlementsError(new Error('boom'))).toBe(false);
  });

  it('rejects an error whose code is not a string', () => {
    expect(
      isRefreshEntitlementsError(Object.assign(new Error('boom'), { code: 42 }))
    ).toBe(false);
  });

  it('rejects a code-carrying object with no message', () => {
    expect(isRefreshEntitlementsError({ code: 'NO_NETWORK' })).toBe(false);
  });

  it('accepts a rejection that lost its Error prototype', () => {
    expect(
      isRefreshEntitlementsError({ code: 'NO_NETWORK', message: 'x' })
    ).toBe(true);
  });

  it('rejects values that are not objects', () => {
    expect(isRefreshEntitlementsError(null)).toBe(false);
    expect(isRefreshEntitlementsError(undefined)).toBe(false);
    expect(isRefreshEntitlementsError('NO_NETWORK')).toBe(false);
  });
});
