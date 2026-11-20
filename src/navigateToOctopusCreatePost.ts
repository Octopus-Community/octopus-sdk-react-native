import { OctopusReactNativeSdk } from './internals/nativeModule';
import { withLanguageCode } from './internals/localizedText';
import { normalizePrefilledPost } from './internals/prefilledPost';
import type { OctopusPrefilledPost } from './types/octopusPrefilledPost';

/**
 * Opens the Octopus UI directly on the post-creation editor, optionally prefilled.
 * The editor is the navigation root: cancelling (after confirming any discard) or
 * publishing successfully closes the fullscreen UI instead of revealing the feed.
 *
 * To configure profile-tap interception, use
 * `openUI({ initialScreen: { type: 'createPost', prefilledPost }, interceptProfileTaps: true })`.
 * This shorthand accepts prefill fields only.
 *
 * @param prefilledPost - Fields to prefill the editor with. Omit for a blank draft.
 * @returns A promise that resolves once the UI has been opened.
 * @throws A {@link NavigateToOctopusCreatePostError} when `prefilledPost` fails native
 * validation — see {@link isNavigateToOctopusCreatePostError}. An
 * {@link OctopusPrefilledPostTooManyImagesError} when it carries more than
 * {@link OCTOPUS_POST_MAX_IMAGE_COUNT} images, and a plain `Error` when it sets both `imageUri`
 * and `imageUris`, or both `cta.label` and `cta.localizedLabel`. All of them are rejections,
 * never synchronous throws.
 *
 * @example
 * ```typescript
 * await navigateToOctopusCreatePost({
 *   text: 'Hello from the host app',
 *   imageUris: ['file:///path/to/first.jpg', 'file:///path/to/second.jpg'],
 *   cta: {
 *     url: 'https://example.com',
 *     localizedLabel: OctopusLocalizedText.perLanguage(
 *       { en: 'Learn more', fr: 'En savoir plus' },
 *       'en'
 *     ),
 *   },
 * });
 * ```
 */
export function navigateToOctopusCreatePost(
  prefilledPost?: OctopusPrefilledPost
): Promise<void> {
  // Inside the try so the image checks reject rather than throw: callers `await` this.
  try {
    return Promise.resolve<void>(
      OctopusReactNativeSdk.navigateToOctopusCreatePost(
        prefilledPost
          ? normalizePrefilledPost(prefilledPost, 'navigateToOctopusCreatePost')
          : null
      )
    ).catch((error: unknown) => Promise.reject(withLanguageCode(error)));
  } catch (error: unknown) {
    return Promise.reject(error);
  }
}
