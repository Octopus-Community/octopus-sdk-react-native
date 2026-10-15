import { version } from '../../package.json';
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

describe('initialize — appManagedAudioSession', () => {
  it.each([true, false, undefined])(
    'forwards %s with a default of false',
    async (appManagedAudioSession) => {
      await initialize({
        apiKey: 'k',
        connectionMode: { type: 'sso', appManagedFields: [] },
        ...(appManagedAudioSession !== undefined && { appManagedAudioSession }),
      });
      expect(sentPayload().appManagedAudioSession).toBe(
        appManagedAudioSession ?? false
      );
    }
  );

  it('forwards the option with SSO and a custom server', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'sso', appManagedFields: [] },
      apiServer: { host: 'api.example.com', port: 8443 },
      appManagedAudioSession: true,
    });
    expect(sentPayload().appManagedAudioSession).toBe(true);
  });
});

describe('initialize — apiServer passthrough', () => {
  it('sends no apiServer when the option is omitted', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'sso', appManagedFields: [] },
    });
    expect(sentPayload().apiServer).toBeUndefined();
  });

  it('forwards apiServer as-is', async () => {
    const apiServer = { host: 'api.example.com', port: 8443 };
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'sso', appManagedFields: [] },
      apiServer,
    });
    expect(sentPayload().apiServer).toEqual(apiServer);
  });

  it('flips isInitialised() to true once native module resolves', async () => {
    expect(isInitialised()).toBe(false);
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'sso', appManagedFields: [] },
    });
    expect(isInitialised()).toBe(true);
  });

  it('does not flip isInitialised() when native module rejects', async () => {
    mockInitialize.mockRejectedValue(new Error('INIT_ERROR'));
    await expect(
      initialize({
        apiKey: 'k',
        connectionMode: { type: 'sso', appManagedFields: [] },
      })
    ).rejects.toThrow('INIT_ERROR');
    expect(isInitialised()).toBe(false);
  });
});
// Legacy and plain-JS calls still reach native, which owns mode validation.
it('rejects the removed TypeScript mode and preserves the native initialize error', async () => {
  const params = { apiKey: 'k', connectionMode: { type: 'octopus' as const } };
  const error = Object.assign(
    new Error(
      "Octopus-owned authentication was removed. SSO is required (connectionMode.type must be 'sso')."
    ),
    {
      code: 'INITIALIZE_ERROR',
    }
  );
  mockInitialize.mockRejectedValue(error);
  // @ts-expect-error Octopus-owned authentication is no longer a public mode.
  await expect(initialize(params)).rejects.toBe(error);
  expect(sentPayload().connectionMode).toEqual(params.connectionMode);
  expect(isInitialised()).toBe(false);
});
it('forwards unknown JS modes unchanged for native validation', async () => {
  const params = { apiKey: 'k', connectionMode: { type: 'unknown' as const } };
  // @ts-expect-error Plain JS can bypass the required SSO type.
  await initialize(params);
  expect(sentPayload().connectionMode).toEqual(params.connectionMode);
});

it('declares the wrapper version from package.json on every initialization', async () => {
  const params = {
    apiKey: 'k',
    connectionMode: { type: 'sso' as const, appManagedFields: [] },
  };
  await initialize(params);
  await initialize(params);
  expect(mockInitialize).toHaveBeenCalledTimes(2);
  for (const [payload] of mockInitialize.mock.calls) {
    expect(payload.sdkVersion).toBe(version);
  }
});
