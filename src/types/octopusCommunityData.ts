/**
 * A user's gamification standing in the community.
 *
 * Present only when gamification is enabled for the community.
 */
export interface OctopusGamification {
  /** The user's gamification level index. */
  level: number;
  /**
   * The user's gamification score (points). Available to back-office consumers only; `null` for
   * regular consumers, as the backend does not expose it on public profiles today.
   */
  score: number | null;
}

/**
 * Read-only snapshot of a user's public activity inside the Octopus community.
 *
 * This is a dedicated, additive type — not an extension of the SDK's profile type — so a host
 * app can surface community stats (message count, gamification) inside its own profile screen
 * without adopting the Octopus profile UI.
 *
 * Note the naming asymmetry with the native SDKs: Android names this id `userId`, iOS names it
 * `profileId`. This wrapper follows the Flutter wrapper's precedent and names it `profileId`.
 *
 * @see {@link fetchCommunityData} – one-shot refresh.
 * @see {@link startObservingCommunityData} / {@link addCommunityDataListener} – reactive updates.
 */
export interface OctopusCommunityData {
  /** The Octopus id of the user this data describes. */
  profileId: string;
  /** The user's aggregate message count in the community, or `null` when unavailable. */
  messageCount: number | null;
  /** The user's gamification standing, or `null` when gamification is disabled. */
  gamification: OctopusGamification | null;
}

/**
 * Identifies the member to look up for {@link fetchCommunityData} and
 * {@link startObservingCommunityData}: exactly one of `profileId` (the Octopus id) or
 * `clientUserId` (your own id for that member) must be provided.
 */
export interface CommunityDataMemberId {
  /** The Octopus id of the member (as returned in a previous community-data read). */
  profileId?: string;
  /** Your own id for the member, as passed to {@link connectUser}. */
  clientUserId?: string;
}
