[**@octopus-community/react-native v1.16.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / addCommunityAccessDeniedReasonListener

# Function: addCommunityAccessDeniedReasonListener()

> **addCommunityAccessDeniedReasonListener**(`callback`): `EmitterSubscription`

Adds a listener for the reason the community access is denied.

The callback receives why the current user cannot access the community, or `null` when the
access is granted or not known yet. It is the reason the Octopus UI displays its access denied
screen for; while the community is closed or temporarily disabled, the reason is that closure.
It is sent separately from [addHasAccessToCommunityListener](addHasAccessToCommunityListener.md)'s value, so the two can
briefly disagree. A reason a newer native SDK adds is reported as `'unknown'`.

Like [addHasAccessToCommunityListener](addHasAccessToCommunityListener.md), the current value is sent when `initialize()`
subscribes the native side and is not replayed later: register this listener before
`initialize()` when the first value matters.

## Parameters

### callback

[`CommunityAccessDeniedReasonListenerCallback`](../type-aliases/CommunityAccessDeniedReasonListenerCallback.md)

Function called when the reason changes

## Returns

`EmitterSubscription`

A subscription object with a `remove()` method to unsubscribe

## See

[addHasAccessToCommunityListener](addHasAccessToCommunityListener.md) – whether the user can access the community.

## Example

```typescript
const subscription = addCommunityAccessDeniedReasonListener((reason) => {
  if (reason === 'accountDeleted') {
    // The member's account was deleted: sign them out on your side.
  }
});
subscription.remove();
```
