[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / addCommunityDataListener

# Function: addCommunityDataListener()

> **addCommunityDataListener**(`callback`): `EmitterSubscription`

Adds a listener for updates from the observation started by
[startObservingCommunityData](startObservingCommunityData.md). Called with `null` when the observed member is unknown.

## Parameters

### callback

[`CommunityDataListenerCallback`](../type-aliases/CommunityDataListenerCallback.md)

Function called with the latest community data.

## Returns

`EmitterSubscription`

A subscription object with a `remove()` method to unsubscribe.

## See

[startObservingCommunityData](startObservingCommunityData.md) – start the observation this listener receives.
