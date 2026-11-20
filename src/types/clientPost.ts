import type { OctopusLocalizedText } from './octopusLocalizedText';

/**
 * A local image to attach to a {@link ClientPost}.
 *
 * `uri` follows the same convention as the entries of {@link OctopusPrefilledPost}'s `imageUris`:
 * a bare name with no scheme is looked up as a bundled native image resource (Android `res/drawable`, iOS
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
 * An image attached to a {@link ClientPost} — either bundled/local, or web-hosted.
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
  /** The post text: at least one visible character, at most 5000 characters. */
  readonly text: string;
  /**
   * The images of the post, in display order, at most {@link OCTOPUS_POST_MAX_IMAGE_COUNT}.
   * More is refused by the native SDK with `CLIENT_POST_ERROR`, before the post is created.
   * Cannot be set together with `attachment`: {@link fetchOrCreateClientObjectRelatedPost} then
   * rejects with `INVALID_ARGS`, before any native call.
   */
  readonly medias?: readonly OctopusClientPostAttachment[] | null;
  /**
   * A single image. Same as `medias: [attachment]`; cannot be set together with a non-empty
   * `medias`.
   *
   * @deprecated Use medias.
   */
  readonly attachment?: OctopusClientPostAttachment | null;
  /**
   * A short line displayed in bold below the text, e.g. "What do you think about this?".
   * Must be under 84 characters — 6 to 38 is the recommended range. Omitted means not shown.
   */
  readonly catchPhrase?: string | null;
  /**
   * The label of the button that takes the user back to your object, translated automatically
   * by Octopus. Must be under 28 characters — 4 to 28 is the recommended range. Omitted means
   * no button, and {@link setNavigateToClientObjectCallback} then never fires for this post.
   *
   * @deprecated Use viewObjectButton, with `OctopusLocalizedText.autoTranslated(text)` to keep
   * the automatic translation.
   */
  readonly viewObjectButtonText?: string | null;
  /**
   * The label of the button that takes the user back to your object:
   * {@link OctopusLocalizedText.perLanguage} to give it in each language of your app,
   * {@link OctopusLocalizedText.autoTranslated} to let Octopus translate one label. Omitted
   * means no button, and {@link setNavigateToClientObjectCallback} then never fires for this
   * post.
   *
   * Keep each label under 28 characters so that it fits on one line: a longer one is accepted,
   * and the button can then take several lines. Like the rest of the content, it is taken when
   * the post is created only: a post that already exists for `objectId` keeps its button.
   *
   * A per-language label that breaks one of the rules listed on {@link OctopusLocalizedText} is
   * refused with the matching `LOCALIZED_TEXT_…` {@link ClientPostErrorCode}, before the post is
   * created. Cannot be set together with `viewObjectButtonText`:
   * {@link fetchOrCreateClientObjectRelatedPost} then rejects with `INVALID_ARGS`, before any
   * native call.
   */
  readonly viewObjectButton?: OctopusLocalizedText | null;
  /**
   * The group to publish into. Omitted means the default group configured for your community
   * with the Octopus team.
   */
  readonly groupId?: string | null;
}
