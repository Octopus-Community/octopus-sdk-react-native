[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / syncFollowGroups

# Function: syncFollowGroups()

> **syncFollowGroups**(`actions`): `Promise`\<[`SyncFollowGroupResult`](../type-aliases/SyncFollowGroupResult.md)[]\>

Batch follow/unfollow groups in a single round-trip. Each action carries
its own timestamp so the backend can reject stale actions. Match results
back to inputs by `groupId` — order is not guaranteed.

Requires a connected user. Rejects with a native error code on RPC failure
(`not_connected`, `no_network`, `server`, `other`).

An empty `actions` list short-circuits to `[]` without crossing the bridge.

## Parameters

### actions

[`SyncFollowGroupAction`](../type-aliases/SyncFollowGroupAction.md)[]

## Returns

`Promise`\<[`SyncFollowGroupResult`](../type-aliases/SyncFollowGroupResult.md)[]\>
