import { isInitialised } from '../isInitialised';
import { setIsInitialised } from '../internals/initialisationState';

// Parity wave — lifecycle: a mock standing in for the entire native module. Every method is a
// jest.fn() so a call from `isInitialised()` would be recorded here — the real native module
// (an unlinked-in-Jest Proxy that throws on any property read, see `internals/nativeModule.ts`)
// can't be used directly for this assertion: reading a method off it to spy on would itself
// throw.
const mockNativeModuleCall = jest.fn();
jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: new Proxy(
    {},
    {
      get:
        (_target, prop) =>
        (...args: unknown[]) =>
          mockNativeModuleCall(prop, ...args),
    }
  ),
}));

describe('isInitialised', () => {
  beforeEach(() => {
    mockNativeModuleCall.mockClear();
  });

  afterEach(() => {
    setIsInitialised(false);
  });

  it('defaults to false', () => {
    expect(isInitialised()).toBe(false);
  });

  it('reflects setIsInitialised(true)', () => {
    setIsInitialised(true);
    expect(isInitialised()).toBe(true);
  });

  it('reflects setIsInitialised(false) after being true', () => {
    setIsInitialised(true);
    setIsInitialised(false);
    expect(isInitialised()).toBe(false);
  });

  it('does not cross the bridge', () => {
    // isInitialised() is a plain synchronous read of the internal flag; it must not
    // reach into the native module. Was previously asserted only via
    // `typeof isInitialised() === 'boolean'`, which stays green even if the implementation
    // started calling native tomorrow — replaced with a real spy-based assertion.
    isInitialised();
    setIsInitialised(true);
    isInitialised();
    expect(mockNativeModuleCall).not.toHaveBeenCalled();
  });
});
