[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / SyncFollowGroupAction

# Type Alias: SyncFollowGroupAction

> **SyncFollowGroupAction** = `object`

A single follow/unfollow action submitted to a `syncFollowGroups` batch.

## Properties

### actionDate

> **actionDate**: `Date`

Backend rejects actions older than its stored timestamp.

---

### followed

> **followed**: `boolean`

`true` = follow, `false` = unfollow.

---

### groupId

> **groupId**: `string`

Identifier of the group to follow or unfollow.
