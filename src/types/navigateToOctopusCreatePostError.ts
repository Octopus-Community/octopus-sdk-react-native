/**
 * Reason a {@link navigateToOctopusCreatePost} call (or an `openUI` `createPost` initial screen)
 * was refused, carried as the `code` of the rejected error. Every one of these is a synchronous validation failure on the
 * {@link OctopusPrefilledPost} passed in — the editor never opens.
 *
 * | Code | Meaning | Emitted on |
 * |---|---|---|
 * | `TEXT_TOO_SHORT` | `text` is shorter than the native SDK's minimum post length. That minimum is one visible character from native 1.16 (it was 10 before): the code is kept for exhaustive switches and is not expected any more. | Android, iOS |
 * | `TEXT_TOO_LONG` | `text` is longer than the maximum post length. | Android, iOS |
 * | `CTA_LABEL_EMPTY` | `cta.label` or the text of an auto-translated `cta.localizedLabel` is blank, or the CTA has no label. A blank text of a per-language `cta.localizedLabel` is `LOCALIZED_TEXT_BLANK_TEXT`. | Android, iOS |
 * | `CTA_URL_EMPTY` | `cta.url` is blank. | Android, iOS |
 * | `IMAGE_INVALID` | An `imageUris` entry (or the deprecated `imageUri`) could not be decoded as an image; the first failing one is reported. | iOS |
 * | `IMAGE_TOO_SMALL` | A decoded image is below the minimum size. | iOS |
 * | `IMAGE_RATIO_TOO_LARGE` | A decoded image's aspect ratio is outside the allowed range. | iOS |
 * | `LOCALIZED_TEXT_EMPTY_TEXTS` | `cta.localizedLabel` is per language and gives no text. | Android, iOS |
 * | `LOCALIZED_TEXT_BLANK_TEXT` | A text of a per-language `cta.localizedLabel` is blank; `languageCode` names its language. | Android, iOS |
 * | `LOCALIZED_TEXT_EMPTY_LANGUAGE` | A language of a per-language `cta.localizedLabel` has no language part. | Android, iOS |
 * | `LOCALIZED_TEXT_DUPLICATE_LANGUAGE` | Two languages of a per-language `cta.localizedLabel` give the same code; `languageCode` names it. | Android, iOS |
 * | `LOCALIZED_TEXT_DEFAULT_LANGUAGE_MISSING` | The default language of a per-language `cta.localizedLabel` is not one of its languages; `languageCode` names it. | Android, iOS |
 * | `NAVIGATE_TO_CREATE_POST_ERROR` | Anything else. | Android, iOS |
 *
 * An entry that resolves to no file or bundled resource is not an error: it is dropped, and the
 * editor opens without it. Too many images and `imageUri` set together with `imageUris` are
 * refused before the native call, with errors that carry no code — see
 * {@link OctopusPrefilledPostTooManyImagesError}.
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
  | 'LOCALIZED_TEXT_EMPTY_TEXTS'
  | 'LOCALIZED_TEXT_BLANK_TEXT'
  | 'LOCALIZED_TEXT_EMPTY_LANGUAGE'
  | 'LOCALIZED_TEXT_DUPLICATE_LANGUAGE'
  | 'LOCALIZED_TEXT_DEFAULT_LANGUAGE_MISSING'
  | 'NAVIGATE_TO_CREATE_POST_ERROR';

/**
 * The error {@link navigateToOctopusCreatePost} rejects with when the prefilled post is invalid.
 */
export interface NavigateToOctopusCreatePostError extends Error {
  readonly code: NavigateToOctopusCreatePostErrorCode | (string & {});
  /**
   * The code of the language at fault (`'en'`, `'pt-BR'`), for `LOCALIZED_TEXT_BLANK_TEXT`,
   * `LOCALIZED_TEXT_DUPLICATE_LANGUAGE` and `LOCALIZED_TEXT_DEFAULT_LANGUAGE_MISSING`. It is the
   * code the native SDK built from your language tag, so its case may differ from what you
   * wrote. Absent for every other code.
   */
  readonly languageCode?: string;
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
