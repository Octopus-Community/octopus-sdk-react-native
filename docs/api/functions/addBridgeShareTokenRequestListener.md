[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / addBridgeShareTokenRequestListener

# Function: addBridgeShareTokenRequestListener()

> **addBridgeShareTokenRequestListener**(`callback`): `object`

Adds a listener for bridge-share signing requests.

This listener is triggered when the user publishes a **prefilled** post (opened through
[navigateToOctopusCreatePost](navigateToOctopusCreatePost.md)) that carries an image, in a community configured to
forbid member pictures — the only case the server gates. The SDK computes a SHA-256
fingerprint of the final content (text + CTA + image) and asks for a signature over it.

You may use this listener directly if you prefer not to use the
[useBridgeShareTokenProvider](useBridgeShareTokenProvider.md) hook.

Registering a listener is what tells the native SDK a signer exists: the create-post editor
only wires the signing hook when one is registered, so hosts that never call this keep the
previous behaviour (prefilled shares are sent unsigned). Call `remove()` on the returned
subscription to unregister.

## Parameters

### callback

[`BridgeShareTokenRequestListenerCallback`](../type-aliases/BridgeShareTokenRequestListenerCallback.md)

## Returns

`object`

### remove()

> **remove**: () => `void`

#### Returns

`void`

## See

[useBridgeShareTokenProvider](useBridgeShareTokenProvider.md) for the platform difference when the callback
declines by returning `null`.
