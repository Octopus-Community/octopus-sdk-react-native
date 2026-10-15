import { version } from '../../package.json';
import { DeviceEventEmitter } from 'react-native';
import { switchCommunity } from '../switchCommunity';
import { isInitialised } from '../isInitialised';
import { setIsInitialised } from '../internals/initialisationState';

const mockSwitchCommunity = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    // `NativeEventEmitter` (reached transitively through `internals/stateChannels`) warns
    // when the native module lacks these.
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    switchCommunity: (...args: unknown[]) => mockSwitchCommunity(...args),
  },
}));

beforeEach(() => {
  mockSwitchCommunity.mockReset();
  mockSwitchCommunity.mockResolvedValue(undefined);
  setIsInitialised(false);
});

afterEach(() => {
  DeviceEventEmitter.removeAllListeners('isInitialisedChanged');
});

describe('switchCommunity', () => {
  it('forwards required SSO params to the native module', async () => {
    const params = {
      apiKey: 'new-community-key',
      connectionMode: { type: 'sso' as const, appManagedFields: [] },
    };
    await switchCommunity(params);
    expect(mockSwitchCommunity).toHaveBeenCalledTimes(1);
    expect(mockSwitchCommunity).toHaveBeenCalledWith({
      ...params,
      sdkVersion: version,
    });
  });

  it('forwards sso params to the native module', async () => {
    const params = {
      apiKey: 'new-community-key',
      connectionMode: {
        type: 'sso' as const,
        appManagedFields: ['username' as const],
      },
    };
    await switchCommunity(params);
    expect(mockSwitchCommunity).toHaveBeenCalledWith({
      ...params,
      sdkVersion: version,
    });
  });

  it('forwards an optional apiServer', async () => {
    const params = {
      apiKey: 'new-community-key',
      connectionMode: { type: 'sso' as const, appManagedFields: [] },
      apiServer: { host: 'api.example.com', port: 8443 },
    };
    await switchCommunity(params);
    expect(mockSwitchCommunity).toHaveBeenCalledWith({
      ...params,
      sdkVersion: version,
    });
  });

  it('flips isInitialised() to true once native module resolves', async () => {
    expect(isInitialised()).toBe(false);
    await switchCommunity({
      apiKey: 'k',
      connectionMode: { type: 'sso', appManagedFields: [] },
    });
    expect(isInitialised()).toBe(true);
  });

  it('does not flip isInitialised() when native module rejects', async () => {
    mockSwitchCommunity.mockRejectedValue(new Error('SWITCH_ERROR'));
    await expect(
      switchCommunity({
        apiKey: 'k',
        connectionMode: { type: 'sso', appManagedFields: [] },
      })
    ).rejects.toThrow('SWITCH_ERROR');
    expect(isInitialised()).toBe(false);
  });

  it('publishes true on the isInitialisedChanged channel once native module resolves', async () => {
    const received: boolean[] = [];
    const subscription = DeviceEventEmitter.addListener(
      'isInitialisedChanged',
      (payload: { isInitialised: boolean }) =>
        received.push(payload.isInitialised)
    );
    await switchCommunity({
      apiKey: 'k',
      connectionMode: { type: 'sso', appManagedFields: [] },
    });
    subscription.remove();
    expect(received).toEqual([true]);
  });

  it('publishes nothing on the isInitialisedChanged channel when native module rejects', async () => {
    mockSwitchCommunity.mockRejectedValue(new Error('SWITCH_ERROR'));
    const received: boolean[] = [];
    const subscription = DeviceEventEmitter.addListener(
      'isInitialisedChanged',
      (payload: { isInitialised: boolean }) =>
        received.push(payload.isInitialised)
    );
    await expect(
      switchCommunity({
        apiKey: 'k',
        connectionMode: { type: 'sso', appManagedFields: [] },
      })
    ).rejects.toThrow('SWITCH_ERROR');
    subscription.remove();
    expect(received).toEqual([]);
  });
});
it('rejects the removed TypeScript mode and preserves the native switch error', async () => {
  const params = { apiKey: 'k', connectionMode: { type: 'octopus' as const } };
  const error = Object.assign(
    new Error(
      "Octopus-owned authentication was removed. SSO is required (connectionMode.type must be 'sso')."
    ),
    {
      code: 'SWITCH_COMMUNITY_ERROR',
    }
  );
  mockSwitchCommunity.mockRejectedValue(error);
  // @ts-expect-error Community switches accept only the SSO object.
  await expect(switchCommunity(params)).rejects.toBe(error);
  expect(mockSwitchCommunity).toHaveBeenCalledWith({
    ...params,
    sdkVersion: version,
  });
  expect(isInitialised()).toBe(false);
});
it('forwards unknown JS modes unchanged for native validation', async () => {
  const params = { apiKey: 'k', connectionMode: { type: 'unknown' as const } };
  // @ts-expect-error Plain JS can bypass the required SSO type.
  await switchCommunity(params);
  expect(mockSwitchCommunity).toHaveBeenCalledWith({
    ...params,
    sdkVersion: version,
  });
});

it('declares the package version on cold and repeated community switches', async () => {
  const params = {
    apiKey: 'k',
    connectionMode: { type: 'sso' as const, appManagedFields: [] },
  };
  await switchCommunity(params);
  await switchCommunity(params);
  expect(mockSwitchCommunity).toHaveBeenCalledTimes(2);
  for (const [payload] of mockSwitchCommunity.mock.calls) {
    expect(payload.sdkVersion).toBe(version);
  }
});
