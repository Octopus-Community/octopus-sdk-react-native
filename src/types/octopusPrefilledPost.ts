/**
 * A call-to-action button attached to a prefilled post draft.
 */
export interface OctopusPostCTA {
  /** The URL opened when the CTA is tapped. Must not be blank. */
  url: string;
  /** The CTA's label. Must not be blank after trimming. */
  label: string;
}

/**
 * Prefills the post-creation editor opened by {@link navigateToOctopusCreatePost}.
 *
 * Every field is optional and independently validated by the native SDK before the editor
 * opens; see {@link NavigateToOctopusCreatePostErrorCode} for the failure codes a bad value can
 * produce.
 *
 * `imageUri` accepts either:
 *  - a bare name with no scheme, resolved as a bundled native image resource (an Android
 *    drawable resource / an iOS asset-catalog image with that name) — this is how the QA
 *    scenario's "bundled image" presets work, since neither native SDK fetches remote URLs for
 *    this field;
 *  - a `file://` URI pointing at a local file already on device.
 */
export interface OctopusPrefilledPost {
  /** Prefilled post text. */
  text?: string;
  /** A bundled resource name or a `file://` URI — see above. */
  imageUri?: string;
  /** The topic (group) the post is created into. */
  topicId?: string;
  /** A call-to-action button attached to the post. */
  cta?: OctopusPostCTA;
}
