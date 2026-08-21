[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / debugOverrideTermsAcceptanceMode

# Function: debugOverrideTermsAcceptanceMode()

> **debugOverrideTermsAcceptanceMode**(`mode`): `Promise`\<`void`\>

**Debug-only.** Forces the terms-acceptance mode, overriding the backend-provided community
config, for local testing of the consent sheet. Not part of the stable public API surface and
not for use in production apps.

## Parameters

### mode

The mode to force, or `null` to restore the backend-provided config.

[`TermsAcceptanceMode`](../type-aliases/TermsAcceptanceMode.md) | `null`

## Returns

`Promise`\<`void`\>

A promise that resolves when the override has been applied.
