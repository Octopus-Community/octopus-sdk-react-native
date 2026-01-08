[**@octopus-community/react-native v1.0.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / InitializeParams

# Interface: InitializeParams

Configuration params for initializing the Octopus SDK.

## Properties

### apiKey

> **apiKey**: `string`

Your Octopus API key obtained from the Octopus dashboard

---

### connectionMode

> **connectionMode**: \{ `appManagedFields`: [`UserProfileField`](../type-aliases/UserProfileField.md)[]; `type`: `"sso"`; \} \| \{ `type`: `"octopus"`; \}

The connection mode determines how user authentication is handled.

- `sso`: Use Single Sign-On with your existing user system
- `octopus`: Let Octopus handle user authentication

#### Type declaration

\{ `appManagedFields`: [`UserProfileField`](../type-aliases/UserProfileField.md)[]; `type`: `"sso"`; \}

#### appManagedFields

> **appManagedFields**: [`UserProfileField`](../type-aliases/UserProfileField.md)[]

List of user profile fields that your app manages directly

#### type

> **type**: `"sso"`

SSO mode configuration

\{ `type`: `"octopus"`; \}

#### type

> **type**: `"octopus"`

Octopus-managed authentication mode

---

### theme?

> `optional` **theme**: [`OctopusTheme`](OctopusTheme.md)

Optional theme customization for the Octopus UI
