[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / addHasAccessToCommunityListener

# Function: addHasAccessToCommunityListener()

> **addHasAccessToCommunityListener**(`callback`): `EmitterSubscription`

Adds a listener for community access changes.

This listener receives the **Octopus-managed** access state: the cohort value that determines
whether the user has access to the community (when the SDK manages the A/B logic). It is triggered
when that state changes — e.g. after you call `overrideCommunityAccess`, or when the cohort is
updated by Octopus. Use it to show or hide community entry points in your UI. If your app manages
access itself (and only reports it via `trackCommunityAccess`), this listener is less relevant,
since the SDK is not the source of the access decision.

## Parameters

### callback

[`HasAccessToCommunityListenerCallback`](../type-aliases/HasAccessToCommunityListenerCallback.md)

Function called when the access status changes

## Returns

`EmitterSubscription`

A subscription object with a `remove()` method to unsubscribe

## See

- [overrideCommunityAccess](overrideCommunityAccess.md) – set the cohort when Octopus manages A/B.
- [trackCommunityAccess](trackCommunityAccess.md) – report access for analytics when your app manages access.

## Example

```typescript
const subscription = addHasAccessToCommunityListener((hasAccess) => {
  console.log(`Has access to community: ${hasAccess}`);
  // Show or hide community features based on access
});
subscription.remove();
```
