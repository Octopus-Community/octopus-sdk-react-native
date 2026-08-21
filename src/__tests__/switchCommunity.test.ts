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
  it('forwards octopus-managed params to the native module', async () => {
    const params = {
      apiKey: 'new-community-key',
      connectionMode: { type: 'octopus' as const },
    };
    await switchCommunity(params);
    expect(mockSwitchCommunity).toHaveBeenCalledTimes(1);
    expect(mockSwitchCommunity).toHaveBeenCalledWith(params);
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
    expect(mockSwitchCommunity).toHaveBeenCalledWith(params);
  });

  it('forwards an optional deepLink and apiServer', async () => {
    const params = {
      apiKey: 'new-community-key',
      connectionMode: { type: 'octopus' as const, deepLink: 'myapp://confirm' },
      apiServer: { host: 'api.example.com', port: 8443 },
    };
    await switchCommunity(params);
    expect(mockSwitchCommunity).toHaveBeenCalledWith(params);
  });

  it('flips isInitialised() to true once native module resolves', async () => {
    expect(isInitialised()).toBe(false);
    await switchCommunity({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
    });
    expect(isInitialised()).toBe(true);
  });

  it('does not flip isInitialised() when native module rejects', async () => {
    mockSwitchCommunity.mockRejectedValue(new Error('SWITCH_ERROR'));
    await expect(
      switchCommunity({ apiKey: 'k', connectionMode: { type: 'octopus' } })
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
    await switchCommunity({ apiKey: 'k', connectionMode: { type: 'octopus' } });
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
      switchCommunity({ apiKey: 'k', connectionMode: { type: 'octopus' } })
    ).rejects.toThrow('SWITCH_ERROR');
    subscription.remove();
    expect(received).toEqual([]);
  });
});
