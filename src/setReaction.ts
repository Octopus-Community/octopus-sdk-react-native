import { OctopusReactNativeSdk } from './internals/nativeModule';
import type { OctopusReactionKind } from './types/octopusReactionKind';

/**
 * Applies or removes the current user's reaction on a post.
 *
 * Passing `null` removes the current user's active reaction. Calling with `null` when no
 * reaction is currently set is a silent no-op. Setting the same reaction twice is idempotent.
 *
 * @param postId - The id of the post to react on.
 * @param reaction - The reaction to set, or `null` to remove the current reaction.
 * @returns A promise that resolves when the reaction has been applied.
 * @throws A {@link SetReactionError} — see {@link isSetReactionError} to narrow it.
 *
 * @example
 * ```typescript
 * try {
 *   await setReaction(postId, 'heart');
 * } catch (error) {
 *   if (isSetReactionError(error)) {
 *     console.warn(`setReaction failed — ${error.code}: ${error.message}`);
 *   }
 * }
 * ```
 */
export function setReaction(
  postId: string,
  reaction: OctopusReactionKind | null
): Promise<void> {
  return OctopusReactNativeSdk.setReaction(postId, reaction);
}
