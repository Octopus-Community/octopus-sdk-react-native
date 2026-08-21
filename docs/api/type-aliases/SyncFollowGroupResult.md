[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / SyncFollowGroupResult

# Type Alias: SyncFollowGroupResult

> **SyncFollowGroupResult** = `object`

Outcome reported by `syncFollowGroups` for one submitted action. Match it
back to its action by `groupId` — result order is not guaranteed.

## Properties

### groupId

> **groupId**: `string`

Identifier of the group the action targeted.

---

### status

> **status**: [`SyncFollowGroupStatus`](../enumerations/SyncFollowGroupStatus.md)

Whether the action was applied, or the reason it was not. `unknown_error`
also stands in for any status this SDK version does not recognize, in
which case the action may still have been applied.
