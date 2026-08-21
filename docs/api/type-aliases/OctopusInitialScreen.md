[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusInitialScreen

# Type Alias: OctopusInitialScreen

> **OctopusInitialScreen** = [`OctopusInitialScreenMainFeed`](../interfaces/OctopusInitialScreenMainFeed.md) \| [`OctopusInitialScreenPost`](../interfaces/OctopusInitialScreenPost.md) \| [`OctopusInitialScreenGroup`](../interfaces/OctopusInitialScreenGroup.md) \| [`OctopusInitialScreenActivity`](../interfaces/OctopusInitialScreenActivity.md) \| [`OctopusInitialScreenProfile`](../interfaces/OctopusInitialScreenProfile.md) \| [`OctopusInitialScreenCreatePost`](../interfaces/OctopusInitialScreenCreatePost.md)

The initial screen the Octopus UI opens on, passed as `initialScreen` to
[openUI](../functions/openUI.md).

Mirrors the iOS `OctopusInitialScreen` enum (and the Flutter sealed class of
the same name), as a discriminated union on `type`:

- `mainFeed` — the community main feed with the feed selector. Same as
  omitting `initialScreen` entirely.
- `post` — a specific post's detail screen (bridge mode).
- `group` — a specific group's feed (bridge mode).
- `activity` — the posts-only screen listing one member's Octopus posts
  (Unified Profile). See [OctopusInitialScreenActivity.member](../interfaces/OctopusInitialScreenActivity.md#member).
- `profile` — one member's Octopus profile, or — with `clientUserId`
  omitted — the connected user's own, editable profile.
- `createPost` — the post editor, optionally prefilled. Equivalent to
  [navigateToOctopusCreatePost](../functions/navigateToOctopusCreatePost.md), which remains the ergonomic shorthand.

A tapped `notification` passed to [openUI](../functions/openUI.md) always wins over
`initialScreen`: when both are provided the deep link is followed and the
initial screen is dropped with a warning.
