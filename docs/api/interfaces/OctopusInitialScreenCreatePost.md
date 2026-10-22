[**@octopus-community/react-native v1.15.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusInitialScreenCreatePost

# Interface: OctopusInitialScreenCreatePost

The post editor as the initial screen, optionally prefilled with content
supplied by the host app.

The editor is the navigation root. Cancelling (after confirming any discard)
or publishing successfully closes the fullscreen UI. In an Android embedded
view, these actions fire `onBackRequested`; the host must dismiss its view.
Android system back follows the same path as cancelling.

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
