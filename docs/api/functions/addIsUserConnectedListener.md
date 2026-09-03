[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / addIsUserConnectedListener

# Function: addIsUserConnectedListener()

> **addIsUserConnectedListener**(`callback`): `EmitterSubscription`

Adds a listener for "a fully authenticated (non-guest) user is connected", derived from
[addConnectionStateListener](addConnectionStateListener.md).

`true` only when a connected, non-guest user is present — on both platforms. (iOS distinguishes
guest sessions since native SDK 1.12.6; older iOS SDKs reported every connection as non-guest.)
Consecutive duplicate values are collapsed, and the current value is replayed immediately to a
listener added after the SDK already published a connection state.

Mirrors the native Android `OctopusSDK.isUserConnected`.

## Parameters

### callback

[`IsUserConnectedListenerCallback`](../type-aliases/IsUserConnectedListenerCallback.md)

Called with the current value, then on every change.

## Returns

`EmitterSubscription`

A subscription object with a `remove()` method to unsubscribe.

## See

- [isUserConnected](isUserConnected.md) – the synchronous current value.
- [addConnectionStateListener](addConnectionStateListener.md) – for guest-vs-authenticated detail.

## Example

```typescript
const subscription = addIsUserConnectedListener((connected) => {
  setCanPost(connected);
});

// Later, to unsubscribe:
subscription.remove();
```
