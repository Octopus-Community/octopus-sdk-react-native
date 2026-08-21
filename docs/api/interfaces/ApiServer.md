[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / ApiServer

# Interface: ApiServer

A custom server endpoint the SDK routes its gRPC traffic to, instead of the Octopus
default endpoint.

This is a plain passthrough type: validation (empty host, a host that embeds a scheme,
a port, a path, whitespace, or malformed IPv6 bracketing) happens natively on both
platforms — mirrors native Android `com.octopuscommunity.sdk.ApiServer` and native iOS
`OctopusSDK.Configuration.ApiServer`. An invalid value rejects the enclosing
[initialize](../functions/initialize.md) / [switchCommunity](../functions/switchCommunity.md) call with a native error; there is no
client-side check here.

One case is not rejected on either platform: a missing or non-string `host` (e.g. `{}`
or `{ host: 123 }`) is silently treated the same as omitting `apiServer` altogether —
the SDK falls back to the Octopus default endpoint rather than throwing. TypeScript's
`host: string` catches this at compile time for typed callers; it only matters for a
caller that bypasses the type system (plain JS, or an `any`-typed value).

## Properties

### host

> **host**: `string`

The server host, without scheme, port, or path (e.g. `'api.example.com'`, or a
bracketed IPv6 literal such as `'[::1]'`).

---

### port?

> `optional` **port**: `number`

The server port. Traffic is always routed over TLS.

#### Default

```ts
443;
```
