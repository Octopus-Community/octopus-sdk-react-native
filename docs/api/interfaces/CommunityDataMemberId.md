[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / CommunityDataMemberId

# Interface: CommunityDataMemberId

Identifies the member to look up for [fetchCommunityData](../functions/fetchCommunityData.md) and
[startObservingCommunityData](../functions/startObservingCommunityData.md): exactly one of `profileId` (the Octopus id) or
`clientUserId` (your own id for that member) must be provided.

## Properties

### clientUserId?

> `optional` **clientUserId**: `string`

Your own id for the member, as passed to [connectUser](../functions/connectUser.md).

---

### profileId?

> `optional` **profileId**: `string`

The Octopus id of the member (as returned in a previous community-data read).
