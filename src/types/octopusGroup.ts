/**
 * A group (content category) in the Octopus community.
 *
 * Exposed via {@link addGroupsListener} / {@link getGroups}. Mirrors the native `OctopusGroup`'s
 * public surface (Android + iOS). This is the **lean** consumer model — only the fields exposed
 * on both native platforms are surfaced; richer Android-only fields (description, custom action,
 * status, …) are intentionally omitted until they are available on every platform. Future fields
 * are **additive only**.
 */
export interface OctopusGroup {
  /** Stable group identifier. */
  id: string;
  /** Display name of the group. */
  name: string;
  /** Whether the connected user currently follows this group. */
  isFollowed: boolean;
  /**
   * Whether the connected user can change their follow status. `false` for essential
   * force-followed (or force-not-followed) groups controlled by community admins.
   */
  canChangeFollowStatus: boolean;
  /**
   * Whether the connected user has access to this group. `true` for groups without an access
   * requirement, or when the user holds the required entitlement. When `false`, the group is
   * visible but locked (typically a premium/gated group).
   */
  canAccess: boolean;
  /**
   * Whether the connected user is allowed to create posts in this group. `false` when the group
   * is admin-only or otherwise gates post creation.
   */
  canCreateChildren: boolean;
}
