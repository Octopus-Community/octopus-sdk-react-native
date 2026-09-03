[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / initialize

# Function: initialize()

> **initialize**(`params`): `Promise`\<`void`\>

Initializes the Octopus SDK with the provided configuration.

This function must be called before using any other Octopus SDK features. It sets up the SDK
with your API key, connection mode (SSO or Octopus-managed authentication), and optional theme
and UI options. For SSO, you also need to set up a token provider with `useUserTokenProvider` or
`addUserTokenRequestListener` before calling `connectUser`.

## Parameters

### params

[`InitializeParams`](../interfaces/InitializeParams.md)

See [InitializeParams](../interfaces/InitializeParams.md) (including `theme`, `ui`, `topAppBar`). For theming guide see the main README.

## Returns

`Promise`\<`void`\>

## See

[connectUser](connectUser.md) – connect a user after initialization (SSO mode).

## Example

```typescript
await initialize({
  apiKey: 'your-api-key',
  connectionMode: {
    type: 'sso',
    appManagedFields: ['username', 'profilePicture'],
  },
});
await initialize({
  apiKey: 'your-api-key',
  connectionMode: { type: 'octopus' },
});
```
