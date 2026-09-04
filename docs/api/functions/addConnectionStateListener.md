[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / addConnectionStateListener

# Function: addConnectionStateListener()

> **addConnectionStateListener**(`callback`): `EmitterSubscription`

Adds a listener for the current [OctopusConnectionState](../type-aliases/OctopusConnectionState.md).

Fires whenever the user transitions between connected and not-connected, and whenever the guest
flag flips. Consecutive duplicate values are collapsed. **The current state is replayed
immediately** to a listener added after the SDK already published one.

Mirrors the native Android `OctopusSDK.connectionState`; on iOS the value is derived from the
`profile` publisher and the guest flag is read from `OctopusProfile.isGuest` (native iOS
1.12.6+).

## Parameters

### callback

[`ConnectionStateListenerCallback`](../type-aliases/ConnectionStateListenerCallback.md)

Called with the current state, then on every change.

## Returns

`EmitterSubscription`

A subscription object with a `remove()` method to unsubscribe.

## See

- [getConnectionState](getConnectionState.md) – the synchronous current value.
- [isUserConnected](isUserConnected.md) – the simpler "a real, non-guest user is connected" signal.

## Example

```typescript
const subscription = addConnectionStateListener((state) => {
  if (state.connected && state.isGuest) {
    showJoinTheCommunityBanner();
  }
});

// Later, to unsubscribe:
subscription.remove();
```
