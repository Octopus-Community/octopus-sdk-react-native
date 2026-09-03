[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / useUserTokenProvider

# Function: useUserTokenProvider()

> **useUserTokenProvider**(`userTokenProvider`): `void`

React hook that registers a user token provider for SSO authentication.

This hook automatically handles token requests from the Octopus SDK by calling
the provided `userTokenProvider` function whenever a fresh token is needed.
The hook manages the subscription lifecycle and ensures the latest token provider
is always used.

## Parameters

### userTokenProvider

[`UserTokenProvider`](../type-aliases/UserTokenProvider.md)

## Returns

`void`
