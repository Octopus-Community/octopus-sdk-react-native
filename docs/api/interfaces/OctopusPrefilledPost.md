[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusPrefilledPost

# Interface: OctopusPrefilledPost

Prefills the post-creation editor opened by [navigateToOctopusCreatePost](../functions/navigateToOctopusCreatePost.md).

Every field is optional and independently validated by the native SDK before the editor
opens; see [NavigateToOctopusCreatePostErrorCode](../type-aliases/NavigateToOctopusCreatePostErrorCode.md) for the failure codes a bad value can
produce.

`imageUri` accepts either:

- a bare name with no scheme, resolved as a bundled native image resource (an Android
  drawable resource / an iOS asset-catalog image with that name) — this is how the QA
  scenario's "bundled image" presets work, since neither native SDK fetches remote URLs for
  this field;
- a `file://` URI pointing at a local file already on device.

## Properties

### cta?

> `optional` **cta**: [`OctopusPostCTA`](OctopusPostCTA.md)

A call-to-action button attached to the post.

---

### imageUri?

> `optional` **imageUri**: `string`

A bundled resource name or a `file://` URI — see above.

---

### text?

> `optional` **text**: `string`

Prefilled post text.

---

### topicId?

> `optional` **topicId**: `string`

The topic (group) the post is created into.
