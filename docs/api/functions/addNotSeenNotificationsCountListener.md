[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / addNotSeenNotificationsCountListener

# Function: addNotSeenNotificationsCountListener()

> **addNotSeenNotificationsCountListener**(`callback`): `EmitterSubscription`

Adds a listener for not seen notifications count changes.

This listener is triggered whenever the count of unseen notifications changes.
The count is automatically updated by the SDK, but can also be manually refreshed
using `updateNotSeenNotificationsCount()`.

## Parameters

### callback

[`NotSeenNotificationsCountListenerCallback`](../type-aliases/NotSeenNotificationsCountListenerCallback.md)

Function called when the notification count changes

## Returns

`EmitterSubscription`

A subscription object with a `remove()` method to unsubscribe

## Example

```typescript
const subscription = addNotSeenNotificationsCountListener((count) => {
  console.log(`Unseen notifications: ${count}`);
  // Update your app's badge or UI
});

// Later, to unsubscribe:
subscription.remove();
```
