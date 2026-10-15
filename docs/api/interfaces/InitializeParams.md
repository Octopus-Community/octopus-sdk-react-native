[**@octopus-community/react-native v1.15.0**](../README.md)

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

### appManagedAudioSession?

> `optional` **appManagedAudioSession**: `boolean`

iOS only. When `true`, the SDK does not configure `AVAudioSession`; the host app
owns its configuration and activation during community video playback.
Defaults to `false`. Has no effect on Android.

Community switches, including after `stop()`, retain the value from the last
successful initialization. Call `initialize()` again to change it.

---

### connectionMode

> **connectionMode**: `object`

SSO configuration. Your app owns sign-in and supplies backend-issued tokens.

#### appManagedFields

> **appManagedFields**: [`UserProfileField`](../type-aliases/UserProfileField.md)[]

List of user profile fields that your app manages directly.

#### type

> **type**: `"sso"`

Single Sign-On with your existing user system.

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
