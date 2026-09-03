[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusCommunityData

# Interface: OctopusCommunityData

Read-only snapshot of a user's public activity inside the Octopus community.

This is a dedicated, additive type — not an extension of the SDK's profile type — so a host
app can surface community stats (message count, gamification) inside its own profile screen
without adopting the Octopus profile UI.

Note the naming asymmetry with the native SDKs: Android names this id `userId`, iOS names it
`profileId`. This wrapper follows the Flutter wrapper's precedent and names it `profileId`.

## See

- [fetchCommunityData](../functions/fetchCommunityData.md) – one-shot refresh.
- [startObservingCommunityData](../functions/startObservingCommunityData.md) / [addCommunityDataListener](../functions/addCommunityDataListener.md) – reactive updates.

## Properties

### gamification

> **gamification**: [`OctopusGamification`](OctopusGamification.md) \| `null`

The user's gamification standing, or `null` when gamification is disabled.

---

### messageCount

> **messageCount**: `number` \| `null`

The user's aggregate message count in the community, or `null` when unavailable.

---

### profileId

> **profileId**: `string`

The Octopus id of the user this data describes.
