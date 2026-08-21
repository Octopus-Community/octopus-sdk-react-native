/**
 * Reason a {@link setReaction} call was refused, carried as the `code` of the rejected error.
 *
 * | Code | Meaning | Emitted on |
 * |---|---|---|
 * | `UNKNOWN_REACTION` | The reaction kind is not one of the values {@link OctopusReactionKind} lists. | Android, iOS |
 * | `POST_NOT_FOUND` | The post id does not exist, or the current user has no read access to it. | Android, iOS |
 * | `NO_NETWORK` | No network connection was available. Retryable. | Android, iOS |
 * | `NOT_CONNECTED` | No user is connected (or the backend refused the call as unauthenticated / unauthorised). | Android, iOS |
 * | `SERVER_ERROR` | The Octopus backend answered with an error. | Android, iOS |
 * | `SET_REACTION_ERROR` | Anything else, including an unclassified native failure. | Android, iOS |
 *
 * @see {@link SetReactionError} – the shape of the rejected error.
 * @see {@link isSetReactionError} – narrow an unknown caught value.
 */
export type SetReactionErrorCode =
  | 'UNKNOWN_REACTION'
  | 'POST_NOT_FOUND'
  | 'NO_NETWORK'
  | 'NOT_CONNECTED'
  | 'SERVER_ERROR'
  | 'SET_REACTION_ERROR';

/**
 * The error {@link setReaction} rejects with when the native SDK refuses the call.
 */
export interface SetReactionError extends Error {
  /**
   * Why the call was refused. See {@link SetReactionErrorCode}.
   *
   * Typed as an open string on purpose: a native SDK upgrade may introduce a code this version
   * does not list yet. Compare against {@link SetReactionErrorCode} values and keep a default
   * branch.
   */
  readonly code: SetReactionErrorCode | (string & {});
}

/**
 * Narrows a value caught from {@link setReaction} to a {@link SetReactionError}.
 *
 * @param error - The value caught from a rejected `setReaction` call.
 * @returns Whether `error` carries a set-reaction failure code.
 *
 * @example
 * ```typescript
 * try {
 *   await setReaction(postId, 'heart');
 * } catch (error) {
 *   if (isSetReactionError(error) && error.code === 'POST_NOT_FOUND') {
 *     // the post was deleted or is no longer visible
 *   }
 * }
 * ```
 */
export function isSetReactionError(error: unknown): error is SetReactionError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  );
}
