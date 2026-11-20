[**@octopus-community/react-native v1.16.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusGamification

# Interface: OctopusGamification

A user's gamification standing in the community.

Present only when gamification is enabled for the community and the profile
is not tagged as an admin.

## Properties

### level

> **level**: `number`

The user's gamification level index.

---

### score

> **score**: `number` \| `null`

The member's total points on Android and iOS with native SDK 1.16.0.
A total of zero is returned as `0`. The score is `null` when the server
omits the total.
