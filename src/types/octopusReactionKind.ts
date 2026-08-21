/**
 * The reactions a member can leave on a post.
 *
 * Mirrors the native `OctopusReactionKind` values on both platforms (Android's
 * `OctopusReactionKind.{Heart,Joy,MouthOpen,Clap,Cry,Rage}` companion constants, iOS's
 * `OctopusReactionKind.{heart,joy,mouthOpen,clap,cry,rage}` enum cases) — this wrapper never
 * introduces its own reaction set.
 *
 * @see {@link setReaction} – apply or remove a reaction on a post.
 */
export type OctopusReactionKind =
  | 'heart'
  | 'joy'
  | 'mouthOpen'
  | 'clap'
  | 'cry'
  | 'rage';
