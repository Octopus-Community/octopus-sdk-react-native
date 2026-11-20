[**@octopus-community/react-native v1.16.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / fetchOrCreateClientObjectRelatedPost

# Function: fetchOrCreateClientObjectRelatedPost()

> **fetchOrCreateClientObjectRelatedPost**(`clientPost`, `tokenProvider?`): `Promise`\<[`OctopusPost`](../interfaces/OctopusPost.md)\>

Returns the Octopus post linked to one of your own objects, creating it on first call.

The post is looked up by [ClientPost.objectId](../interfaces/ClientPost.md#objectid). If none exists yet it is created from
`clientPost`; if one already exists it is returned untouched — **the content is only used
for the creation**, so editing `text`, `medias` or `catchPhrase` later never rewrites a
post that already exists. Call it every time you display your object: it is the idempotent
way to get the post id for the embedded UI, and to seed the counters you render with
[formatOctopusCompactCount](formatOctopusCompactCount.md).

## Signing the post

A community configured to forbid member pictures refuses an unsigned image. Pass a
`tokenProvider` to sign this call's post. Concurrent calls can each use a different signer;
each receives only the fingerprint for its own call, and is released when that call ends.

When `tokenProvider` is omitted or is not a function, the signer registered with
[addBridgeShareTokenRequestListener](addBridgeShareTokenRequestListener.md) (or [useBridgeShareTokenProvider](useBridgeShareTokenProvider.md)) is used.
A host that already registered one for the create-post editor needs no extra wiring here.
With no signer, a `null` reply, a thrown provider error or no reply within 60 seconds, the
post is created unsigned. A per-call provider that declines does not invoke the global one.
In TypeScript, map posts with `.map((p) => fetchOrCreateClientObjectRelatedPost(p))`
so the array index is not passed as `tokenProvider`.

## Parameters

### clientPost

[`ClientPost`](../interfaces/ClientPost.md)

The object to link, and the content to create the post from.

### tokenProvider?

[`BridgeShareTokenProvider`](../type-aliases/BridgeShareTokenProvider.md)

Optional signer for this call only. Receives the bridge fingerprint
and resolves to a JWT, or `null` to publish unsigned. Sign on your backend; never put the
shared secret in the app. Non-function values are ignored, defaulting to the global
bridge-share token listener.

## Returns

`Promise`\<[`OctopusPost`](../interfaces/OctopusPost.md)\>

A promise resolving to the existing or freshly created post.

## Throws

A [ClientPostError](../interfaces/ClientPostError.md) — see [isClientPostError](isClientPostError.md) to narrow it.

## Example

```typescript
try {
  const post = await fetchOrCreateClientObjectRelatedPost({
    objectId: article.id,
    text: article.summary,
    medias: [
      { type: 'remoteImage', url: article.coverUrl },
      { type: 'localImage', uri: 'file:///path/to/thumbnail.jpg' },
    ],
    catchPhrase: 'What do you think about this?',
    viewObjectButton: OctopusLocalizedText.perLanguage(
      { en: 'Read the article', fr: "Lire l'article" },
      'en'
    ),
  });
  setCommentCount(formatOctopusCompactCount(post.commentCount));
} catch (error) {
  if (isClientPostError(error)) {
    console.warn(`bridge post failed — ${error.code}: ${error.message}`);
  }
}
```
