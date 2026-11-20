import { navigateToOctopusCreatePost } from '../navigateToOctopusCreatePost';
import { openUI } from '../openUI';
import { isNavigateToOctopusCreatePostError } from '../types/navigateToOctopusCreatePostError';
import { OCTOPUS_POST_MAX_IMAGE_COUNT } from '../types/octopusPrefilledPost';
import { OctopusPrefilledPostTooManyImagesError } from '../types/octopusPrefilledPostTooManyImagesError';

const mockNavigateToCreatePost = jest.fn();
const mockOpenUI = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    navigateToOctopusCreatePost: (...args: unknown[]) =>
      mockNavigateToCreatePost(...args),
    openUI: (...args: unknown[]) => mockOpenUI(...args),
  },
}));

beforeEach(() => {
  mockNavigateToCreatePost.mockReset();
  mockNavigateToCreatePost.mockResolvedValue(undefined);
  mockOpenUI.mockReset();
  mockOpenUI.mockResolvedValue(undefined);
});

const photos = (count: number) =>
  Array.from({ length: count }, (_, index) => `file:///tmp/photo-${index}.jpg`);

describe('OCTOPUS_POST_MAX_IMAGE_COUNT', () => {
  it('is the native maximum of 10', () => {
    expect(OCTOPUS_POST_MAX_IMAGE_COUNT).toBe(10);
  });
});

describe('navigateToOctopusCreatePost images', () => {
  it('forwards the maximum number of images in display order', async () => {
    await navigateToOctopusCreatePost({ imageUris: photos(10) });

    expect(mockNavigateToCreatePost.mock.calls[0][0].imageUris).toStrictEqual(
      photos(10)
    );
  });

  it('drops blank entries before counting them', async () => {
    await navigateToOctopusCreatePost({
      imageUris: ['', ...photos(10), '   '],
    });

    expect(mockNavigateToCreatePost.mock.calls[0][0].imageUris).toStrictEqual(
      photos(10)
    );
  });

  it('sends no image list when every entry is blank', async () => {
    await navigateToOctopusCreatePost({ imageUris: [' '] });

    expect(mockNavigateToCreatePost.mock.calls[0][0].imageUris).toBeNull();
  });

  it('rejects more than the maximum with the dedicated error, before any native call', async () => {
    const rejection = navigateToOctopusCreatePost({ imageUris: photos(11) });

    await expect(rejection).rejects.toBeInstanceOf(
      OctopusPrefilledPostTooManyImagesError
    );
    await rejection.catch((error: unknown) => {
      const tooMany = error as OctopusPrefilledPostTooManyImagesError;
      expect(tooMany.max).toBe(10);
      expect(tooMany.count).toBe(11);
      expect(tooMany.name).toBe('OctopusPrefilledPostTooManyImagesError');
      expect(tooMany).toBeInstanceOf(Error);
      // Outside the validation-error codes, so an exhaustive switch over them still compiles
      // and never sees it.
      expect(isNavigateToOctopusCreatePostError(error)).toBe(false);
    });
    expect(mockNavigateToCreatePost).not.toHaveBeenCalled();
  });

  it('rejects imageUri together with a non-empty imageUris, before any native call', async () => {
    const rejection = navigateToOctopusCreatePost({
      imageUri: 'file:///tmp/single.jpg',
      imageUris: photos(1),
    });

    await expect(rejection).rejects.toThrow(/imageUris only/);
    await rejection.catch((error: unknown) => {
      expect(error).not.toBeInstanceOf(OctopusPrefilledPostTooManyImagesError);
      expect(isNavigateToOctopusCreatePostError(error)).toBe(false);
    });
    expect(mockNavigateToCreatePost).not.toHaveBeenCalled();
  });

  it('accepts imageUri with an empty imageUris', async () => {
    await navigateToOctopusCreatePost({
      imageUri: 'file:///tmp/single.jpg',
      imageUris: [],
    });

    expect(mockNavigateToCreatePost.mock.calls[0][0].imageUris).toStrictEqual([
      'file:///tmp/single.jpg',
    ]);
  });
});

describe('openUI createPost images', () => {
  it('forwards imageUris in the initial screen', async () => {
    await openUI({
      initialScreen: {
        type: 'createPost',
        prefilledPost: { imageUris: photos(3) },
      },
    });

    expect(mockOpenUI.mock.calls[0][0].initialScreen.imageUris).toStrictEqual(
      photos(3)
    );
  });

  it('throws the dedicated error synchronously on more than the maximum', () => {
    expect(() =>
      openUI({
        initialScreen: {
          type: 'createPost',
          prefilledPost: { imageUris: photos(11) },
        },
      })
    ).toThrow(OctopusPrefilledPostTooManyImagesError);
    expect(mockOpenUI).not.toHaveBeenCalled();
  });

  it('throws synchronously on imageUri together with imageUris', () => {
    expect(() =>
      openUI({
        initialScreen: {
          type: 'createPost',
          prefilledPost: { imageUri: 'a', imageUris: ['b'] },
        },
      })
    ).toThrow(/openUI: set imageUris only/);
    expect(mockOpenUI).not.toHaveBeenCalled();
  });
});
