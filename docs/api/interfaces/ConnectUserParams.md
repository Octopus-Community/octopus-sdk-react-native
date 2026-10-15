[**@octopus-community/react-native v1.15.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / ConnectUserParams

# Interface: ConnectUserParams

## Properties

### profile?

> `optional` **profile**: `object`

#### biography?

> `optional` **biography**: `string`

#### profilePicture?

> `optional` **profilePicture**: `string`

HTTP/HTTPS URL, local file path or base64-encoded profile picture.
Surrounding whitespace is trimmed and URL schemes are case-insensitive.
URLs require a host and must be URL-encoded (no unescaped spaces).
Base64 accepts an optional `data:image/...;base64,` prefix, missing padding
and line breaks, with canonical padding bits. URL-safe base64 (`-` and `_`)
is rejected. The bridge imposes no base64 size limit. Decoded base64 must
be recognized by the platform's image decoder on both platforms.
Android local files, drawable names (including vectors) and assets must
exist and be readable; their decoding stays with the native SDK. Android
passes remote URLs directly to the native SDK without a bridge download.
iOS downloads remote bytes before connecting, requires an HTTP 2xx response,
and checks both remote and local bytes with its image decoder.
Invalid syntax, undecodable base64 or missing/unreadable local inputs reject
`connectUser` with `CONNECT_USER_ERROR` before calling the native SDK,
preserving the stored avatar. iOS also rejects failed downloads, non-2xx
responses and undecodable remote or local bytes with that code. An empty
or whitespace-only string still means no picture.
Inline image formats also depend on the device decoder: on Android, inline
HEIF below API 28 and inline AVIF below API 31 reject with `CONNECT_USER_ERROR`.

#### username?

> `optional` **username**: `string`

---

### userId

> **userId**: `string`

Unique identifier for the user in your system.
This should be a stable, unique ID that won't change for the user.
