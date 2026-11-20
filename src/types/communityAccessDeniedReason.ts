/**
 * Why the current user cannot access the community.
 *
 * Received through {@link addCommunityAccessDeniedReasonListener}, next to
 * {@link addHasAccessToCommunityListener}. When the access is denied, the Octopus UI displays a
 * dedicated screen for this reason in place of the community: your app has nothing to display.
 * Mirrors the native iOS `OctopusCommunityAccessDeniedReason` and Android
 * `CommunityAccessDeniedReason`.
 *
 * - `notInCohort`: the user is not part of the audience the community is opened to (for example,
 *   they are out of the A/B test cohort).
 * - `communityTemporarilyDisabled`: the community is disabled for a while. It is expected to come
 *   back.
 * - `communityClosed`: the community is closed.
 * - `memberExcluded`: the member is excluded from the community.
 * - `accountBanned`: the account of the member is banned. The details of the ban (the policy that
 *   was broken, who to contact) are displayed by the Octopus UI and are not exposed. `connectUser`
 *   keeps reporting a banned member as banned.
 * - `accountDeleted`: the account of the member has been deleted. Your app can disconnect the
 *   member on its side, with `disconnectUser`. The Octopus UI lets the member access the community
 *   again from its screen.
 * - `unknown`: the server gives no reason, or gives one that this version of the SDK does not
 *   know. A reason a newer native SDK adds is reported as `unknown`, so keep a default branch.
 */
export type CommunityAccessDeniedReason =
  | 'notInCohort'
  | 'communityTemporarilyDisabled'
  | 'communityClosed'
  | 'memberExcluded'
  | 'accountBanned'
  | 'accountDeleted'
  | 'unknown';
