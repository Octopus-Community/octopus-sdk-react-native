import { startObservingCommunityData } from '../startObservingCommunityData';

const mockStartObservingCommunityData = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    startObservingCommunityData: (...args: unknown[]) =>
      mockStartObservingCommunityData(...args),
  },
}));

beforeEach(() => {
  mockStartObservingCommunityData.mockReset();
  mockStartObservingCommunityData.mockResolvedValue(undefined);
});

describe('startObservingCommunityData', () => {
  it('forwards profileId and normalizes the absent clientUserId to null', async () => {
    await startObservingCommunityData({ profileId: 'p1' });
    expect(mockStartObservingCommunityData).toHaveBeenCalledWith('p1', null);
  });

  it('forwards clientUserId and normalizes the absent profileId to null', async () => {
    await startObservingCommunityData({ clientUserId: 'c1' });
    expect(mockStartObservingCommunityData).toHaveBeenCalledWith(null, 'c1');
  });

  it('normalizes an empty-string profileId to null instead of forwarding it', () => {
    // Regression: `memberId.profileId ?? null` would forward '' unchanged (only null/undefined
    // are nullish), crossing the bridge with a non-null empty profileId that shadowed the real
    // clientUserId on the native side.
    startObservingCommunityData({ profileId: '', clientUserId: 'c1' });
    expect(mockStartObservingCommunityData).toHaveBeenCalledWith(null, 'c1');
  });

  it('throws synchronously when both ids are provided', () => {
    expect(() =>
      startObservingCommunityData({ profileId: 'p1', clientUserId: 'c1' })
    ).toThrow();
    expect(mockStartObservingCommunityData).not.toHaveBeenCalled();
  });

  it('throws synchronously when neither id is provided', () => {
    expect(() => startObservingCommunityData({})).toThrow();
    expect(mockStartObservingCommunityData).not.toHaveBeenCalled();
  });
});
