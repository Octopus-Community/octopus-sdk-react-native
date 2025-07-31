import { OctopusReactNativeSdk } from './internals/nativeModule';

export function disconnectUser(): Promise<void> {
  return OctopusReactNativeSdk.disconnectUser();
}
