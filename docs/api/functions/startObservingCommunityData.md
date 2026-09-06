[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / startObservingCommunityData

# Function: startObservingCommunityData()

> **startObservingCommunityData**(`memberId`): `Promise`\<`void`\>

Starts a reactive observation of a member's community data. Updates are delivered through
[addCommunityDataListener](addCommunityDataListener.md); the current value (or `null` if the member is unknown) is
replayed as soon as it is known.

Only one observation is active at a time on this wrapper: starting a new one replaces
whichever member was previously being observed. Call [stopObservingCommunityData](stopObservingCommunityData.md) to
tear it down without starting another.

## Parameters

### memberId

[`CommunityDataMemberId`](../interfaces/CommunityDataMemberId.md)

Exactly one of `profileId` or `clientUserId` must be set.

## Returns

`Promise`\<`void`\>

## Throws

A plain `Error` synchronously when `memberId` carries both or neither id.

## See

[fetchCommunityData](fetchCommunityData.md) – the one-shot counterpart.

## Example

```typescript
const subscription = addCommunityDataListener((data) => {
  console.log('community data', data);
});
await startObservingCommunityData({ clientUserId: myOwnUserId });
// ...later
await stopObservingCommunityData();
subscription.remove();
```
