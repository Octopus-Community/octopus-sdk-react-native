[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / debugOverrideExposeClientUserId

# Function: debugOverrideExposeClientUserId()

> **debugOverrideExposeClientUserId**(`enabled`): `Promise`\<`void`\>

**Debug-only.** Forces the `exposeClientUserId` community flag — the Unified Profile
activation flag — overriding the backend-provided community config, for local testing of
profile-tap interception before the backend serves the flag. Not part of the stable public
API surface and not for use in production apps.

The flag is only half of the activation contract: Unified Profile routing also requires
profile taps to be intercepted (`interceptProfileTaps: true` on `openUI()` or
`<OctopusUIView>`).

## Parameters

### enabled

The value to force, or `null` to restore the backend-provided config.

`boolean` | `null`

## Returns

`Promise`\<`void`\>

A promise that resolves when the override has been applied.
