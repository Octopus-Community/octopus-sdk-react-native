/**
 * A local image to attach to a {@link ClientPost}.
 *
 * `uri` follows the same convention as {@link OctopusPrefilledPost}'s `imageUri`: a bare name
 * with no scheme is looked up as a bundled native image resource (Android `res/drawable`, iOS
 * asset catalog / bundle), anything else is treated as a `file://` URI.
 *
 * An image is **never silently dropped**, because the post is created once and never
 * rewritten — a missing image would be permanent and invisible to you. Failures are reported
 * as a typed {@link ClientPostError}, in two stages:
 *
 * - A `uri` that resolves to nothing here — blank, a non-`file:` scheme, a bundled name no
 *   such resource matches — is refused by the bridge with `INVALID_ARGS`, before any post is
 *   created.
 * - A file that resolves but the native SDK rejects — empty, oversized, unsupported format,
 *   upload failure — comes back as `FILE_EMPTY` / `FILE_TOO_LARGE` / `FILE_BAD_FORMAT` /
 *   `FILE_UPLOAD` on Android, and as `CLIENT_POST_ERROR` on iOS.
 *
 * Only `file:` URIs are read. To attach a web image use {@link OctopusRemoteImageAttachment},
 * which the native SDK downloads on its own schedule; passing an `https:` URL as a
 * `localImage` `uri` is refused rather than fetched synchronously.
 */
export interface OctopusLocalImageAttachment {
  readonly type: 'localImage';
  /** A `file://` URI, or the bare name of an image bundled with the host app. */
  readonly uri: string;
}

/**
 * A web-hosted image to attach to a {@link ClientPost}. The URL must point at the image file
 * itself, not at a page embedding it.
 */
export interface OctopusRemoteImageAttachment {
  readonly type: 'remoteImage';
  /** Direct URL of the image file. */
  readonly url: string;
}

/**
 * The image attached to a {@link ClientPost} — either bundled/local, or web-hosted.
 */
export type OctopusClientPostAttachment =
  | OctopusLocalImageAttachment
  | OctopusRemoteImageAttachment;

/**
 * The content of a post linked to one of your own objects (an article, a product, a recipe…).
 *
 * Passed to {@link fetchOrCreateClientObjectRelatedPost}, which creates the post the first time
 * and returns the existing one afterwards. **The content is only used when the post does not
 * exist yet**: editing these fields never rewrites a post that was already created.
 */
export interface ClientPost {
  /**
   * The id that uniquely identifies your object. It is what
   * {@link fetchOrCreateClientObjectRelatedPost} and
   * {@link addClientObjectRelatedPostListener} look the post up by, and what
   * {@link setNavigateToClientObjectCallback} receives when the user taps the post's button.
   */
  readonly objectId: string;
  /** The post text. Must be between 10 and 5000 characters. */
  readonly text: string;
  /** Optional image. */
  readonly attachment?: OctopusClientPostAttachment | null;
  /**
   * A short line displayed in bold below the text, e.g. "What do you think about this?".
   * Must be under 84 characters — 6 to 38 is the recommended range. Omitted means not shown.
   */
  readonly catchPhrase?: string | null;
  /**
   * The label of the button that takes the user back to your object. Must be under 28
   * characters — 4 to 28 is the recommended range. Omitted means no button, and
   * {@link setNavigateToClientObjectCallback} then never fires for this post.
   */
  readonly viewObjectButtonText?: string | null;
  /**
   * The group to publish into. Omitted means the default group configured for your community
   * with the Octopus team.
   */
  readonly groupId?: string | null;
}
