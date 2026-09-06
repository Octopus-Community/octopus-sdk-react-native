[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusLocalImageAttachment

# Interface: OctopusLocalImageAttachment

A local image to attach to a [ClientPost](ClientPost.md).

`uri` follows the same convention as [OctopusPrefilledPost](OctopusPrefilledPost.md)'s `imageUri`: a bare name
with no scheme is looked up as a bundled native image resource (Android `res/drawable`, iOS
asset catalog / bundle), anything else is treated as a `file://` URI.

An image is **never silently dropped**, because the post is created once and never
rewritten — a missing image would be permanent and invisible to you. Failures are reported
as a typed [ClientPostError](ClientPostError.md), in two stages:

- A `uri` that resolves to nothing here — blank, a non-`file:` scheme, a bundled name no
  such resource matches — is refused by the bridge with `INVALID_ARGS`, before any post is
  created.
- A file that resolves but the native SDK rejects — empty, oversized, unsupported format,
  upload failure — comes back as `FILE_EMPTY` / `FILE_TOO_LARGE` / `FILE_BAD_FORMAT` /
  `FILE_UPLOAD` on Android, and as `CLIENT_POST_ERROR` on iOS.

Only `file:` URIs are read. To attach a web image use [OctopusRemoteImageAttachment](OctopusRemoteImageAttachment.md),
which the native SDK downloads on its own schedule; passing an `https:` URL as a
`localImage` `uri` is refused rather than fetched synchronously.

## Properties

### type

> `readonly` **type**: `"localImage"`

---

### uri

> `readonly` **uri**: `string`

A `file://` URI, or the bare name of an image bundled with the host app.
