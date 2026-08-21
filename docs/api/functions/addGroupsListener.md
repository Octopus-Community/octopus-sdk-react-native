[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / addGroupsListener

# Function: addGroupsListener()

> **addGroupsListener**(`callback`): `EmitterSubscription`

Adds a listener for the community's [OctopusGroup](../interfaces/OctopusGroup.md)s — the content categories users can
browse and follow.

Emits whenever the group list changes (follow/unfollow, admin updates, …), and an empty array
when the community has no groups. Consecutive duplicate lists are collapsed, so it fires only on
an actual change. **The current list is replayed immediately** to a listener added after the SDK
already published one.

Mirrors the native `OctopusSDK.groups`.

## Parameters

### callback

[`GroupsListenerCallback`](../type-aliases/GroupsListenerCallback.md)

Called with the current list, then on every change.

## Returns

`EmitterSubscription`

A subscription object with a `remove()` method to unsubscribe.

## See

- [getGroups](getGroups.md) – the synchronous current value.
- [syncFollowGroups](syncFollowGroups.md) – to follow/unfollow groups.

## Example

```typescript
const subscription = addGroupsListener((groups) => {
  setFollowedGroups(groups.filter((group) => group.isFollowed));
});

// Later, to unsubscribe:
subscription.remove();
```
