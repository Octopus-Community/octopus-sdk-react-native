[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusGamification

# Interface: OctopusGamification

A user's gamification standing in the community.

Present only when gamification is enabled for the community.

## Properties

### level

> **level**: `number`

The user's gamification level index.

---

### score

> **score**: `number` \| `null`

The user's gamification score (points). Available to back-office consumers only; `null` for
regular consumers, as the backend does not expose it on public profiles today.
