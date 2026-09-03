[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / getProfile

# Function: getProfile()

> **getProfile**(): [`OctopusProfile`](../interfaces/OctopusProfile.md) \| `null`

The connected user's public [OctopusProfile](../interfaces/OctopusProfile.md) as last published by the SDK, or `null` when
no user is connected.

The value tracked here is the last one received from the native side. Tracking starts when
`initialize()` is called, and the native side pushes its current state asynchronously, so a read
taken in the very tick `initialize()` resolves may still report `null` even though a user is
connected. For UI, prefer [addProfileListener](addProfileListener.md): it replays the value as soon as it is
known.

## Returns

[`OctopusProfile`](../interfaces/OctopusProfile.md) \| `null`
