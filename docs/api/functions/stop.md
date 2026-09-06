[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / stop

# Function: stop()

> **stop**(): `Promise`\<`void`\>

Fully stops the Octopus SDK: disconnects the current user and releases every native
resource the SDK holds. After this resolves, [isInitialised](isInitialised.md) returns `false` and
the SDK must be re-created with [initialize](initialize.md) (or [switchCommunity](switchCommunity.md)) before
it can be used again.

**Platform note on bridge subscriptions — this differs by platform, not just by
mechanism:**

- On iOS, this cancels the bridge's own Combine subscriptions (there is no matching
  native teardown to run underneath — iOS has no native `stop` primitive, so this call
  is a best-effort approximation: disconnect the user, then release the bridge's own SDK
  instance).
- On Android, the reactive collection jobs (notification counts, community-access state,
  SDK events, …) are deliberately left running: native `OctopusSDK.stop()` does not
  complete those Flows, it only makes them stop emitting until the SDK is initialised
  again, so nothing needs to be cancelled or restarted on this side either.

Once this resolves, [addIsInitialisedListener](addIsInitialisedListener.md) subscribers receive `false`.

## Returns

`Promise`\<`void`\>

A promise that resolves when the SDK has stopped.

## Throws

An error if the call fails.

## See

- [initialize](initialize.md)
- [switchCommunity](switchCommunity.md)
- [reset](reset.md)
