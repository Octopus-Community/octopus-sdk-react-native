import { OctopusReactNativeSdk } from './internals/nativeModule';

/**
 * Closes the Octopus UI home screen.
 *
 * On iOS, resolves after the fullscreen UI and any sheets it presented have
 * finished dismissing, so a host can present its own screen immediately after
 * awaiting this promise. Concurrent iOS calls wait for the same dismissal.
 * On Android, resolves immediately after requesting fullscreen closure, without
 * waiting for the Activity to finish.
 *
 * If no fullscreen UI is presented, rejects with `CLOSE_UI_ERROR` on iOS and
 * resolves on Android. Embedded `OctopusUIView` components are not closed.
 */
export function closeUI(): Promise<void> {
  return OctopusReactNativeSdk.closeUI();
}
