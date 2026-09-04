[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / fetchOrCreateClientObjectRelatedPost

# Function: fetchOrCreateClientObjectRelatedPost()

> **fetchOrCreateClientObjectRelatedPost**(`clientPost`): `Promise`\<[`OctopusPost`](../interfaces/OctopusPost.md)\>

Returns the Octopus post linked to one of your own objects, creating it on first call.

The post is looked up by [ClientPost.objectId](../interfaces/ClientPost.md#objectid). If none exists yet it is created from
`clientPost`; if one already exists it is returned untouched — **the content is only used
for the creation**, so editing `text`, `attachment` or `catchPhrase` later never rewrites a
post that already exists. Call it every time you display your object: it is the idempotent
way to get the post id for the embedded UI, and to seed the counters you render with
[formatOctopusCompactCount](formatOctopusCompactCount.md).

## Signing the post

A community configured to forbid member pictures refuses an unsigned image. Register a
signer with [addBridgeShareTokenRequestListener](addBridgeShareTokenRequestListener.md) (or the
[useBridgeShareTokenProvider](useBridgeShareTokenProvider.md) hook) **before** calling this, and the native SDK will
ask it for a bridge signature while creating the post.

The native SDKs take the signer as a per-call parameter; this wrapper takes it from the
globally registered listener instead — see the divergence note below. One consequence worth
knowing: the same signer serves this call and the create-post editor's prefilled share, so
a host that already registered one for the editor needs no extra wiring here.

## Parameters

### clientPost

[`ClientPost`](../interfaces/ClientPost.md)

The object to link, and the content to create the post from.

## Returns

`Promise`\<[`OctopusPost`](../interfaces/OctopusPost.md)\>

A promise resolving to the existing or freshly created post.

## Throws

A [ClientPostError](../interfaces/ClientPostError.md) — see [isClientPostError](isClientPostError.md) to narrow it.

## Remarks

**Accepted divergence from the native SDKs.** Android's
`fetchOrCreateClientObjectRelatedPost(clientPost, tokenProvider)` and iOS's
`fetchOrCreateClientObjectRelatedPost(content:tokenProvider:)` both take the token provider
as a call parameter. A `suspend` lambda / `async` closure cannot cross the React Native
bridge, so this wrapper reuses the `bridgeShareTokenRequest` round-trip that already exists
for the create-post editor: the provider is registered once, globally, and the native side
consults it whenever it needs a signature. The observable behaviour is the same except that
two concurrent calls cannot use two different signers.

## Example

```typescript
try {
  const post = await fetchOrCreateClientObjectRelatedPost({
    objectId: article.id,
    text: article.summary,
    attachment: { type: 'remoteImage', url: article.coverUrl },
    catchPhrase: 'What do you think about this?',
    viewObjectButtonText: 'Read the article',
  });
  setCommentCount(formatOctopusCompactCount(post.commentCount));
} catch (error) {
  if (isClientPostError(error)) {
    console.warn(`bridge post failed — ${error.code}: ${error.message}`);
  }
}
```
