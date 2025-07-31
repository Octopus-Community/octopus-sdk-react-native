import { OctopusReactNativeSdk } from './internals/nativeModule';

/**
 * Closes the Octopus UI home screen.
 */
export function closeUI(): Promise<void> {
  return OctopusReactNativeSdk.closeUI();
}
