[**@octopus-community/react-native v1.16.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusPrefilledPost

# Interface: OctopusPrefilledPost

Prefills the post-creation editor opened by [navigateToOctopusCreatePost](../functions/navigateToOctopusCreatePost.md).

Every field is optional and independently validated by the native SDK before the editor
opens; see [NavigateToOctopusCreatePostErrorCode](../type-aliases/NavigateToOctopusCreatePostErrorCode.md) for the failure codes a bad value can
produce.

Each entry of `imageUris` (and the deprecated `imageUri`) accepts either:

- a bare name with no scheme, resolved as a bundled native image resource (an Android
  drawable resource / an iOS asset-catalog image with that name) — this is how the QA
  scenario's "bundled image" presets work, since neither native SDK fetches remote URLs for
  this field;
- a `file://` URI pointing at a local file already on device.

Two image rules are checked by this wrapper before the native SDK is called:

- setting both `imageUri` and a non-empty `imageUris` is refused with a plain `Error`;
- more than [OCTOPUS_POST_MAX_IMAGE_COUNT](../variables/OCTOPUS_POST_MAX_IMAGE_COUNT.md) non-blank `imageUris` are refused with an
  [OctopusPrefilledPostTooManyImagesError](../classes/OctopusPrefilledPostTooManyImagesError.md).

Both are thrown synchronously by [openUI](../functions/openUI.md) and [OctopusUIView](../functions/OctopusUIView.md), like their other
`initialScreen` checks, and become a rejection of [navigateToOctopusCreatePost](../functions/navigateToOctopusCreatePost.md).

## Properties

### cta?

> `optional` **cta**: [`OctopusPostCTA`](OctopusPostCTA.md)

A call-to-action button attached to the post.

---

### ~~imageUri?~~

> `optional` **imageUri**: `string`

A single image: a bundled resource name or a `file://` URI — see above. Same as
`imageUris: [imageUri]`; cannot be set together with a non-empty `imageUris`.

#### Deprecated

Use imageUris.

---

### imageUris?

> `optional` **imageUris**: readonly `string`[]

The images the editor opens with, in display order, at most
[OCTOPUS_POST_MAX_IMAGE_COUNT](../variables/OCTOPUS_POST_MAX_IMAGE_COUNT.md). Each entry is a bundled resource name or a `file://`
URI — see above. Blank entries are dropped, and so is an entry that resolves to no image.

---

### text?

> `optional` **text**: `string`

Prefilled post text.

---

### topicId?

> `optional` **topicId**: `string`

The topic (group) the post is created into.
