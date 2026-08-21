import { OctopusReactNativeSdk } from './internals/nativeModule';

/**
 * Stops the active community-data observation started by {@link startObservingCommunityData}.
 * A no-op if no observation is active.
 *
 * @returns A promise that resolves once the observation has been torn down.
 */
export function stopObservingCommunityData(): Promise<void> {
  return OctopusReactNativeSdk.stopObservingCommunityData();
}
