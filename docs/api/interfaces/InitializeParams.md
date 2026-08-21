[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / InitializeParams

# Interface: InitializeParams

Configuration params for initializing the Octopus SDK.

## Properties

### apiKey

> **apiKey**: `string`

Your Octopus API key obtained from the Octopus dashboard

---

### apiServer?

> `optional` **apiServer**: [`ApiServer`](ApiServer.md)

Optional custom server endpoint the SDK routes its gRPC traffic to. Omit it to use
the Octopus default endpoint. See [ApiServer](ApiServer.md) for the validation rules — an
invalid value rejects this call with a native error.

---

### connectionMode

> **connectionMode**: \{ `appManagedFields`: [`UserProfileField`](../type-aliases/UserProfileField.md)[]; `type`: `"sso"`; \} \| \{ `deepLink?`: `string`; `type`: `"octopus"`; \}

The connection mode determines how user authentication is handled.

- `sso`: Use Single Sign-On with your existing user system
- `octopus`: Let Octopus handle user authentication

#### Type Declaration

\{ `appManagedFields`: [`UserProfileField`](../type-aliases/UserProfileField.md)[]; `type`: `"sso"`; \}

#### appManagedFields

> **appManagedFields**: [`UserProfileField`](../type-aliases/UserProfileField.md)[]

List of user profile fields that your app manages directly

#### type

> **type**: `"sso"`

SSO mode configuration

\{ `deepLink?`: `string`; `type`: `"octopus"`; \}

#### deepLink?

> `optional` **deepLink**: `string`

Base deep link used by Octopus-managed flows that need to redirect back into
your app (currently: the magic-link confirmation screen sent by email). Register
the resulting URL in your app's manifest / `Info.plist` so the OS routes it back
to your app.

**The value the backend actually receives differs by platform** — this is not
just a mechanism difference, the URL shape itself changes:

- iOS passes this string to the backend verbatim.
- Android treats it as a _base path_ and appends a trailing `/` plus the
  magic-link confirmation sub-path, so the backend receives
  `<deepLink>/<confirmation-path>`, not `<deepLink>` itself.

Omit it to keep the native default (no app redirect is embedded in the
generated link).

#### type

> **type**: `"octopus"`

Octopus-managed authentication mode

---

### theme?

> `optional` **theme**: [`OctopusTheme`](OctopusTheme.md)

Optional theme customization for the Octopus UI

---

### topAppBar?

> `optional` **topAppBar**: [`OctopusTopAppBar`](OctopusTopAppBar.md)

Optional main-feed navigation bar (TopAppBar) customization.

---

### ui?

> `optional` **ui**: [`OctopusUIOptions`](OctopusUIOptions.md)

Optional UI customization for layout-related tweaks
