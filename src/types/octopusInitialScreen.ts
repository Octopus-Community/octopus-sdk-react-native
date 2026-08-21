import type { CommunityDataMemberId } from './octopusCommunityData';
import type { OctopusPrefilledPost } from './octopusPrefilledPost';

/**
 * The initial screen the Octopus UI opens on, passed as `initialScreen` to
 * {@link openUI}.
 *
 * Mirrors the iOS `OctopusInitialScreen` enum (and the Flutter sealed class of
 * the same name), as a discriminated union on `type`:
 *
 * - `mainFeed` — the community main feed with the feed selector. Same as
 *   omitting `initialScreen` entirely.
 * - `post` — a specific post's detail screen (bridge mode).
 * - `group` — a specific group's feed (bridge mode).
 * - `activity` — the posts-only screen listing one member's Octopus posts
 *   (Unified Profile). See {@link OctopusInitialScreenActivity.member}.
 * - `profile` — one member's Octopus profile, or — with `clientUserId`
 *   omitted — the connected user's own, editable profile.
 * - `createPost` — the post editor, optionally prefilled. Equivalent to
 *   {@link navigateToOctopusCreatePost}, which remains the ergonomic shorthand.
 *
 * A tapped `notification` passed to {@link openUI} always wins over
 * `initialScreen`: when both are provided the deep link is followed and the
 * initial screen is dropped with a warning.
 */
export type OctopusInitialScreen =
  | OctopusInitialScreenMainFeed
  | OctopusInitialScreenPost
  | OctopusInitialScreenGroup
  | OctopusInitialScreenActivity
  | OctopusInitialScreenProfile
  | OctopusInitialScreenCreatePost;

/** The community main feed — the default when `initialScreen` is omitted. */
export interface OctopusInitialScreenMainFeed {
  type: 'mainFeed';
}

/**
 * A specific post's detail screen (bridge mode): the user lands directly on
 * the post and dismissing it returns to the host app.
 */
export interface OctopusInitialScreenPost {
  type: 'post';
  /** The id of the post to display. Must be non-blank; surrounding whitespace is trimmed. */
  postId: string;
}

/**
 * A specific group's feed (bridge mode). Same dismissal semantics as `post`.
 */
export interface OctopusInitialScreenGroup {
  type: 'group';
  /** The id of the group to display. Must be non-blank; surrounding whitespace is trimmed. */
  groupId: string;
}

/**
 * The posts-only screen listing one member's Octopus posts (Unified Profile).
 *
 * Open it from your own profile screen — typically the one you show after
 * intercepting a profile tap via `interceptProfileTaps` +
 * {@link addNavigateToProfileListener} — to surface that member's Octopus
 * posts.
 */
export interface OctopusInitialScreenActivity {
  type: 'activity';
  /**
   * The member whose posts to display. Exactly one of `clientUserId` (your
   * app's own id for the member, as passed to {@link connectUser}) or
   * `profileId` (their Octopus profile id, e.g. from
   * {@link fetchCommunityData}) must be set — same contract as
   * {@link fetchCommunityData}.
   *
   * A `clientUserId` is resolved through the SDK's client-user-id lookup, so
   * it requires the community to expose client user ids; a `profileId` opens
   * directly with no lookup. An id that does not resolve shows the screen's
   * empty state — it never falls back to another member. When the id resolves
   * to the connected user's own, their two-tab activity screen opens instead.
   */
  member: CommunityDataMemberId;
}

/**
 * A member's Octopus profile, or — with `clientUserId` omitted — the
 * connected user's own, editable profile.
 */
export interface OctopusInitialScreenProfile {
  type: 'profile';
  /**
   * Your app's own id for the member whose profile to display (the id passed
   * to {@link connectUser}), resolved through the SDK's client-user-id lookup
   * (requires the community to expose client user ids). An id that does not
   * resolve shows an error / unavailable state — it never falls back to the
   * connected user's own profile.
   *
   * Omit it — or pass a blank / whitespace-only string, which counts as no id
   * at all — for the connected user's **own** profile, with its edit
   * affordances (the `editUser` event fires your edit flow).
   *
   * There is deliberately no Octopus-profile-id variant: the iOS native
   * profile screen has no such form. Holding only an Octopus id, open the
   * member's posts instead with `{ type: 'activity', member: { profileId } }`.
   */
  clientUserId?: string;
}

/**
 * The post editor as the initial screen, optionally prefilled with content
 * supplied by the host app.
 *
 * {@link navigateToOctopusCreatePost} is the ergonomic shorthand for this
 * case; both reject with the same {@link NavigateToOctopusCreatePostError}
 * codes when the prefill fails native validation.
 */
export interface OctopusInitialScreenCreatePost {
  type: 'createPost';
  /** Fields to prefill the editor with. Omit for a blank draft. */
  prefilledPost?: OctopusPrefilledPost;
}
