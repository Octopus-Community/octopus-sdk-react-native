[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / isUserConnected

# Function: isUserConnected()

> **isUserConnected**(): `boolean`

Whether a fully authenticated (non-guest) user is currently connected, as last published by the
SDK.

The value tracked here is the last one received from the native side. Tracking starts when
`initialize()` is called, and the native side pushes its current state asynchronously, so a read
taken in the very tick `initialize()` resolves may still report `false` even though a user is
connected. For UI, prefer [addIsUserConnectedListener](addIsUserConnectedListener.md): it replays the value as soon as it
is known.

## Returns

`boolean`
