/**
 * The reason {@link overrideCommunityAccess} was rejected.
 *
 * | Code | Meaning | Emitted on |
 * |---|---|---|
 * | `OVERRIDE_ERROR` | The override could not be applied. Neither native SDK classifies this failure any further. | Android, iOS |
 *
 * @see {@link OverrideCommunityAccessError} – the shape of the rejected error.
 * @see {@link isOverrideCommunityAccessError} – narrow an unknown caught value.
 */
export type OverrideCommunityAccessErrorCode = 'OVERRIDE_ERROR';

/**
 * The error rejected by {@link overrideCommunityAccess}.
 *
 * The `code` type keeps room (`| (string & {})`) for a future native code that predates its
 * addition to {@link OverrideCommunityAccessErrorCode} on the consuming app's SDK version.
 */
export interface OverrideCommunityAccessError extends Error {
  readonly code: OverrideCommunityAccessErrorCode | (string & {});
}

/**
 * Narrows an unknown caught value to a {@link OverrideCommunityAccessError}.
 *
 * @example
 * ```typescript
 * try {
 *   await overrideCommunityAccess(true);
 * } catch (error) {
 *   if (isOverrideCommunityAccessError(error)) {
 *     console.warn(error.code);
 *   }
 * }
 * ```
 */
export function isOverrideCommunityAccessError(
  error: unknown
): error is OverrideCommunityAccessError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  );
}
