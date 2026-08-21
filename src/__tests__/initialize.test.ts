import { initialize } from '../initialize';
import { isInitialised } from '../isInitialised';
import { setIsInitialised } from '../internals/initialisationState';

const mockInitialize = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    initialize: (...args: unknown[]) => mockInitialize(...args),
  },
}));

/** The last payload initialize sent across the bridge. */
function sentPayload(): Record<string, unknown> {
  expect(mockInitialize).toHaveBeenCalledTimes(1);
  return mockInitialize.mock.calls[0][0];
}

beforeEach(() => {
  mockInitialize.mockReset();
  mockInitialize.mockResolvedValue(undefined);
  setIsInitialised(false);
});

describe('initialize — apiServer and deepLink passthrough (Parity wave — lifecycle)', () => {
  it('sends no apiServer when the option is omitted', async () => {
    await initialize({ apiKey: 'k', connectionMode: { type: 'octopus' } });
    expect(sentPayload().apiServer).toBeUndefined();
  });

  it('forwards apiServer as-is', async () => {
    const apiServer = { host: 'api.example.com', port: 8443 };
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      apiServer,
    });
    expect(sentPayload().apiServer).toEqual(apiServer);
  });

  it('sends no deepLink when the option is omitted', async () => {
    await initialize({ apiKey: 'k', connectionMode: { type: 'octopus' } });
    expect(
      (sentPayload().connectionMode as Record<string, unknown>).deepLink
    ).toBeUndefined();
  });

  it('forwards deepLink as-is on octopus connectionMode', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus', deepLink: 'myapp://confirm' },
    });
    expect(sentPayload().connectionMode).toEqual({
      type: 'octopus',
      deepLink: 'myapp://confirm',
    });
  });

  it('flips isInitialised() to true once native module resolves', async () => {
    expect(isInitialised()).toBe(false);
    await initialize({ apiKey: 'k', connectionMode: { type: 'octopus' } });
    expect(isInitialised()).toBe(true);
  });

  it('does not flip isInitialised() when native module rejects', async () => {
    mockInitialize.mockRejectedValue(new Error('INIT_ERROR'));
    await expect(
      initialize({ apiKey: 'k', connectionMode: { type: 'octopus' } })
    ).rejects.toThrow('INIT_ERROR');
    expect(isInitialised()).toBe(false);
  });
});
