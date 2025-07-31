[**@octopus-community/react-native v1.0.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / addUserTokenRequestListener

# Function: addUserTokenRequestListener()

> **addUserTokenRequestListener**(`callback`): `EmitterSubscription`

Adds a listener for user token requests events.

This listener is triggered when the Octopus SDK needs
a new user token.
You may use this listener directly if you prefer not to use the useUserTokenProvider hook.

## Parameters

### callback

[`UserTokenRequestListenerCallback`](../type-aliases/UserTokenRequestListenerCallback.md)

## Returns

`EmitterSubscription`
