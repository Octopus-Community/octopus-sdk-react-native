import type { BridgeShareTokenProvider } from '../useBridgeShareTokenProvider';
import { LogLevel } from '../enums/LogLevel.enum';
import { errorSummary } from './errorSummary';
import { eventEmitter } from './eventEmitter';
import { log } from './logger';
import { OctopusReactNativeSdk } from './nativeModule';

const providers = new Map<string, BridgeShareTokenProvider>();
let nextProviderId = 0;
let subscription: ReturnType<typeof eventEmitter.addListener> | undefined;

async function handleTokenRequest(event: {
  requestId: string;
  bridgeFingerprint: string;
  tokenProviderId?: string;
}) {
  // Requests without an id belong to the global signer (`addBridgeShareTokenRequestListener`).
  if (event.tokenProviderId == null) return;
  const provider = providers.get(event.tokenProviderId);

  let token: string | null = null;
  // An unknown id is a late request for a call that already ended. It is declined rather than
  // ignored, so native never waits out its timeout on it, and it is never handed to another
  // call's provider or to the global signer.
  if (provider) {
    try {
      token = (await provider(event.bridgeFingerprint)) ?? null;
    } catch (error) {
      log(
        LogLevel.ERROR,
        'Failed to provide a bridge share token to Octopus',
        errorSummary(error)
      );
    }
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
}

/**
 * Registers `provider` for one `fetchOrCreateClientObjectRelatedPost` call. The returned `id`
 * travels with the native call, and comes back on every `bridgeShareTokenRequest` that call
 * raises; `remove()` releases the provider once the call has settled.
 */
export function registerPerCallBridgeShareTokenProvider(
  provider: BridgeShareTokenProvider
) {
  const id = `bridge-token-${Date.now()}-${nextProviderId++}`;
  // Subscribe before the native call: the event channel does not buffer requests.
  subscription ??= eventEmitter.addListener(
    'bridgeShareTokenRequest',
    handleTokenRequest
  );
  providers.set(id, provider);
  return {
    id,
    remove: () => {
      providers.delete(id);
      if (providers.size === 0) {
        subscription?.remove();
        subscription = undefined;
      }
    },
  };
}
