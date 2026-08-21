[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / addClientObjectRelatedPostListener

# Function: addClientObjectRelatedPostListener()

> **addClientObjectRelatedPostListener**(`clientObjectId`, `callback`): [`ClientObjectRelatedPostSubscription`](../interfaces/ClientObjectRelatedPostSubscription.md)

Observes the Octopus post linked to one of your objects, and delivers every change.

The current value is replayed as soon as it is known — `null` when no post exists yet for
`clientObjectId` — then the callback fires again on every reaction, comment or view-count
change. Use it to keep your own screen's counters live next to the embedded UI;
[formatOctopusCompactCount](formatOctopusCompactCount.md) renders them the way the Octopus feed does.

This is the React Native form of the native reactive API — Android's
`getClientObjectRelatedPostFlow(clientObjectId)` and iOS's
`getClientObjectRelatedPostPublisher(clientObjectId:)`. Like them, and **unlike**
[startObservingCommunityData](startObservingCommunityData.md), it is genuinely **per subscription**: every call opens
its own observation, several may watch different objects (or the same one) at once, and
`remove()` tears down only its own.

The observation is started on the native side asynchronously. A native start failure is
logged through the SDK logger, not thrown — this function is meant to be called from an
effect, where a rejected promise nobody awaits would become an unhandled rejection.

## Parameters

### clientObjectId

`string`

The id of your object, the same one you passed as
[ClientPost.objectId](../interfaces/ClientPost.md#objectid).

### callback

[`ClientObjectRelatedPostListenerCallback`](../type-aliases/ClientObjectRelatedPostListenerCallback.md)

Called with the current post, or `null` while none exists.

## Returns

[`ClientObjectRelatedPostSubscription`](../interfaces/ClientObjectRelatedPostSubscription.md)

A subscription object with a `remove()` method that stops this observation.

## Example

```typescript
useEffect(() => {
  const subscription = addClientObjectRelatedPostListener(
    article.id,
    (post) => {
      setCommentCount(post ? post.commentCount : 0);
    }
  );
  return () => subscription.remove();
}, [article.id]);
```
