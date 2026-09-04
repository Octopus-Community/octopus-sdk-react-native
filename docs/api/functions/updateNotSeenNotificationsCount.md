[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / updateNotSeenNotificationsCount

# Function: updateNotSeenNotificationsCount()

> **updateNotSeenNotificationsCount**(): `Promise`\<`void`\>

Force refresh the unseen notification count from the server.

This method triggers a manual update of the notification badge count.
The updated count will be emitted via the notSeenNotificationsCountChanged event.
Use `addNotSeenNotificationsCountListener` to listen for count changes.

## Returns

`Promise`\<`void`\>

A promise that resolves when the update is complete.

## Throws

An error if the SDK is not initialized or if the update fails.

## Example

```typescript
// Listen to count changes
const subscription = addNotSeenNotificationsCountListener((count) => {
  console.log(`Unseen notifications: ${count}`);
  // Update your badge UI
});

// Manually refresh the count
await updateNotSeenNotificationsCount();

// Later, unsubscribe
subscription.remove();
```
