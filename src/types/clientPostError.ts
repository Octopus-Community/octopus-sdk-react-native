/**
 * Reason a client-object bridge call was refused, carried as the `code` of the rejected
 * error.
 *
 * The first sixteen codes are content/validation failures produced by the native
 * `ClientPostError` hierarchy, and the five `LOCALIZED_TEXT_…` ones the native
 * `OctopusLocalizedText` validation of {@link ClientPost.viewObjectButton} raises. Those five
 * are raised before the post is created, the same on both platforms. Then come the connection-level outcomes both bridges flatten
 * into the same rejection, following the {@link SetReactionErrorCode} precedent, and finally
 * the two the bridge raises itself: `INVALID_ARGS`, and the one code that belongs to
 * {@link addClientObjectRelatedPostListener} rather than to
 * {@link fetchOrCreateClientObjectRelatedPost}.
 *
 * | Code | Meaning | Emitted on |
 * |---|---|---|
 * | `TEXT_MISSING` | The post text is missing or empty. | Android |
 * | `TEXT_TOO_LONG` | The post text exceeds the maximum character limit (5000). | Android |
 * | `FILE_EMPTY` | The attached image file is empty. | Android |
 * | `FILE_TOO_LARGE` | The attached image exceeds the maximum allowed size. | Android |
 * | `FILE_BAD_FORMAT` | The attached image format is unsupported or the file is corrupted. | Android |
 * | `FILE_UPLOAD` | Uploading the attached image failed. | Android |
 * | `FILE_DOWNLOAD` | Downloading the remote image failed. | Android |
 * | `MISSING_OBJECT_ID` | `objectId` is missing or empty. | Android |
 * | `MISSING_CTA` | `viewObjectButtonText` is required for this community and was not supplied. | Android |
 * | `POST_UNAVAILABLE` | The post exists but is unavailable — moderated, or deleted. | Android |
 * | `POST_NOT_FOUND` | No post exists yet for this object and it could not be created. | Android |
 * | `POST_ALREADY_EXISTS` | A post already exists for this object. | Android |
 * | `INVALID_GROUP_ID` | `groupId` does not match a group of your community. | Android |
 * | `INVALID_AUTHOR` | The connected user is not authorised to create posts for this object. | Android |
 * | `TOKEN_INVALID` | The bridge signature returned by your token provider is invalid or malformed. | Android |
 * | `TOKEN_EXPIRED` | The bridge signature returned by your token provider has expired. | Android |
 * | `LOCALIZED_TEXT_EMPTY_TEXTS` | `viewObjectButton` is per language and gives no text. | Android, iOS |
 * | `LOCALIZED_TEXT_BLANK_TEXT` | A text of a per-language `viewObjectButton` is blank; `languageCode` names its language. | Android, iOS |
 * | `LOCALIZED_TEXT_EMPTY_LANGUAGE` | A language of a per-language `viewObjectButton` has no language part. | Android, iOS |
 * | `LOCALIZED_TEXT_DUPLICATE_LANGUAGE` | Two languages of a per-language `viewObjectButton` give the same code; `languageCode` names it. | Android, iOS |
 * | `LOCALIZED_TEXT_DEFAULT_LANGUAGE_MISSING` | The default language of a per-language `viewObjectButton` is not one of its languages; `languageCode` names it. | Android, iOS |
 * | `NO_NETWORK` | No network connection was available. Retryable. | Android, iOS |
 * | `NOT_CONNECTED` | No user is connected, or the backend refused the call as unauthenticated / unauthorised. | Android |
 * | `SERVER_ERROR` | The Octopus backend answered with an error. | Android, iOS |
 * | `CLIENT_POST_ERROR` | Anything else, including more than {@link OCTOPUS_POST_MAX_IMAGE_COUNT} `medias` and every failure iOS does not classify. | Android, iOS |
 * | `INVALID_ARGS` | The `clientPost` argument is unusable — `objectId` or `text` missing or blank, an `attachment` or a `medias` entry that resolves to no image, both `attachment` and `medias` set, both `viewObjectButtonText` and `viewObjectButton` set, or a `viewObjectButton` that is not an {@link OctopusLocalizedText}. Rejected by the bridge before the native SDK is called, so no post is created. | Android, iOS |
 * | `START_OBSERVING_CLIENT_OBJECT_POST_ERROR` | {@link addClientObjectRelatedPostListener} could not start its observation — in practice, `initialize()` has not run yet. Not produced by {@link fetchOrCreateClientObjectRelatedPost}. | Android, iOS |
 *
 * ## Why the "Emitted on" column is lopsided
 *
 * The two native SDKs do not expose the same amount of detail, and this wrapper reports what
 * each one actually gives rather than inventing a classification.
 *
 * - **Android** returns the full `ClientPostError` hierarchy — 21 leaf types, which the bridge
 *   folds onto the 16 content codes above (the four `…Unknown` leaves and `OtherError` all
 *   collapse to `CLIENT_POST_ERROR`, exactly as the Flutter plugin folds them onto its `other`
 *   wire tag).
 * - **iOS** publishes only four `ClientPostError` cases, and the fields of its
 *   `ValidationError` are not public — only a debug description is reachable. So every
 *   validation failure surfaces as `CLIENT_POST_ERROR` with the native description as its
 *   message, and only `NO_NETWORK` / `SERVER_ERROR` / `CLIENT_POST_ERROR` are ever produced.
 *
 * Write the `catch` against `CLIENT_POST_ERROR` as the always-possible outcome, and treat the
 * fine-grained codes as extra information you get on Android.
 *
 * @see {@link ClientPostError} – the shape of the rejected error.
 * @see {@link isClientPostError} – narrow an unknown caught value.
 */
