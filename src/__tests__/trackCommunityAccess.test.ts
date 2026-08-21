import { trackCommunityAccess } from '../trackCommunityAccess';

const mockTrackCommunityAccess = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    trackCommunityAccess: (...args: unknown[]) =>
      mockTrackCommunityAccess(...args),
  },
}));

beforeEach(() => {
  mockTrackCommunityAccess.mockReset();
  mockTrackCommunityAccess.mockResolvedValue(undefined);
});

describe('trackCommunityAccess', () => {
  it('calls native module with true when hasAccess is true', async () => {
    await trackCommunityAccess(true);
    expect(mockTrackCommunityAccess).toHaveBeenCalledTimes(1);
    expect(mockTrackCommunityAccess).toHaveBeenCalledWith(true);
  });

  it('calls native module with false when hasAccess is false', async () => {
    await trackCommunityAccess(false);
    expect(mockTrackCommunityAccess).toHaveBeenCalledTimes(1);
    expect(mockTrackCommunityAccess).toHaveBeenCalledWith(false);
  });

  it('returns a promise that resolves when native module resolves', async () => {
    const result = trackCommunityAccess(true);
    await expect(result).resolves.toBeUndefined();
  });

  it('returns a promise that rejects when native module rejects', async () => {
    const error = new Error('TRACK_ACCESS_ERROR');
    mockTrackCommunityAccess.mockRejectedValue(error);
    await expect(trackCommunityAccess(true)).rejects.toThrow(
      'TRACK_ACCESS_ERROR'
    );
  });
});
