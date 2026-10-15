[**@octopus-community/react-native v1.15.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / SwitchCommunityParams

# Interface: SwitchCommunityParams

Configuration params for [switchCommunity](../functions/switchCommunity.md).

Reuses the same required SSO `connectionMode` object as [InitializeParams](InitializeParams.md).

## Properties

### apiKey

> **apiKey**: `string`

The API key that identifies the community to switch to.

---

### apiServer?

> `optional` **apiServer**: [`ApiServer`](ApiServer.md)

Optional custom server endpoint the SDK routes its gRPC traffic to on the new
community. Omit it to use the Octopus default endpoint.

---

### connectionMode

> **connectionMode**: `object`

The connection mode to use on the new community.

- `sso`: Use Single Sign-On with your existing user system

#### appManagedFields

> **appManagedFields**: [`UserProfileField`](../type-aliases/UserProfileField.md)[]

List of user profile fields that your app manages directly.

#### type

> **type**: `"sso"`

Single Sign-On with your existing user system.