export type ClientPostErrorCode =
  | 'TEXT_MISSING'
  | 'TEXT_TOO_LONG'
  | 'FILE_EMPTY'
  | 'FILE_TOO_LARGE'
  | 'FILE_BAD_FORMAT'
  | 'FILE_UPLOAD'
  | 'FILE_DOWNLOAD'
  | 'MISSING_OBJECT_ID'
  | 'MISSING_CTA'
  | 'POST_UNAVAILABLE'
  | 'POST_NOT_FOUND'
  | 'POST_ALREADY_EXISTS'
  | 'INVALID_GROUP_ID'
  | 'INVALID_AUTHOR'
  | 'TOKEN_INVALID'
  | 'TOKEN_EXPIRED'
  | 'LOCALIZED_TEXT_EMPTY_TEXTS'
  | 'LOCALIZED_TEXT_BLANK_TEXT'
  | 'LOCALIZED_TEXT_EMPTY_LANGUAGE'
  | 'LOCALIZED_TEXT_DUPLICATE_LANGUAGE'
  | 'LOCALIZED_TEXT_DEFAULT_LANGUAGE_MISSING'
  | 'NO_NETWORK'
  | 'NOT_CONNECTED'
  | 'SERVER_ERROR'
  | 'CLIENT_POST_ERROR'
  | 'INVALID_ARGS'
  | 'START_OBSERVING_CLIENT_OBJECT_POST_ERROR';

/**
 * The error {@link fetchOrCreateClientObjectRelatedPost} rejects with when the native SDK
 * refuses the call.
 */
export interface ClientPostError extends Error {
  /**
   * Why the call was refused. See {@link ClientPostErrorCode}.
   *
   * Typed as an open string on purpose: a native SDK upgrade may introduce a code this
   * version does not list yet. Compare against {@link ClientPostErrorCode} values and keep a
   * default branch.
   */
  readonly code: ClientPostErrorCode | (string & {});
  /**
   * The code of the language at fault (`'en'`, `'pt-BR'`), for `LOCALIZED_TEXT_BLANK_TEXT`,
   * `LOCALIZED_TEXT_DUPLICATE_LANGUAGE` and `LOCALIZED_TEXT_DEFAULT_LANGUAGE_MISSING`. It is the
   * code the native SDK built from your language tag, so its case may differ from what you
   * wrote. Absent for every other code.
   */
  readonly languageCode?: string;
}

/**
 * Narrows a value caught from {@link fetchOrCreateClientObjectRelatedPost} to a
 * {@link ClientPostError}.
 *
 * @param error - The value caught from a rejected `fetchOrCreateClientObjectRelatedPost` call.
 * @returns Whether `error` carries a client-post failure code.
 *
 * @example
 * ```typescript
 * try {
 *   const post = await fetchOrCreateClientObjectRelatedPost({ objectId, text });
 * } catch (error) {
 *   if (isClientPostError(error) && error.code === 'NO_NETWORK') {
 *     // retry later
 *   }
 * }
 * ```
 */
export function isClientPostError(error: unknown): error is ClientPostError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  );
}
