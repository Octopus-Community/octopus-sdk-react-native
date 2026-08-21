import { eventEmitter } from './internals/eventEmitter';
import { OctopusReactNativeSdk } from './internals/nativeModule';
import { log } from './internals/logger';
import { LogLevel } from './enums/LogLevel.enum';

/**
 * Signs one prefilled share. Receives the fingerprint the SDK computed for the final post
 * content and returns the JWT authorising it, or `null` to publish unsigned.
 */
export type BridgeShareTokenRequestListenerCallback = (
  bridgeFingerprint: string
) => Promise<string | null>;

/**
 * Adds a listener for bridge-share signing requests.
 *
 * This listener is triggered when the user publishes a **prefilled** post (opened through
 * {@link navigateToOctopusCreatePost}) that carries an image, in a community configured to
 * forbid member pictures — the only case the server gates. The SDK computes a SHA-256
 * fingerprint of the final content (text + CTA + image) and asks for a signature over it.
 *
 * You may use this listener directly if you prefer not to use the
 * {@link useBridgeShareTokenProvider} hook.
 *
 * Registering a listener is what tells the native SDK a signer exists: the create-post editor
 * only wires the signing hook when one is registered, so hosts that never call this keep the
 * previous behaviour (prefilled shares are sent unsigned). Call `remove()` on the returned
 * subscription to unregister.
 *
 * @see {@link useBridgeShareTokenProvider} for the platform difference when the callback
 * declines by returning `null`.
 */
export function addBridgeShareTokenRequestListener(
  callback: BridgeShareTokenRequestListenerCallback
) {
  const handleBridgeShareTokenRequest = async (event: {
    requestId: string;
    bridgeFingerprint: string;
  }) => {
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
        error
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
        error
      );
    }
  };

  const subscription = eventEmitter.addListener(
    'bridgeShareTokenRequest',
    handleBridgeShareTokenRequest
  );

  // Announced separately from the event subscription: `NativeEventEmitter` gives the native
  // side no honest way to tell whether a listener for a *specific* event name is still live
  // (see `nativeEventGate.test.ts`), and the native side has to know — on iOS the signing
  // hook has no "proceed unsigned" channel, so wiring it with nobody listening would turn
  // every prefilled image publish into an error.
  Promise.resolve(
    OctopusReactNativeSdk.registerBridgeShareTokenProvider()
  ).catch((error: unknown) => {
    log(
      LogLevel.ERROR,
      'Failed to register the bridge share token provider',
      error
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
          error
        );
      });
    },
  };
}
