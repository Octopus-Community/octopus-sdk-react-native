/**
 * Thrown when an {@link OctopusPrefilledPost} carries more than
 * {@link OCTOPUS_POST_MAX_IMAGE_COUNT} images (blank entries are not counted).
 *
 * It is a separate error, not a {@link NavigateToOctopusCreatePostError}: it carries no `code`,
 * so {@link isNavigateToOctopusCreatePostError} returns `false` for it and an exhaustive `switch`
 * over {@link NavigateToOctopusCreatePostErrorCode} keeps compiling. Check it with `instanceof`.
 *
 * @example
 * ```typescript
 * try {
 *   await navigateToOctopusCreatePost({ text, imageUris: photos });
 * } catch (error) {
 *   if (error instanceof OctopusPrefilledPostTooManyImagesError) {
 *     // error.count photos were passed, at most error.max are accepted
 *   } else if (isNavigateToOctopusCreatePostError(error)) {
 *     // text, CTA or image problem, as before
 *   }
 * }
 * ```
 */
export class OctopusPrefilledPostTooManyImagesError extends Error {
  /** The maximum number of images a post carries. */
  readonly max: number;
  /** The number of non-blank images that were provided. */
  readonly count: number;

  /**
   * @param max - The maximum number of images a post carries.
   * @param count - The number of non-blank images that were provided.
   */
  constructor(max: number, count: number) {
    super(
      `OctopusPrefilledPostTooManyImagesError: ${count} images provided, at most ${max} are accepted.`
    );
    // Keeps `instanceof` working when the class is compiled down to ES5.
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'OctopusPrefilledPostTooManyImagesError';
    this.max = max;
    this.count = count;
  }
}
