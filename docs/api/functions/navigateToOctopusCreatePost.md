[**@octopus-community/react-native v1.15.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / navigateToOctopusCreatePost

# Function: navigateToOctopusCreatePost()

> **navigateToOctopusCreatePost**(`prefilledPost?`): `Promise`\<`void`\>

Opens the Octopus UI directly on the post-creation editor, optionally prefilled.
The editor is the navigation root: cancelling (after confirming any discard) or
publishing successfully closes the fullscreen UI instead of revealing the feed.

To configure profile-tap interception, use
`openUI({ initialScreen: { type: 'createPost', prefilledPost }, interceptProfileTaps: true })`.
This shorthand accepts prefill fields only.

## Parameters

### prefilledPost?

[`OctopusPrefilledPost`](../interfaces/OctopusPrefilledPost.md)

Fields to prefill the editor with. Omit for a blank draft.

## Returns

`Promise`\<`void`\>

A promise that resolves once the UI has been opened.

## Throws

A [NavigateToOctopusCreatePostError](../interfaces/NavigateToOctopusCreatePostError.md) when `prefilledPost` fails native
validation — see [isNavigateToOctopusCreatePostError](isNavigateToOctopusCreatePostError.md).

## Example

```typescript
await navigateToOctopusCreatePost({
  text: 'Hello from the host app',
  cta: { url: 'https://example.com', label: 'Learn more' },
});
```
