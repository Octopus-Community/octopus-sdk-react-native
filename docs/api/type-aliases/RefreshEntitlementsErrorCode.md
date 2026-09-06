[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / RefreshEntitlementsErrorCode

# Type Alias: RefreshEntitlementsErrorCode

> **RefreshEntitlementsErrorCode** = `"NO_CLIENT_TOKEN_PROVIDER"` \| `"USER_NOT_CONNECTED"` \| `"NOT_INITIALIZED"` \| `"NO_NETWORK"` \| `"USER_BANNED"` \| `"SERVER_ERROR"` \| `"REFRESH_ENTITLEMENTS_ERROR"`

The reason [refreshEntitlements](../functions/refreshEntitlements.md) was rejected.

| Code                         | Meaning                                                                                                                                        | Emitted on   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `NO_CLIENT_TOKEN_PROVIDER`   | No client token provider was registered on the SDK.                                                                                            | Android, iOS |
| `USER_NOT_CONNECTED`         | No user is currently connected.                                                                                                                | Android, iOS |
| `NOT_INITIALIZED`            | The SDK's `initialize()` has not been called yet. Distinct from `USER_NOT_CONNECTED`, which means the SDK is running but no user is connected. | Android, iOS |
| `NO_NETWORK`                 | The device has no network connection.                                                                                                          | Android, iOS |
| `USER_BANNED`                | The connected user is banned.                                                                                                                  | Android, iOS |
| `SERVER_ERROR`               | The server returned an unexpected error.                                                                                                       | Android, iOS |
| `REFRESH_ENTITLEMENTS_ERROR` | Fallback for any other/unclassified failure.                                                                                                   | Android, iOS |

## See

- [RefreshEntitlementsError](../interfaces/RefreshEntitlementsError.md) – the shape of the rejected error.
- [isRefreshEntitlementsError](../functions/isRefreshEntitlementsError.md) – narrow an unknown caught value.
