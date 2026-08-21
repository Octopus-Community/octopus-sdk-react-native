import { OctopusReactNativeSdk } from './internals/nativeModule';
import type { OctopusPrefilledPost } from './types/octopusPrefilledPost';

/**
 * Opens the Octopus UI directly on the post-creation editor, optionally prefilled.
 *
 * @param prefilledPost - Fields to prefill the editor with. Omit for a blank draft.
 * @returns A promise that resolves once the UI has been opened.
 * @throws A {@link NavigateToOctopusCreatePostError} when `prefilledPost` fails native
 * validation — see {@link isNavigateToOctopusCreatePostError}.
 *
 * @example
 * ```typescript
 * await navigateToOctopusCreatePost({
 *   text: 'Hello from the host app',
 *   cta: { url: 'https://example.com', label: 'Learn more' },
 * });
 * ```
 */
export function navigateToOctopusCreatePost(
  prefilledPost?: OctopusPrefilledPost
): Promise<void> {
  return OctopusReactNativeSdk.navigateToOctopusCreatePost(
    prefilledPost
      ? {
          text: prefilledPost.text ?? null,
          imageUri: prefilledPost.imageUri ?? null,
          topicId: prefilledPost.topicId ?? null,
          ctaUrl: prefilledPost.cta?.url ?? null,
          ctaLabel: prefilledPost.cta?.label ?? null,
        }
      : null
  );
}
