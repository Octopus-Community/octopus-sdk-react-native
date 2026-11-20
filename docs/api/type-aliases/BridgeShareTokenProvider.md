[**@octopus-community/react-native v1.16.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / BridgeShareTokenProvider

# Type Alias: BridgeShareTokenProvider()

> **BridgeShareTokenProvider** = (`bridgeFingerprint`) => `Promise`\<`string` \| `null`\>

A function that signs a prefilled (Bridge / Share-in-game) post so the server accepts its
image in a community configured to forbid member pictures.

## Parameters

### bridgeFingerprint

`string`

SHA-256 fingerprint the SDK computed over the final post content
(text + CTA + image).

## Returns

`Promise`\<`string` \| `null`\>

A promise resolving to a compact JWT — signed **HS256 with the same shared secret as
your SSO tokens** and carrying `bridgeFingerprint` in its `bridge_fingerprint` claim — or
`null` to decline signing, which sends the post unsigned.

Sign on your backend. The shared secret must never live in the app bundle.

This signer shape serves two places: the global signer registered with
[useBridgeShareTokenProvider](../functions/useBridgeShareTokenProvider.md) (or [addBridgeShareTokenRequestListener](../functions/addBridgeShareTokenRequestListener.md)), and the
optional per-call `tokenProvider` of [fetchOrCreateClientObjectRelatedPost](../functions/fetchOrCreateClientObjectRelatedPost.md), which
signs that call's post only.
