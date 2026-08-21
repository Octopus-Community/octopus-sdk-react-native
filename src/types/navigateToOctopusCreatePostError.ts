/**
 * Reason a {@link navigateToOctopusCreatePost} call was refused, carried as the `code` of the
 * rejected error. Every one of these is a synchronous validation failure on the
 * {@link OctopusPrefilledPost} passed in — the editor never opens.
 *
 * | Code | Meaning | Emitted on |
 * |---|---|---|
 * | `TEXT_TOO_SHORT` | `text` is shorter than the minimum post length. | Android, iOS |
 * | `TEXT_TOO_LONG` | `text` is longer than the maximum post length. | Android, iOS |
 * | `CTA_LABEL_EMPTY` | `cta.label` is blank. | Android, iOS |
 * | `CTA_URL_EMPTY` | `cta.url` is blank. | Android, iOS |
 * | `IMAGE_INVALID` | `imageUri` could not be decoded as an image. | iOS |
 * | `IMAGE_TOO_SMALL` | The decoded image is below the minimum size. | iOS |
 * | `IMAGE_RATIO_TOO_LARGE` | The decoded image's aspect ratio is outside the allowed range. | iOS |
 * | `NAVIGATE_TO_CREATE_POST_ERROR` | Anything else, including an unresolved `imageUri`. | Android, iOS |
 *
 * Android defers image-dimension validation to the editor itself (it opens, then reports issues
 * inside the picture-editing flow) rather than at construction time, so `IMAGE_INVALID` /
 * `IMAGE_TOO_SMALL` / `IMAGE_RATIO_TOO_LARGE` are iOS-only outcomes of this call — a bad bundled
 * image on Android surfaces once the editor is already open, not as a rejection here.
 */
export type NavigateToOctopusCreatePostErrorCode =
  | 'TEXT_TOO_SHORT'
  | 'TEXT_TOO_LONG'
  | 'CTA_LABEL_EMPTY'
  | 'CTA_URL_EMPTY'
  | 'IMAGE_INVALID'
  | 'IMAGE_TOO_SMALL'
  | 'IMAGE_RATIO_TOO_LARGE'
  | 'NAVIGATE_TO_CREATE_POST_ERROR';

/**
 * The error {@link navigateToOctopusCreatePost} rejects with when the prefilled post is invalid.
 */
export interface NavigateToOctopusCreatePostError extends Error {
  readonly code: NavigateToOctopusCreatePostErrorCode | (string & {});
}

/**
 * Narrows a value caught from {@link navigateToOctopusCreatePost} to a
 * {@link NavigateToOctopusCreatePostError}.
 */
export function isNavigateToOctopusCreatePostError(
  error: unknown
): error is NavigateToOctopusCreatePostError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  );
}
