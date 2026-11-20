import { useEffect, useRef } from 'react';
import { addBridgeShareTokenRequestListener } from './addBridgeShareTokenRequestListener';

/**
 * A function that signs a prefilled (Bridge / Share-in-game) post so the server accepts its
 * image in a community configured to forbid member pictures.
 *
 * @param bridgeFingerprint SHA-256 fingerprint the SDK computed over the final post content
 * (text + CTA + image).
 * @returns A promise resolving to a compact JWT — signed **HS256 with the same shared secret as
 * your SSO tokens** and carrying `bridgeFingerprint` in its `bridge_fingerprint` claim — or
 * `null` to decline signing, which sends the post unsigned.
 *
 * Sign on your backend. The shared secret must never live in the app bundle.
 *
 * This signer shape serves two places: the global signer registered with
 * {@link useBridgeShareTokenProvider} (or {@link addBridgeShareTokenRequestListener}), and the
 * optional per-call `tokenProvider` of {@link fetchOrCreateClientObjectRelatedPost}, which
 * signs that call's post only.
 */
export type BridgeShareTokenProvider = (
  bridgeFingerprint: string
) => Promise<string | null>;

/**
 * React hook that registers a signer for prefilled-share images.
 *
 * Only communities configured to **forbid member pictures** need this: there, the server
 * rejects a prefilled post carrying an image unless the payload is signed. Hosts whose
 * community allows member pictures can skip the hook entirely — nothing else changes when it
 * is absent, and prefilled shares keep being sent unsigned.
 *
 * The hook manages the subscription lifecycle and ensures the latest provider is always used,
 * exactly like {@link useUserTokenProvider}. Register it once, high in the tree, before the
 * host calls {@link navigateToOctopusCreatePost} — the editor reads whether a signer exists
 * when it opens.
 *
 * ### Declining a signature
 * Returning `null`, throwing, or not answering within 60 seconds means "I will not sign this
 * one". On both platforms the post is then sent unsigned and the server decides: a community
 * that allows member pictures publishes it with its images, one that forbids them refuses it
 * and the editor shows an error. Return a real token for every request that must succeed in a
 * pictures-off community.
 *
 * @example
 * ```typescript
 * useBridgeShareTokenProvider(async (bridgeFingerprint) => {
 *   const response = await fetch('https://your-backend.example/octopus/bridge-signature', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ bridgeFingerprint }),
 *   });
 *   if (!response.ok) return null;
 *   const { token } = await response.json();
 *   return token;
 * });
 * ```
 */
export function useBridgeShareTokenProvider(
  bridgeShareTokenProvider: BridgeShareTokenProvider
) {
  const bridgeShareTokenProviderRef = useRef(bridgeShareTokenProvider);

  useEffect(() => {
    bridgeShareTokenProviderRef.current = bridgeShareTokenProvider;
  }, [bridgeShareTokenProvider]);

  useEffect(() => {
    const subscription = addBridgeShareTokenRequestListener((fingerprint) =>
      bridgeShareTokenProviderRef.current(fingerprint)
    );

    return () => {
      subscription.remove();
    };
  }, []);
}
