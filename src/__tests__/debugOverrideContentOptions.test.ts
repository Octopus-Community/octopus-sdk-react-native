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
  postImageTapOpensPost: false,
  postGroupNameTapOpensGroup: false,
  commentEnablePictures: true,
  replyEnablePictures: true,
};

it.each([{}, { post: {} }, { post: { textRequired: true } }])(
  'defaults tap flags to false and creation flags to true (%j)',
  async (options) => {
    await debugOverrideContentOptions(options);
    expect(mockOverride).toHaveBeenCalledWith(defaults);
  }
);

it('sends disabled creation flags while leaving tap flags false', async () => {
  await debugOverrideContentOptions({
    post: { enablePictures: false, enablePolls: false, textRequired: false },
    comment: { enablePictures: false },
    reply: { enablePictures: false },
  });
  expect(mockOverride).toHaveBeenCalledWith({
    postEnablePictures: false,
    postEnablePolls: false,
    postTextRequired: false,
    postImageTapOpensPost: false,
    postGroupNameTapOpensGroup: false,
    commentEnablePictures: false,
    replyEnablePictures: false,
  });
});

it.each([
  [false, false],
  [true, false],
  [false, true],
  [true, true],
])('forwards independent tap flags (%s, %s)', async (image, group) => {
  await debugOverrideContentOptions({
    post: { imageTapOpensPost: image, groupNameTapOpensGroup: group },
  });
  expect(mockOverride).toHaveBeenCalledWith({
    ...defaults,
    postImageTapOpensPost: image,
    postGroupNameTapOpensGroup: group,
  });
});

it.each([{ imageTapOpensPost: true }, { groupNameTapOpensGroup: true }])(
  'defaults the omitted sibling tap flag to false (%j)',
  async (post) => {
    await debugOverrideContentOptions({ post });
    expect(mockOverride).toHaveBeenCalledWith({
      ...defaults,
      postImageTapOpensPost: post.imageTapOpensPost ?? false,
      postGroupNameTapOpensGroup: post.groupNameTapOpensGroup ?? false,
    });
  }
);

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
