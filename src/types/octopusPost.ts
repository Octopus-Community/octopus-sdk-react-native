import type { OctopusReactionKind } from './octopusReactionKind';

/**
 * The number of reactions of a given kind on a post.
 *
 * Mirrors the native `OctopusReactionCount`. A reaction kind absent from
 * {@link OctopusPost.reactions} has a count of 0 — the native SDKs do not emit zero rows.
 */
export interface OctopusReactionCount {
  /**
   * The reaction this count is for.
   *
   * Typed as an open string rather than a bare {@link OctopusReactionKind}: both native SDKs
   * model an `unknown` reaction kind for a server value they do not recognise, and this is a
   * **read** surface, so a value outside the union can genuinely arrive here. Such a kind is
   * delivered as the **raw server value** (the emoji the newer server sent), falling back to
   * the literal `'unknown'` only when that value is blank — so the field is never empty and no
   * information is dropped. {@link OctopusReactionKind} itself stays closed because
   * {@link setReaction} is a write surface where an unknown kind is simply refused.
   */
  readonly reactionKind: OctopusReactionKind | (string & {});
  /** The number of reactions of {@link reactionKind}. */
  readonly count: number;
}

/**
 * A read-only view of an Octopus post.
 *
 * Returned by {@link fetchOrCreateClientObjectRelatedPost} and delivered by
 * {@link addClientObjectRelatedPostListener}. Use {@link id} to open the post in the embedded
 * UI, and {@link formatOctopusCompactCount} to render the counts the way the embedded feed
 * does.
 *
 * This is the **lean intersection** of the two native read interfaces — Android's
 * `OctopusPost` and iOS's `OctopusPost` both expose exactly these five members publicly.
 * Field names follow Android (the reference SDK): iOS calls {@link userReactionKind}
 * `userReaction` and {@link OctopusReactionCount.reactionKind} `reaction`.
 */
export interface OctopusPost {
  /** Id of the post. Pass it to the embedded UI to display the post. */
  readonly id: string;
  /** The reaction counts. A kind absent from this list has a count of 0. */
  readonly reactions: readonly OctopusReactionCount[];
  /** The overall number of **comments and replies** on this post. */
  readonly commentCount: number;
  /** The number of times this post has been viewed. */
  readonly viewCount: number;
  /** The connected user's reaction on this post, or `null` if they did not react. */
  readonly userReactionKind: OctopusReactionKind | (string & {}) | null;
}
