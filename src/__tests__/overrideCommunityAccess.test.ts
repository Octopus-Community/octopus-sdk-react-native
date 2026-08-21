import { overrideCommunityAccess } from '../overrideCommunityAccess';
import { isOverrideCommunityAccessError } from '../types/overrideCommunityAccessError';

const mockOverrideCommunityAccess = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    overrideCommunityAccess: (...args: unknown[]) =>
      mockOverrideCommunityAccess(...args),
  },
}));

beforeEach(() => {
  mockOverrideCommunityAccess.mockReset();
  mockOverrideCommunityAccess.mockResolvedValue(undefined);
});

describe('overrideCommunityAccess', () => {
  it('calls native module with true when hasAccess is true', async () => {
    await overrideCommunityAccess(true);
    expect(mockOverrideCommunityAccess).toHaveBeenCalledTimes(1);
    expect(mockOverrideCommunityAccess).toHaveBeenCalledWith(true);
  });

  it('calls native module with false when hasAccess is false', async () => {
    await overrideCommunityAccess(false);
    expect(mockOverrideCommunityAccess).toHaveBeenCalledTimes(1);
    expect(mockOverrideCommunityAccess).toHaveBeenCalledWith(false);
  });

  it('returns a promise that resolves when native module resolves', async () => {
    const result = overrideCommunityAccess(true);
    await expect(result).resolves.toBeUndefined();
  });

  it('returns a promise that rejects when native module rejects', async () => {
    const error = new Error('OVERRIDE_ERROR');
    mockOverrideCommunityAccess.mockRejectedValue(error);
    await expect(overrideCommunityAccess(true)).rejects.toThrow(
      'OVERRIDE_ERROR'
    );
  });
});

// Parity wave — groups & entitlements: `overrideCommunityAccess` keeps its existing untyped
// `Promise<void>` signature, but gets a typed-rejection guard alongside it — see
// `types/overrideCommunityAccessError.ts`.
describe('isOverrideCommunityAccessError', () => {
  const nativeRejection = (code: string, message: string): Error =>
    Object.assign(new Error(message), { code });

  it('accepts a rejection carrying the known code', () => {
    expect(
      isOverrideCommunityAccessError(
        nativeRejection('OVERRIDE_ERROR', 'could not override')
      )
    ).toBe(true);
  });

  it('accepts a code it does not know yet', () => {
    expect(
      isOverrideCommunityAccessError(
        nativeRejection('SOME_FUTURE_CODE', 'unknown')
      )
    ).toBe(true);
  });

  it('rejects an error with no code', () => {
    expect(isOverrideCommunityAccessError(new Error('boom'))).toBe(false);
  });

  it('rejects an error whose code is not a string', () => {
    expect(
      isOverrideCommunityAccessError(
        Object.assign(new Error('boom'), { code: 42 })
      )
    ).toBe(false);
  });

  it('rejects a code-carrying object with no message', () => {
    expect(isOverrideCommunityAccessError({ code: 'OVERRIDE_ERROR' })).toBe(
      false
    );
  });

  it('accepts a rejection that lost its Error prototype', () => {
    expect(
      isOverrideCommunityAccessError({
        code: 'OVERRIDE_ERROR',
        message: 'x',
      })
    ).toBe(true);
  });

  it('rejects values that are not objects', () => {
    expect(isOverrideCommunityAccessError(null)).toBe(false);
    expect(isOverrideCommunityAccessError(undefined)).toBe(false);
    expect(isOverrideCommunityAccessError('OVERRIDE_ERROR')).toBe(false);
  });
});
