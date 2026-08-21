import { OctopusReactNativeSdk } from './internals/nativeModule';
import type { ClientPost } from './types/clientPost';
import type { OctopusPost } from './types/octopusPost';

/**
 * Returns the Octopus post linked to one of your own objects, creating it on first call.
 *
 * The post is looked up by {@link ClientPost.objectId}. If none exists yet it is created from
 * `clientPost`; if one already exists it is returned untouched — **the content is only used
 * for the creation**, so editing `text`, `attachment` or `catchPhrase` later never rewrites a
 * post that already exists. Call it every time you display your object: it is the idempotent
 * way to get the post id for the embedded UI, and to seed the counters you render with
 * {@link formatOctopusCompactCount}.
 *
 * ## Signing the post
 *
 * A community configured to forbid member pictures refuses an unsigned image. Register a
 * signer with {@link addBridgeShareTokenRequestListener} (or the
 * {@link useBridgeShareTokenProvider} hook) **before** calling this, and the native SDK will
 * ask it for a bridge signature while creating the post.
 *
 * The native SDKs take the signer as a per-call parameter; this wrapper takes it from the
 * globally registered listener instead — see the divergence note below. One consequence worth
 * knowing: the same signer serves this call and the create-post editor's prefilled share, so
 * a host that already registered one for the editor needs no extra wiring here.
 *
 * @param clientPost - The object to link, and the content to create the post from.
 * @returns A promise resolving to the existing or freshly created post.
 * @throws A {@link ClientPostError} — see {@link isClientPostError} to narrow it.
 *
 * @remarks
 * **Accepted divergence from the native SDKs.** Android's
 * `fetchOrCreateClientObjectRelatedPost(clientPost, tokenProvider)` and iOS's
 * `fetchOrCreateClientObjectRelatedPost(content:tokenProvider:)` both take the token provider
 * as a call parameter. A `suspend` lambda / `async` closure cannot cross the React Native
 * bridge, so this wrapper reuses the `bridgeShareTokenRequest` round-trip that already exists
 * for the create-post editor: the provider is registered once, globally, and the native side
 * consults it whenever it needs a signature. The observable behaviour is the same except that
 * two concurrent calls cannot use two different signers.
 *
 * @example
 * ```typescript
 * try {
 *   const post = await fetchOrCreateClientObjectRelatedPost({
 *     objectId: article.id,
 *     text: article.summary,
 *     attachment: { type: 'remoteImage', url: article.coverUrl },
 *     catchPhrase: 'What do you think about this?',
 *     viewObjectButtonText: 'Read the article',
 *   });
 *   setCommentCount(formatOctopusCompactCount(post.commentCount));
 * } catch (error) {
 *   if (isClientPostError(error)) {
 *     console.warn(`bridge post failed — ${error.code}: ${error.message}`);
 *   }
 * }
 * ```
 */
export function fetchOrCreateClientObjectRelatedPost(
  clientPost: ClientPost
): Promise<OctopusPost> {
  // Everything is inside the try so this function *always* returns a promise. Reading
  // `clientPost.objectId` off a null argument, or touching the native module when it failed
  // to link, throws synchronously — and a synchronous throw would bypass the `catch` the
  // docs above tell callers to write, landing as an uncaught exception instead.
  try {
    // Normalised rather than forwarded as-is: the bridge drops `undefined` keys on Android
    // but carries them as `null` on iOS, and the native decoders read "absent" and "null" the
    // same way only if every optional key is explicitly one or the other.
    return OctopusReactNativeSdk.fetchOrCreateClientObjectRelatedPost({
      objectId: clientPost.objectId,
      text: clientPost.text,
      attachment: clientPost.attachment ?? null,
      catchPhrase: clientPost.catchPhrase ?? null,
      viewObjectButtonText: clientPost.viewObjectButtonText ?? null,
      groupId: clientPost.groupId ?? null,
    });
  } catch (error: unknown) {
    return Promise.reject(error);
  }
}
