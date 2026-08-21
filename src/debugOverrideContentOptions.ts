import { OctopusReactNativeSdk } from './internals/nativeModule';
import type { ContentOptions } from './types/contentOptions';

/**
 * **Debug-only.** Forces the per-content-type creation options, overriding the backend-provided
 * community config, for local testing of the post/comment/reply composers. Not part of the
 * stable public API surface and not for use in production apps.
 *
 * Every flag not explicitly set to `false` is sent as `true` (the native default), so the
 * override always describes a complete, unambiguous config rather than a partial patch.
 *
 * @param options - The content options to apply, or `null` to restore the backend-provided
 * config.
 * @returns A promise that resolves when the override has been applied.
 */
export function debugOverrideContentOptions(
  options: ContentOptions | null
): Promise<void> {
  if (options === null) {
    return OctopusReactNativeSdk.debugOverrideContentOptions(null);
  }
  return OctopusReactNativeSdk.debugOverrideContentOptions({
    postEnablePictures: options.post?.enablePictures ?? true,
    postEnablePolls: options.post?.enablePolls ?? true,
    commentEnablePictures: options.comment?.enablePictures ?? true,
    replyEnablePictures: options.reply?.enablePictures ?? true,
  });
}
