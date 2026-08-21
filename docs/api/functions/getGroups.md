[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / getGroups

# Function: getGroups()

> **getGroups**(): [`OctopusGroup`](../interfaces/OctopusGroup.md)[]

The community's [OctopusGroup](../interfaces/OctopusGroup.md)s as last published by the SDK.

The value tracked here is the last one received from the native side. Tracking starts when
`initialize()` is called, and the native side pushes its current state asynchronously, so a read
taken in the very tick `initialize()` resolves may still report an empty array. For UI, prefer
[addGroupsListener](addGroupsListener.md): it replays the list as soon as it is known.

The array returned is a copy — mutating it does not affect what the next caller or listener sees.

## Returns

[`OctopusGroup`](../interfaces/OctopusGroup.md)[]
