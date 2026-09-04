[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / reset

# Function: reset()

> **reset**(): `Promise`\<`void`\>

Disconnects the current user and clears all locally cached data (and, on Android, cached
images). The SDK remains initialised after this call — [isInitialised](isInitialised.md) keeps
returning `true`.

You typically don't need to call this directly — [switchCommunity](switchCommunity.md) already handles
it. Use this if you need to fully reset without switching community (e.g. for a full app
reset).

**Platform note:** iOS has no native `reset` primitive. There, this call is a best-effort
approximation that only disconnects the user — iOS does have local persistence (three
Core Data stacks backing the SDK's models, tracking, and config), but this bridge call
does not clear it, unlike Android's native `OctopusSDK.reset()`, which does clear its
local cache as described above.

## Returns

`Promise`\<`void`\>

A promise that resolves once the underlying disconnect completes on both platforms.

## Throws

An error if the SDK is not initialized or the call fails.

## See

- [switchCommunity](switchCommunity.md)
- [stop](stop.md)
