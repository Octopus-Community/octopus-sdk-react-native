import { debugOverrideForceNicknameChoice } from '../index';

const mockOverride = jest.fn();
jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    debugOverrideForceNicknameChoice: (...args: unknown[]) =>
      mockOverride(...args),
  },
}));
beforeEach(() => mockOverride.mockReset());

it.each([true, false, null])(
  'forwards %s through the exported tri-state API',
  async (enabled) => {
    await debugOverrideForceNicknameChoice(enabled);
    expect(mockOverride).toHaveBeenCalledTimes(1);
    expect(mockOverride).toHaveBeenCalledWith(
      enabled === null ? null : { value: enabled }
    );
  }
);

it('propagates a native rejection', async () => {
  mockOverride.mockRejectedValueOnce(new Error('OVERRIDE_ERROR'));
  await expect(debugOverrideForceNicknameChoice(true)).rejects.toThrow(
    'OVERRIDE_ERROR'
  );
});
