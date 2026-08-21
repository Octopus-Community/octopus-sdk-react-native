import { connectUser } from '../connectUser';
import { isConnectUserError } from '../types/connectUserError';

const mockConnectUser = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    connectUser: (...args: unknown[]) => mockConnectUser(...args),
  },
}));

/** A rejection as React Native shapes it: an `Error` carrying the native code. */
const nativeRejection = (code: string, message: string): Error =>
  Object.assign(new Error(message), { code });

beforeEach(() => {
  mockConnectUser.mockReset();
  mockConnectUser.mockResolvedValue(undefined);
});

describe('connectUser', () => {
  it('forwards the params to the native module unchanged', async () => {
    const params = {
      userId: 'user-1',
      profile: { username: 'jane', biography: 'hi' },
    };

    await connectUser(params);

    expect(mockConnectUser).toHaveBeenCalledTimes(1);
    expect(mockConnectUser).toHaveBeenCalledWith(params);
  });

  it('resolves when the native module resolves', async () => {
    await expect(connectUser({ userId: 'user-1' })).resolves.toBeUndefined();
  });

  it('propagates a refused connection instead of resolving', async () => {
    // The whole point of the error contract: a refusal must not look like a success, or the
    // app connects nobody while believing it did.
    mockConnectUser.mockRejectedValue(
      nativeRejection('USER_BANNED', 'You have been banned for spam.')
    );

    await expect(connectUser({ userId: 'user-1' })).rejects.toThrow(
      'You have been banned for spam.'
    );
  });

  it('preserves the native code on the rejected error', async () => {
    mockConnectUser.mockRejectedValue(
      nativeRejection('MISSING_TOKEN', 'Missing user Token')
    );

    await expect(connectUser({ userId: 'user-1' })).rejects.toMatchObject({
      code: 'MISSING_TOKEN',
    });
  });
});

describe('isConnectUserError', () => {
  it('accepts a rejection carrying a known code', () => {
    expect(isConnectUserError(nativeRejection('USER_BANNED', 'banned'))).toBe(
      true
    );
  });

  it('accepts a code it does not know yet', () => {
    // A native SDK upgrade may add a code this version never heard of; the error must still
    // reach the caller's handler rather than being filtered out as "not an error of ours".
    expect(
      isConnectUserError(nativeRejection('SOME_FUTURE_CODE', 'unknown'))
    ).toBe(true);
  });

  it('rejects an error with no code', () => {
    expect(isConnectUserError(new Error('boom'))).toBe(false);
  });

  it('rejects an error whose code is not a string', () => {
    expect(
      isConnectUserError(Object.assign(new Error('boom'), { code: 42 }))
    ).toBe(false);
  });

  it('rejects a code-carrying object with no message', () => {
    // The guard narrows to `ConnectUserError extends Error`, so callers read `error.message`
    // straight after it. Accepting a bare `{ code }` would hand them `undefined` typed as
    // `string` — and a UI showing "undefined" to a banned user.
    expect(isConnectUserError({ code: 'USER_BANNED' })).toBe(false);
  });

  it('accepts a rejection that lost its Error prototype', () => {
    // Deliberately structural rather than `instanceof Error`: a rejection stored in a state
    // container or posted across a worker boundary keeps both fields but not its prototype.
    expect(isConnectUserError({ code: 'USER_BANNED', message: 'banned' })).toBe(
      true
    );
  });

  it('rejects values that are not objects', () => {
    expect(isConnectUserError(null)).toBe(false);
    expect(isConnectUserError(undefined)).toBe(false);
    expect(isConnectUserError('USER_BANNED')).toBe(false);
  });
});
