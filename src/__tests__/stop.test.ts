import { DeviceEventEmitter } from 'react-native';
import { stop } from '../stop';
import { isInitialised } from '../isInitialised';
import { setIsInitialised } from '../internals/initialisationState';

const mockStop = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    // `NativeEventEmitter` (reached transitively through `internals/stateChannels`) warns
    // when the native module lacks these.
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    stop: (...args: unknown[]) => mockStop(...args),
  },
}));

beforeEach(() => {
  mockStop.mockReset();
  mockStop.mockResolvedValue(undefined);
  setIsInitialised(true);
});

afterEach(() => {
  DeviceEventEmitter.removeAllListeners('isInitialisedChanged');
});

describe('stop', () => {
  it('calls the native module with no arguments', async () => {
    await stop();
    expect(mockStop).toHaveBeenCalledTimes(1);
    expect(mockStop).toHaveBeenCalledWith();
  });

  it('flips isInitialised() to false once native module resolves', async () => {
    expect(isInitialised()).toBe(true);
    await stop();
    expect(isInitialised()).toBe(false);
  });

  it('does not flip isInitialised() when native module rejects', async () => {
    mockStop.mockRejectedValue(new Error('STOP_ERROR'));
    await expect(stop()).rejects.toThrow('STOP_ERROR');
    expect(isInitialised()).toBe(true);
  });

  it('publishes false on the isInitialisedChanged channel once native module resolves', async () => {
    const received: boolean[] = [];
    const subscription = DeviceEventEmitter.addListener(
      'isInitialisedChanged',
      (payload: { isInitialised: boolean }) =>
        received.push(payload.isInitialised)
    );
    await stop();
    subscription.remove();
    expect(received).toEqual([false]);
  });

  it('publishes nothing on the isInitialisedChanged channel when native module rejects', async () => {
    mockStop.mockRejectedValue(new Error('STOP_ERROR'));
    const received: boolean[] = [];
    const subscription = DeviceEventEmitter.addListener(
      'isInitialisedChanged',
      (payload: { isInitialised: boolean }) =>
        received.push(payload.isInitialised)
    );
    await expect(stop()).rejects.toThrow('STOP_ERROR');
    subscription.remove();
    expect(received).toEqual([]);
  });
});
