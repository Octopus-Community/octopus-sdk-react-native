[**@octopus-community/react-native v1.16.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / debugOverrideContentOptions

# Function: debugOverrideContentOptions()

> **debugOverrideContentOptions**(`options`): `Promise`\<`void`\>

**Debug-only.** Forces content creation and post tap options, overriding the backend-provided
community config, for local testing of composers and navigation. Not part of the
stable public API surface and not for use in production apps.

Creation flags default to `true` (the native default).
`post.textRequired` follows the same rule: only `false` allows an image post without text.
`post.imageTapOpensPost` and `post.groupNameTapOpensGroup` default to `false`.
The override always describes a complete, unambiguous config rather than a partial patch.

## Parameters

### options

The content options to apply, or `null` to restore the backend-provided
config.

[`ContentOptions`](../interfaces/ContentOptions.md) | `null`

## Returns

`Promise`\<`void`\>

A promise that resolves when the override has been applied.
