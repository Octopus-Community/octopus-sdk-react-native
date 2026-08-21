[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / addLoginRequiredListener

# Function: addLoginRequiredListener()

> **addLoginRequiredListener**(`callback`): `EmitterSubscription`

Adds a listener for login required events.

This listener is triggered when the Octopus SDK detects that user
authentication is required, typically in SSO mode when the user
session has expired or the user is not logged in.

## Parameters

### callback

[`LoginRequiredListenerCallback`](../type-aliases/LoginRequiredListenerCallback.md)

## Returns

`EmitterSubscription`
