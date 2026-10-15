import { debugOverrideContentOptions } from '../debugOverrideContentOptions';

const mockOverride = jest.fn();
jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    debugOverrideContentOptions: (...args: unknown[]) => mockOverride(...args),
  },
}));

beforeEach(() => mockOverride.mockReset());

const defaults = {
  postEnablePictures: true,
  postEnablePolls: true,
  postTextRequired: true,
  commentEnablePictures: true,
  replyEnablePictures: true,
};

it.each([{}, { post: {} }, { post: { textRequired: true } }])(
  'defaults textRequired to true and preserves the other defaults (%j)',
  async (options) => {
    await debugOverrideContentOptions(options);
    expect(mockOverride).toHaveBeenCalledWith(defaults);
  }
);

it('sends false on the flat wire while preserving all four other flags', async () => {
  await debugOverrideContentOptions({
    post: { enablePictures: false, enablePolls: false, textRequired: false },
    comment: { enablePictures: false },
    reply: { enablePictures: false },
  });
  expect(mockOverride).toHaveBeenCalledWith({
    postEnablePictures: false,
    postEnablePolls: false,
    postTextRequired: false,
    commentEnablePictures: false,
    replyEnablePictures: false,
  });
});

it('sends null to restore the backend config', async () => {
  await debugOverrideContentOptions(null);
  expect(mockOverride).toHaveBeenCalledWith(null);
});

it('propagates a native rejection', async () => {
  mockOverride.mockRejectedValueOnce(new Error('OVERRIDE_ERROR'));
  await expect(debugOverrideContentOptions({})).rejects.toThrow(
    'OVERRIDE_ERROR'
  );
});
