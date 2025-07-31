[**@octopus-community/react-native v1.0.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / initialize

# Function: initialize()

> **initialize**(`params`): `Promise`\<`void`\>

Initializes the Octopus SDK with the provided configuration.

This function must be called before using any other Octopus SDK features.
It sets up the SDK with your API key and configures the authentication mode.

## Parameters

### params

[`InitializeParams`](../interfaces/InitializeParams.md)

## Returns

`Promise`\<`void`\>

## Example

```typescript
// Initialize with SSO mode
await initialize({
  apiKey: "your-api-key",
  connectionMode: {
    type: "sso",
    appManagedFields: ["username", "profilePicture"],
  },
});

// Initialize with Octopus authentication
await initialize({
  apiKey: "your-api-key",
  connectionMode: {
    type: "octopus",
  },
});
```
