import { OCTOPUS_POST_MAX_IMAGE_COUNT } from '../types/octopusPrefilledPost';
import type { OctopusPrefilledPost } from '../types/octopusPrefilledPost';
import { OctopusPrefilledPostTooManyImagesError } from '../types/octopusPrefilledPostTooManyImagesError';
import { localizedTextToWire, NO_NATIVE_LOCALIZED_TEXT } from './localizedText';

/**
 * The flat prefill fields both native bridges decode, shared by `navigateToOctopusCreatePost`
 * and the `createPost` initial screen. Absent fields are `null`, never `''` or `undefined`.
 */
export interface NativePrefilledPost {
  text: string | null;
  /** Never empty: no image is `null`. */
  imageUris: string[] | null;
  topicId: string | null;
  ctaUrl: string | null;
  /** The auto-translated label; `null` for a per-language one. */
  ctaLabel: string | null;
  /** The default language of a per-language label; else `null`. */
  ctaLabelLanguage: string | null;
  /** The texts of a per-language label by language tag, default included; else `null`. */
  ctaLabelTexts: Record<string, string> | null;
}

/**
 * Normalizes a public {@link OctopusPrefilledPost} into the wire fields.
 *
 * The deprecated `imageUri` becomes a one-element `imageUris`, so the native bridges read a
 * single list. Blank entries are dropped before counting, as both native SDKs drop empty images.
 *
 * The CTA label goes out as the flat fields of {@link localizedTextToWire}: the deprecated
 * `label` as an auto-translated one.
 *
 * @throws Error when `imageUri` and a non-empty `imageUris` are both set, when the CTA sets both
 * `label` and `localizedLabel`, or when `localizedLabel` is not an `OctopusLocalizedText`.
 * @throws OctopusPrefilledPostTooManyImagesError when more than
 * {@link OCTOPUS_POST_MAX_IMAGE_COUNT} non-blank images are left.
 */
export function normalizePrefilledPost(
  prefilledPost: OctopusPrefilledPost,
  caller: string
): NativePrefilledPost {
  const { imageUri, imageUris } = prefilledPost;
  if (imageUri != null && imageUris != null && imageUris.length > 0) {
    throw new Error(
      `${caller}: set imageUris only — imageUri is deprecated and cannot be combined with imageUris`
    );
  }
  const requested =
    imageUris != null && imageUris.length > 0
      ? imageUris
      : imageUri != null
        ? [imageUri]
        : [];
  const images = requested.filter(
    (uri) => typeof uri === 'string' && uri.trim().length > 0
  );
  if (images.length > OCTOPUS_POST_MAX_IMAGE_COUNT) {
    throw new OctopusPrefilledPostTooManyImagesError(
      OCTOPUS_POST_MAX_IMAGE_COUNT,
      images.length
    );
  }
  const label = ctaLabelToWire(prefilledPost, caller);
  return {
    text: prefilledPost.text ?? null,
    imageUris: images.length > 0 ? images : null,
    topicId: prefilledPost.topicId ?? null,
    ctaUrl: prefilledPost.cta?.url ?? null,
    ctaLabel: label.text,
    ctaLabelLanguage: label.language,
    ctaLabelTexts: label.texts,
  };
}

function ctaLabelToWire(prefilledPost: OctopusPrefilledPost, caller: string) {
  const cta = prefilledPost.cta;
  if (cta == null) return NO_NATIVE_LOCALIZED_TEXT;
  const { label, localizedLabel } = cta;
  if (label != null && localizedLabel != null) {
    throw new Error(
      `${caller}: set cta.localizedLabel only — cta.label is deprecated and cannot be combined with cta.localizedLabel`
    );
  }
  if (localizedLabel != null) {
    return localizedTextToWire(localizedLabel, `${caller}: cta.localizedLabel`);
  }
  return { ...NO_NATIVE_LOCALIZED_TEXT, text: label ?? null };
}
