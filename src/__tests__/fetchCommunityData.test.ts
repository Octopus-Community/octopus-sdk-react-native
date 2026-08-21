import { fetchCommunityData } from '../fetchCommunityData';

const mockFetchCommunityData = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    fetchCommunityData: (...args: unknown[]) => mockFetchCommunityData(...args),
  },
}));

beforeEach(() => {
  mockFetchCommunityData.mockReset();
  mockFetchCommunityData.mockResolvedValue(null);
});

describe('fetchCommunityData', () => {
  it('forwards profileId and normalizes the absent clientUserId to null', async () => {
    await fetchCommunityData({ profileId: 'p1' });
    expect(mockFetchCommunityData).toHaveBeenCalledWith('p1', null);
  });

  it('forwards clientUserId and normalizes the absent profileId to null', async () => {
    await fetchCommunityData({ clientUserId: 'c1' });
    expect(mockFetchCommunityData).toHaveBeenCalledWith(null, 'c1');
  });

  it('normalizes an empty-string profileId to null instead of forwarding it', () => {
    // Regression: `memberId.profileId ?? null` would forward '' unchanged (only null/undefined
    // are nullish), crossing the bridge with a non-null empty profileId that shadowed the real
    // clientUserId on the native side.
    mockFetchCommunityData.mockResolvedValue(null);
    fetchCommunityData({ profileId: '', clientUserId: 'c1' });
    expect(mockFetchCommunityData).toHaveBeenCalledWith(null, 'c1');
  });

  it('throws synchronously when both ids are provided', () => {
    expect(() =>
      fetchCommunityData({ profileId: 'p1', clientUserId: 'c1' })
    ).toThrow();
    expect(mockFetchCommunityData).not.toHaveBeenCalled();
  });

  it('throws synchronously when neither id is provided', () => {
    expect(() => fetchCommunityData({})).toThrow();
    expect(mockFetchCommunityData).not.toHaveBeenCalled();
  });

  it('throws synchronously when both ids are empty strings', () => {
    expect(() =>
      fetchCommunityData({ profileId: '', clientUserId: '' })
    ).toThrow();
    expect(mockFetchCommunityData).not.toHaveBeenCalled();
  });
});
