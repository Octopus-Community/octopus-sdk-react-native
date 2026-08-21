// Parity wave — lifecycle
import { OctopusReactNativeSdk } from './internals/nativeModule';
import { setIsInitialised } from './internals/initialisationState';
import { publishIsInitialised } from './internals/stateChannels';

/**
 * Fully stops the Octopus SDK: disconnects the current user and releases every native
 * resource the SDK holds. After this resolves, {@link isInitialised} returns `false` and
 * the SDK must be re-created with {@link initialize} (or {@link switchCommunity}) before
 * it can be used again.
 *
 * **Platform note on bridge subscriptions — this differs by platform, not just by
 * mechanism:**
 * - On iOS, this cancels the bridge's own Combine subscriptions (there is no matching
 *   native teardown to run underneath — iOS has no native `stop` primitive, so this call
 *   is a best-effort approximation: disconnect the user, then release the bridge's own SDK
 *   instance).
 * - On Android, the reactive collection jobs (notification counts, community-access state,
 *   SDK events, …) are deliberately left running: native `OctopusSDK.stop()` does not
 *   complete those Flows, it only makes them stop emitting until the SDK is initialised
 *   again, so nothing needs to be cancelled or restarted on this side either.
 *
 * Once this resolves, {@link addIsInitialisedListener} subscribers receive `false`.
 *
 * @returns A promise that resolves when the SDK has stopped.
 * @throws An error if the call fails.
 * @see {@link initialize}
 * @see {@link switchCommunity}
 * @see {@link reset}
 */
export async function stop(): Promise<void> {
  await OctopusReactNativeSdk.stop();
  setIsInitialised(false);
  // Parity wave — state streams: mirror `initialize()`. iOS never emits
  // `isInitialisedChanged` on `stop()` (it only emits from `startObservingReactiveEvents`
  // and the snapshot), so without this publish an iOS `addIsInitialisedListener`
  // subscriber never observes the stop. Android does emit through its lifetime collector,
  // asynchronously and with no ordering guarantee against this promise — publishing here
  // makes the transition deterministic on both, and the native duplicate is collapsed by
  // the channel's `equals`.
  publishIsInitialised(false);
}
