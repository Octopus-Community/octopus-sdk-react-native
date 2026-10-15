[**@octopus-community/react-native v1.15.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / debugOverrideForceNicknameChoice

# Function: debugOverrideForceNicknameChoice()

> **debugOverrideForceNicknameChoice**(`enabled`): `Promise`\<`void`\>

**Debug-only.** Overrides whether members must type a nickname before their first contribution.
`true` starts the native nickname field empty; `false` prefills the generated nickname.
The native SDK still decides whether the screen is needed: a confirmed, locked or app-managed
nickname can exempt the member. Not for use in production apps.

## Parameters

### enabled

The value to force, or `null` to restore the backend-provided config.

`boolean` | `null`

## Returns

`Promise`\<`void`\>

A promise that resolves when the override has been applied.
