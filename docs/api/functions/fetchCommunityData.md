[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / fetchCommunityData

# Function: fetchCommunityData()

> **fetchCommunityData**(`memberId`): `Promise`\<[`OctopusCommunityData`](../interfaces/OctopusCommunityData.md) \| `null`\>

Fetches a one-shot refresh of a member's public Octopus stats (message count, gamification).

## Parameters

### memberId

[`CommunityDataMemberId`](../interfaces/CommunityDataMemberId.md)

Exactly one of `profileId` or `clientUserId` must be set.

## Returns

`Promise`\<[`OctopusCommunityData`](../interfaces/OctopusCommunityData.md) \| `null`\>

The member's community data, or `null` when the member is unknown.

## Throws

A plain `Error` synchronously when `memberId` carries both or neither id.

## See

[startObservingCommunityData](startObservingCommunityData.md) – the reactive counterpart.

## Example

```typescript
const data = await fetchCommunityData({ clientUserId: myOwnUserId });
```
