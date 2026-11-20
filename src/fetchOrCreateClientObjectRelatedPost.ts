import { OctopusReactNativeSdk } from './internals/nativeModule';
import { registerPerCallBridgeShareTokenProvider } from './internals/bridgeShareTokenProviders';
import {
  localizedTextToWire,
  NO_NATIVE_LOCALIZED_TEXT,
  withLanguageCode,
} from './internals/localizedText';
import type { NativeLocalizedText } from './internals/localizedText';
import type { ClientPost } from './types/clientPost';
import type { OctopusPost } from './types/octopusPost';
import type { BridgeShareTokenProvider } from './useBridgeShareTokenProvider';

/**
 * Returns the Octopus post linked to one of your own objects, creating it on first call.
 *
 * The post is looked up by {@link ClientPost.objectId}. If none exists yet it is created from
 * `clientPost`; if one already exists it is returned untouched — **the content is only used
 * for the creation**, so editing `text`, `medias` or `catchPhrase` later never rewrites a
 * post that already exists. Call it every time you display your object: it is the idempotent
 * way to get the post id for the embedded UI, and to seed the counters you render with
 * {@link formatOctopusCompactCount}.
 *
 * ## Signing the post
 *
 * A community configured to forbid member pictures refuses an unsigned image. Pass a
 * `tokenProvider` to sign this call's post. Concurrent calls can each use a different signer;
 * each receives only the fingerprint for its own call, and is released when that call ends.
 *
 * When `tokenProvider` is omitted or is not a function, the signer registered with
 * {@link addBridgeShareTokenRequestListener} (or {@link useBridgeShareTokenProvider}) is used.
 * A host that already registered one for the create-post editor needs no extra wiring here.
 * With no signer, a `null` reply, a thrown provider error or no reply within 60 seconds, the
 * post is created unsigned. A per-call provider that declines does not invoke the global one.
 * In TypeScript, map posts with `.map((p) => fetchOrCreateClientObjectRelatedPost(p))`
 * so the array index is not passed as `tokenProvider`.
 *
 * @param clientPost - The object to link, and the content to create the post from.
 * @param tokenProvider - Optional signer for this call only. Receives the bridge fingerprint
 * and resolves to a JWT, or `null` to publish unsigned. Sign on your backend; never put the
 * shared secret in the app. Non-function values are ignored, defaulting to the global
 * bridge-share token listener.
 * @returns A promise resolving to the existing or freshly created post.
 * @throws A {@link ClientPostError} — see {@link isClientPostError} to narrow it.
 *
 * @example
 * ```typescript
 * try {
 *   const post = await fetchOrCreateClientObjectRelatedPost({
 *     objectId: article.id,
 *     text: article.summary,
 *     medias: [
 *       { type: 'remoteImage', url: article.coverUrl },
 *       { type: 'localImage', uri: 'file:///path/to/thumbnail.jpg' },
 *     ],
 *     catchPhrase: 'What do you think about this?',
 *     viewObjectButton: OctopusLocalizedText.perLanguage(
 *       { en: 'Read the article', fr: "Lire l'article" },
 *       'en'
 *     ),
 *   });
 *   setCommentCount(formatOctopusCompactCount(post.commentCount));
 * } catch (error) {
 *   if (isClientPostError(error)) {
 *     console.warn(`bridge post failed — ${error.code}: ${error.message}`);
 *   }
 * }
 * ```
 */
export async function fetchOrCreateClientObjectRelatedPost(
  clientPost: ClientPost,
  tokenProvider?: BridgeShareTokenProvider
): Promise<OctopusPost> {
  // `async`, so this function *always* returns a promise: reading `clientPost.objectId` off a
  // null argument, or touching the native module when it failed to link, rejects instead of
  // throwing synchronously past the `catch` the docs above tell callers to write.

  // Refused here, before any native call, so both platforms reject the same way. The native
  // SDKs refuse it too (Android throws, iOS has no initializer taking both).
  if (
    clientPost.attachment != null &&
    clientPost.medias != null &&
    clientPost.medias.length > 0
  ) {
    throw Object.assign(
      new Error(
        'set medias only — attachment is deprecated and cannot be combined with medias'
      ),
      { code: 'INVALID_ARGS' }
    );
  }
  const button = viewObjectButtonToWire(clientPost);
  // Registered before the native call (the event channel does not buffer requests) and
  // released only once that call has settled.
  const provider =
    typeof tokenProvider === 'function'
      ? registerPerCallBridgeShareTokenProvider(tokenProvider)
      : undefined;
  try {
    // Normalised rather than forwarded as-is: the bridge drops `undefined` keys on Android
    // but carries them as `null` on iOS, and the native decoders read "absent" and "null" the
    // same way only if every optional key is explicitly one or the other.
    return await OctopusReactNativeSdk.fetchOrCreateClientObjectRelatedPost(
      {
        objectId: clientPost.objectId,
        text: clientPost.text,
        attachment: clientPost.attachment ?? null,
        medias:
          clientPost.medias != null && clientPost.medias.length > 0
            ? [...clientPost.medias]
            : null,
        catchPhrase: clientPost.catchPhrase ?? null,
        viewObjectButtonText: button.text,
        viewObjectButtonLanguage: button.language,
        viewObjectButtonTexts: button.texts,
        groupId: clientPost.groupId ?? null,
      },
      provider?.id ?? null
    );
  } catch (error: unknown) {
    throw withLanguageCode(error);
  } finally {
    provider?.remove();
  }
}

/**
 * The button label's wire fields: `viewObjectButton`, else the deprecated `viewObjectButtonText`
 * as an auto-translated label.
 *
 * @throws An `INVALID_ARGS` error when both are set, or when `viewObjectButton` is not an
 * `OctopusLocalizedText` — refused here, before any native call, like `attachment` + `medias`.
 */
function viewObjectButtonToWire(clientPost: ClientPost): NativeLocalizedText {
  const { viewObjectButton, viewObjectButtonText } = clientPost;
  if (viewObjectButton != null && viewObjectButtonText != null) {
    throw Object.assign(
      new Error(
        'set viewObjectButton only — viewObjectButtonText is deprecated and cannot be combined with viewObjectButton'
      ),
      { code: 'INVALID_ARGS' }
    );
  }
  if (viewObjectButton == null) {
    return { ...NO_NATIVE_LOCALIZED_TEXT, text: viewObjectButtonText ?? null };
  }
  try {
    return localizedTextToWire(viewObjectButton, 'viewObjectButton');
  } catch (error: unknown) {
    throw Object.assign(error as Error, { code: 'INVALID_ARGS' });
  }
}
