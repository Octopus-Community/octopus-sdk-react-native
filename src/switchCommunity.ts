// Parity wave — lifecycle
import { OctopusReactNativeSdk } from './internals/nativeModule';
import { setIsInitialised } from './internals/initialisationState';
import { publishIsInitialised } from './internals/stateChannels';
import type { InitializeParams } from './initialize';
import type { ApiServer } from './types/apiServer';

/**
 * Configuration params for {@link switchCommunity}.
 *
 * Reuses the same discriminated `connectionMode` union as {@link InitializeParams} — SSO
 * or Octopus-managed — for consistency with {@link initialize}, rather than exposing two
 * separate functions.
 */
export interface SwitchCommunityParams {
  /** The API key that identifies the community to switch to. */
  apiKey: string;
  /**
   * The connection mode to use on the new community.
   * - `sso`: Use Single Sign-On with your existing user system
   * - `octopus`: Let Octopus handle user authentication
   */
  connectionMode: InitializeParams['connectionMode'];
  /**
   * Optional custom server endpoint the SDK routes its gRPC traffic to on the new
   * community. Omit it to use the Octopus default endpoint.
   */
  apiServer?: ApiServer;
}

/**
 * Switches the SDK to a different community (a different API key) at runtime.
 *
 * This:
 * - Resets the SDK (disconnects the user and clears all locally cached data)
 * - Reinitializes the SDK with the new community configuration
 *
 * After this resolves, the user needs to be reconnected on the new community (e.g. via
 * {@link connectUser}). This call is safe even if the SDK is not currently initialised —
 * it initialises it directly on the new community in that case, on both platforms
 * including reactive events ({@link isInitialised}'s counterparts: notification counts,
 * community-access state, SDK events all start emitting for the new community too).
 *
 * **You must remount `<OctopusUIView>` after switching.** Change the `key` prop you pass
 * to `<OctopusUIView>` (e.g. to the new community's API key) so React re-creates the
 * native view for the new community, instead of reusing the one bound to the previous
 * community.
 *
 * **Known limitation on Android:** natively, `switchCommunity` is implemented as
 * `reset()` + `initialize()`. If the `initialize()` half throws, the SDK is left
 * uninitialised, but {@link isInitialised} on the JS side keeps whatever value it had
 * before the call (this function only flips it to `true` on success). This is a
 * best-effort tracking choice, not a bug fix target for this API — check the promise
 * rejection rather than {@link isInitialised} to detect a failed switch.
 *
 * @param params - See {@link SwitchCommunityParams}.
 * @returns A promise that resolves when the switch completes.
 * @throws An error if the call fails.
 * @see {@link initialize}
 * @see {@link reset}
 * @see {@link stop}
 *
 * @example
 * ```typescript
 * await switchCommunity({
 *   apiKey: 'new-community-api-key',
 *   connectionMode: { type: 'octopus' },
 * });
 * // Then remount the embedded UI, e.g.:
 * // <OctopusUIView key="new-community-api-key" ... />
 * await connectUser(user);
 * ```
 */
export function switchCommunity(params: SwitchCommunityParams): Promise<void> {
  return OctopusReactNativeSdk.switchCommunity(params).then(() => {
    setIsInitialised(true);
    // Parity wave — state streams: mirror `initialize()`, which already publishes here for
    // the same reason — the native sides do not agree on whether (or when) they emit
    // `isInitialisedChanged` around a lifecycle call. Publishing on resolve makes the
    // `addIsInitialisedListener` channel deterministic on both platforms; a native event
    // carrying the same value is collapsed by the channel's `equals`.
    publishIsInitialised(true);
  });
}
