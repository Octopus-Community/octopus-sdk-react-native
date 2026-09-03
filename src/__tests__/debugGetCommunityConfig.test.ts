import { debugGetCommunityConfig } from '../debugGetCommunityConfig';

const mockDebugGetCommunityConfig = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    debugGetCommunityConfig: (...args: unknown[]) =>
      mockDebugGetCommunityConfig(...args),
  },
}));

beforeEach(() => {
  mockDebugGetCommunityConfig.mockReset();
});

describe('debugGetCommunityConfig', () => {
  it('returns the native snapshot verbatim', async () => {
    const snapshot = {
      exposeClientUserId: true,
      forceLoginOnStrongActions: false,
      displayAccountAge: true,
      termsAcceptanceMode: 'implicit',
    };
    mockDebugGetCommunityConfig.mockResolvedValue(snapshot);
    await expect(debugGetCommunityConfig()).resolves.toEqual(snapshot);
    expect(mockDebugGetCommunityConfig).toHaveBeenCalledTimes(1);
    expect(mockDebugGetCommunityConfig).toHaveBeenCalledWith();
  });

  it('returns null when no config has been fetched yet', async () => {
    mockDebugGetCommunityConfig.mockResolvedValue(null);
    await expect(debugGetCommunityConfig()).resolves.toBeNull();
  });

  it('rejects when the native module rejects', async () => {
    mockDebugGetCommunityConfig.mockRejectedValue(new Error('CONFIG_ERROR'));
    await expect(debugGetCommunityConfig()).rejects.toThrow('CONFIG_ERROR');
  });
});
