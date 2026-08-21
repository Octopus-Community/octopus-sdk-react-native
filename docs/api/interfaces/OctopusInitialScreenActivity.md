[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusInitialScreenActivity

# Interface: OctopusInitialScreenActivity

The posts-only screen listing one member's Octopus posts (Unified Profile).

Open it from your own profile screen — typically the one you show after
intercepting a profile tap via `interceptProfileTaps` +
[addNavigateToProfileListener](../functions/addNavigateToProfileListener.md) — to surface that member's Octopus
posts.

## Properties

### member

> **member**: [`CommunityDataMemberId`](CommunityDataMemberId.md)

The member whose posts to display. Exactly one of `clientUserId` (your
app's own id for the member, as passed to [connectUser](../functions/connectUser.md)) or
`profileId` (their Octopus profile id, e.g. from
[fetchCommunityData](../functions/fetchCommunityData.md)) must be set — same contract as
[fetchCommunityData](../functions/fetchCommunityData.md).

A `clientUserId` is resolved through the SDK's client-user-id lookup, so
it requires the community to expose client user ids; a `profileId` opens
directly with no lookup. An id that does not resolve shows the screen's
empty state — it never falls back to another member. When the id resolves
to the connected user's own, their two-tab activity screen opens instead.

---

### type

> **type**: `"activity"`
