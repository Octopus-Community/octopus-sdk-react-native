[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / fetchGroups

# Function: fetchGroups()

> **fetchGroups**(): `Promise`\<[`OctopusGroup`](../interfaces/OctopusGroup.md)[]\>

Fetches the groups visible to the current user.

There is no dedicated typed-rejection guard for this call: none of the three native SDKs
(Android, iOS, and Flutter's own bridge) classify a `fetchGroups` failure any further than
connection-level codes.

## Returns

`Promise`\<[`OctopusGroup`](../interfaces/OctopusGroup.md)[]\>

The up-to-date list of groups.

## Throws

An error whose `code` is one of `NOT_INITIALIZED` (the SDK's `initialize()` has not
been called yet), `NO_NETWORK`, `NOT_CONNECTED`, `SERVER_ERROR`, `CONTENT_UNAVAILABLE`, or the
fallback `FETCH_GROUPS_ERROR`.

## Example

```typescript
const groups = await fetchGroups();
```
