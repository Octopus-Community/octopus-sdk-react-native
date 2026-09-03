[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / getConnectionState

# Function: getConnectionState()

> **getConnectionState**(): [`OctopusConnectionState`](../type-aliases/OctopusConnectionState.md)

The current [OctopusConnectionState](../type-aliases/OctopusConnectionState.md) as last published by the SDK.

The value tracked here is the last one received from the native side. Tracking starts when
`initialize()` is called, and the native side pushes its current state asynchronously, so a read
taken in the very tick `initialize()` resolves may still report `{ connected: false }` even
though a user is connected. For UI, prefer [addConnectionStateListener](addConnectionStateListener.md): it replays the
state as soon as it is known.

## Returns

[`OctopusConnectionState`](../type-aliases/OctopusConnectionState.md)
