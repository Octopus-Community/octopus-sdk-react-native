[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / addSDKEventListener

# Function: addSDKEventListener()

> **addSDKEventListener**(`callback`): `EmitterSubscription`

Adds a listener for SDK events.

This listener receives all SDK events including:

- Content creation (posts, comments, replies)
- Content deletion
- Reactions and interactions
- Gamification events
- Screen navigation
- Profile modifications
- Session events
- And more...

Use TypeScript type guards to narrow down specific event types:

## Parameters

### callback

[`SDKEventListenerCallback`](../type-aliases/SDKEventListenerCallback.md)

Function called when any SDK event occurs

## Returns

`EmitterSubscription`

A subscription object with a `remove()` method to unsubscribe

## Example

```typescript
const subscription = addSDKEventListener((event) => {
  switch (event.type) {
    case 'postCreated':
      console.log(`Post created: ${event.postId}`);
      break;
    case 'reactionModified':
      console.log(`Reaction changed on ${event.contentId}`);
      break;
    case 'gamificationPointsGained':
      console.log(`Gained ${event.points} points for ${event.action}`);
      break;
    // ... handle other event types
  }
});

// Later, to unsubscribe:
subscription.remove();
```
