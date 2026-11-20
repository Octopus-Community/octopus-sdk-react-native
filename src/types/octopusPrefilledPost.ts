import type { OctopusLocalizedText } from './octopusLocalizedText';

/**
 * The maximum number of images a post carries — in {@link OctopusPrefilledPost.imageUris} and in
 * {@link ClientPost.medias}.
 */
export const OCTOPUS_POST_MAX_IMAGE_COUNT = 10;

/**
 * A call-to-action button attached to a prefilled post draft.
 *
 * Give its label with `localizedLabel` — {@link OctopusLocalizedText.perLanguage} to give it in
 * each language of your app, {@link OctopusLocalizedText.autoTranslated} to let Octopus translate
 * one label. The deprecated `label` means `localizedLabel: OctopusLocalizedText.autoTranslated(label)`.
 * Set one of the two: both together are refused with a plain `Error`, before the native call.
 *
 * Keep each label under 28 characters so that it fits on one line: a longer label is accepted,
 * and the button can then take several lines.
 */
export interface OctopusPostCTA {
  /** The URL opened when the CTA is tapped. Must not be blank. */
  url: string;
  /**
   * The CTA's label, translated automatically by Octopus. Must not be blank after trimming.
   *
   * @deprecated Use localizedLabel, with `OctopusLocalizedText.autoTranslated(label)` to keep
   * the automatic translation.
   */
  label?: string;
  /**
   * The CTA's label, auto-translated or given per language. An auto-translated text must not be
   * blank after trimming (`CTA_LABEL_EMPTY`), nor any text of a per-language label
   * (`LOCALIZED_TEXT_BLANK_TEXT`). A per-language label that
   * breaks one of the rules listed on {@link OctopusLocalizedText} is refused with the matching
   * `LOCALIZED_TEXT_…` code.
   */
  localizedLabel?: OctopusLocalizedText;
}

/**
 * Prefills the post-creation editor opened by {@link navigateToOctopusCreatePost}.
 *
 * Every field is optional and independently validated by the native SDK before the editor
 * opens; see {@link NavigateToOctopusCreatePostErrorCode} for the failure codes a bad value can
 * produce.
 *
 * Each entry of `imageUris` (and the deprecated `imageUri`) accepts either:
 *  - a bare name with no scheme, resolved as a bundled native image resource (an Android
 *    drawable resource / an iOS asset-catalog image with that name) — this is how the QA
 *    scenario's "bundled image" presets work, since neither native SDK fetches remote URLs for
 *    this field;
 *  - a `file://` URI pointing at a local file already on device.
 *
 * Two image rules are checked by this wrapper before the native SDK is called:
 *  - setting both `imageUri` and a non-empty `imageUris` is refused with a plain `Error`;
 *  - more than {@link OCTOPUS_POST_MAX_IMAGE_COUNT} non-blank `imageUris` are refused with an
 *    {@link OctopusPrefilledPostTooManyImagesError}.
 *
 * Both are thrown synchronously by {@link openUI} and {@link OctopusUIView}, like their other
 * `initialScreen` checks, and become a rejection of {@link navigateToOctopusCreatePost}.
 */
export interface OctopusPrefilledPost {
  /** Prefilled post text. */
  text?: string;
  /**
   * The images the editor opens with, in display order, at most
   * {@link OCTOPUS_POST_MAX_IMAGE_COUNT}. Each entry is a bundled resource name or a `file://`
   * URI — see above. Blank entries are dropped, and so is an entry that resolves to no image.
   */
  imageUris?: readonly string[];
  /**
   * A single image: a bundled resource name or a `file://` URI — see above. Same as
   * `imageUris: [imageUri]`; cannot be set together with a non-empty `imageUris`.
   *
   * @deprecated Use imageUris.
   */
  imageUri?: string;
  /** The topic (group) the post is created into. */
  topicId?: string;
  /** A call-to-action button attached to the post. */
  cta?: OctopusPostCTA;
}
