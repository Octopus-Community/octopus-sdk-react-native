import { OctopusReactNativeSdk } from './internals/nativeModule';

/**
 * Opens the Octopus UI home screen.
 */
export function openUI(): Promise<void> {
  return OctopusReactNativeSdk.openUI();
}
