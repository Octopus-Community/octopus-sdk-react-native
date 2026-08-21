import { eventEmitter } from './internals/eventEmitter';
import type { OctopusCommunityData } from './types/octopusCommunityData';

export type CommunityDataListenerCallback = (
  data: OctopusCommunityData | null
) => void;

/**
 * Adds a listener for updates from the observation started by
 * {@link startObservingCommunityData}. Called with `null` when the observed member is unknown.
 *
 * @param callback - Function called with the latest community data.
 * @returns A subscription object with a `remove()` method to unsubscribe.
 * @see {@link startObservingCommunityData} – start the observation this listener receives.
 */
export function addCommunityDataListener(
  callback: CommunityDataListenerCallback
) {
  return eventEmitter.addListener(
    'communityDataChanged',
    (data: OctopusCommunityData | null) => {
      callback(data);
    }
  );
}
