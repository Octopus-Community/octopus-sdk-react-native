[**@octopus-community/react-native v1.0.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / connectUser

# Function: connectUser()

> **connectUser**(`params`): `Promise`\<`void`\>

Connects a user using SSO authentication.

This function establishes a connection between your app's user and Octopus.
It requires that you have configured SSO mode during SDK initialization
and have set up a token provider using `useUserTokenProvider` or `addUserTokenRequestListener`.

## Parameters

### params

[`ConnectUserParams`](../interfaces/ConnectUserParams.md)

## Returns

`Promise`\<`void`\>
