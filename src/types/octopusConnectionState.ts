/**
 * No user is currently connected to the Octopus platform.
 */
export interface OctopusNotConnected {
  connected: false;
}

/**
 * A user is connected. The connection may be a regular authenticated user or an anonymous guest —
 * see {@link OctopusConnected.isGuest}.
 */
export interface OctopusConnected {
  connected: true;
  /**
   * Whether the connected user is a guest (anonymous) session.
   *
   * Reported on both platforms: Android exposes it natively; iOS exposes it via
   * `OctopusProfile.isGuest` since native SDK 1.12.6 (older iOS SDKs always reported `false`). To
   * gate features on a fully authenticated user, prefer {@link isUserConnected} (`true` only for a
   * connected, non-guest user).
   */
  isGuest: boolean;
}

/**
 * Reactive snapshot of the SDK's user-connection state.
 *
 * Exposed via {@link addConnectionStateListener} / {@link getConnectionState}. Mirrors the native
 * Android `ConnectionState` sealed interface (`NotConnected` / `Connected`). On iOS it is derived
 * from the native `profile` publisher, and the guest flag is read from the profile (native iOS
 * 1.12.6+).
 *
 * Discriminate on `connected`:
 *
 * ```typescript
 * if (state.connected) {
 *   console.log(state.isGuest ? 'guest session' : 'authenticated user');
 * }
 * ```
 */
export type OctopusConnectionState = OctopusNotConnected | OctopusConnected;
