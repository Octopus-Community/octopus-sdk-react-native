[**@octopus-community/react-native v1.15.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / addUserTokenRequestListener

# Function: addUserTokenRequestListener()

> **addUserTokenRequestListener**(`callback`): `EmitterSubscription`

Adds a listener for user token requests events.

This listener is triggered when the Octopus SDK needs
a new user token.
You may use this listener directly if you prefer not to use the useUserTokenProvider hook.

If the callback throws or rejects, the request is cancelled and the error is logged at
`ERROR` level (to the console, or to the logger passed to `setLogger`). Only its `name`
and `message` are logged, and the `message` is logged as is: keep tokens, credentials and
request details out of it.

## Parameters

### callback

[`UserTokenRequestListenerCallback`](../type-aliases/UserTokenRequestListenerCallback.md)

## Returns

`EmitterSubscription`
