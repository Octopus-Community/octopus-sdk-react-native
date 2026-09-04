[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusInitialScreenCreatePost

# Interface: OctopusInitialScreenCreatePost

The post editor as the initial screen, optionally prefilled with content
supplied by the host app.

[navigateToOctopusCreatePost](../functions/navigateToOctopusCreatePost.md) is the ergonomic shorthand for this
case; both reject with the same [NavigateToOctopusCreatePostError](NavigateToOctopusCreatePostError.md)
codes when the prefill fails native validation.

## Properties

### prefilledPost?

> `optional` **prefilledPost**: [`OctopusPrefilledPost`](OctopusPrefilledPost.md)

Fields to prefill the editor with. Omit for a blank draft.

---

### type

> **type**: `"createPost"`
