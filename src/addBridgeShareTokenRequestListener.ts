import { eventEmitter } from './internals/eventEmitter';
import { OctopusReactNativeSdk } from './internals/nativeModule';
import { log } from './internals/logger';
import { errorSummary } from './internals/errorSummary';
import { LogLevel } from './enums/LogLevel.enum';

/**
 * Signs one prefilled share, or one {@link fetchOrCreateClientObjectRelatedPost} call made
 * without its own `tokenProvider`. Receives the fingerprint the SDK computed for the final post
 * content and returns the JWT authorising it, or `null` to publish unsigned.
 */
export type BridgeShareTokenRequestListenerCallback = (
  bridgeFingerprint: string
) => Promise<string | null>;

/**
 * Adds a listener for bridge-share signing requests.
 *
 * This listener is triggered when a post carrying an image is about to be published in a
 * community configured to forbid member pictures — the only case the server gates. The SDK
 * computes a SHA-256 fingerprint of the final content (text + CTA + image) and asks for a
 * signature over it. Two paths raise that request:
 *  - the user publishes a **prefilled** post, opened through {@link navigateToOctopusCreatePost};
 *  - {@link fetchOrCreateClientObjectRelatedPost} creates a post and was called **without** a
 *    `tokenProvider`. A call that passes its own `tokenProvider` is signed by that provider
 *    only: this listener never sees its requests.
 *
 * You may use this listener directly if you prefer not to use the
 * {@link useBridgeShareTokenProvider} hook.
 *
 * Registering a listener is what tells the native SDK a signer exists: the create-post editor
 * only wires the signing hook when one is registered, so hosts that never call this keep the
 * previous behaviour (prefilled shares are sent unsigned). Call `remove()` on the returned
 * subscription to unregister.
 *
 * @see {@link useBridgeShareTokenProvider} for what happens when the callback declines by
 * returning `null`: the post is sent unsigned, on both platforms.
 */
export function addBridgeShareTokenRequestListener(
  callback: BridgeShareTokenRequestListenerCallback
) {
  const handleBridgeShareTokenRequest = async (event: {
    requestId: string;
    bridgeFingerprint: string;
    tokenProviderId?: string;
  }) => {
    // Raised by a `fetchOrCreateClientObjectRelatedPost` call that brought its own signer:
    // answered by that signer (internals/bridgeShareTokenProviders.ts), never by this one.
    if (event.tokenProviderId != null) return;
    let token: string | null = null;
    try {
      token = (await callback(event.bridgeFingerprint)) ?? null;
    } catch (error) {
      // A signer that throws is reported as a declined signature rather than left unanswered:
      // the native side is holding a publish open on this reply, and never answering would
      // hang the editor until the bridge's own timeout.
      log(
        LogLevel.ERROR,
        'Failed to provide a bridge share token to Octopus',
        errorSummary(error)
      );
      token = null;
    }
    try {
      await OctopusReactNativeSdk.completeBridgeShareTokenRequest(
        event.requestId,
        token
      );
    } catch (error) {
      log(
        LogLevel.ERROR,
        'Failed to hand the bridge share token back to Octopus',
        errorSummary(error)
      );
    }
  };

  const subscription = eventEmitter.addListener(
    'bridgeShareTokenRequest',
    handleBridgeShareTokenRequest
  );

  // Announced separately from the event subscription: `NativeEventEmitter` gives the native
  // side no honest way to tell whether a listener for a *specific* event name is still live
  // (see `nativeEventGate.test.ts`), and the native side has to know: wiring the signing hook
  // with nobody listening would hold every prefilled image publish for the whole 60 s timeout
  // before sending it unsigned.
  Promise.resolve(
    OctopusReactNativeSdk.registerBridgeShareTokenProvider()
  ).catch((error: unknown) => {
    log(
      LogLevel.ERROR,
      'Failed to register the bridge share token provider',
      errorSummary(error)
    );
  });

  return {
    remove: () => {
      subscription.remove();
      Promise.resolve(
        OctopusReactNativeSdk.unregisterBridgeShareTokenProvider()
      ).catch((error: unknown) => {
        log(
          LogLevel.ERROR,
          'Failed to unregister the bridge share token provider',
          errorSummary(error)
        );
      });
    },
  };
}
