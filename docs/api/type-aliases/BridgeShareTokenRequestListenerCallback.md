[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / BridgeShareTokenRequestListenerCallback

# Type Alias: BridgeShareTokenRequestListenerCallback()

> **BridgeShareTokenRequestListenerCallback** = (`bridgeFingerprint`) => `Promise`\<`string` \| `null`\>

Signs one prefilled share. Receives the fingerprint the SDK computed for the final post
content and returns the JWT authorising it, or `null` to publish unsigned.

## Parameters

### bridgeFingerprint

`string`

## Returns

`Promise`\<`string` \| `null`\>
