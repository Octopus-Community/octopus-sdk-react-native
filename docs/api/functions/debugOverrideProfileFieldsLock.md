[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / debugOverrideProfileFieldsLock

# Function: debugOverrideProfileFieldsLock()

> **debugOverrideProfileFieldsLock**(`lock`): `Promise`\<`void`\>

**Debug-only.** Forces the per-field profile lock, overriding the backend-provided community
config, for local testing of the profile / profile-edit screens. Not part of the stable public
API surface and not for use in production apps.

## Parameters

### lock

The lock to apply, or `null` to restore the backend-provided config.

[`ProfileFieldsLock`](../interfaces/ProfileFieldsLock.md) | `null`

## Returns

`Promise`\<`void`\>

A promise that resolves when the override has been applied.
