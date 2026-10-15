/**
 * Per-content-type options governing what members may add when creating content.
 *
 * Every flag defaults to `true` when its sub-object (or the whole options object) is omitted.
 * Mirrors the native `CommunityConfig.ContentOptions` config type — see
 * {@link debugOverrideContentOptions}. This is a **debug-only** testing hatch: it does not exist
 * on a real production community config, which is set server-side.
 */
export interface ContentOptions {
  post?: {
    /** Whether a post may include a picture. Defaults to `true`. */
    enablePictures?: boolean;
    /** Whether a post may be a poll. Defaults to `true`. */
    enablePolls?: boolean;
    /**
     * Whether a post requires text. Defaults to `true`. When `false`, a post with an image
     * (with or without a poll) may omit text. A poll alone still requires text; native length
     * validation still applies whenever text is present.
     */
    textRequired?: boolean;
  };
  comment?: {
    /** Whether a comment may include a picture. Defaults to `true`. */
    enablePictures?: boolean;
  };
  reply?: {
    /** Whether a reply may include a picture. Defaults to `true`. */
    enablePictures?: boolean;
  };
}
