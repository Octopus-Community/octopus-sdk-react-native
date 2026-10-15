[**@octopus-community/react-native v1.15.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / debugOverrideContentOptions

# Function: debugOverrideContentOptions()

> **debugOverrideContentOptions**(`options`): `Promise`\<`void`\>

**Debug-only.** Forces the per-content-type creation options, overriding the backend-provided
community config, for local testing of the post/comment/reply composers. Not part of the
stable public API surface and not for use in production apps.

Every flag not explicitly set to `false` is sent as `true` (the native default).
`post.textRequired` follows the same rule: only `false` allows an image post without text.
The override always describes a complete, unambiguous config rather than a partial patch.

## Parameters

### options

The content options to apply, or `null` to restore the backend-provided
config.

[`ContentOptions`](../interfaces/ContentOptions.md) | `null`

## Returns

`Promise`\<`void`\>

A promise that resolves when the override has been applied.
