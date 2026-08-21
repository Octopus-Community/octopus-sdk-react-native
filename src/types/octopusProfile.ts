/**
 * The public-facing profile of the connected user.
 *
 * Exposed via {@link addProfileListener} / {@link getProfile}. Mirrors the native Android
 * `OctopusProfile`; the iOS one additionally carries an `isGuest` flag, which this wrapper reads
 * off the connection state instead (see {@link OctopusConnectionState}) — as Android does. Future
 * profile fields will be added here — **additive only; no breaking changes**.
 */
export interface OctopusProfile {
  /**
   * Held entitlement identifiers (opaque tokens defined by the host app).
   *
   * Display only — the SDK never intersects this set against per-group requirements. Group access
   * decisions are pre-resolved by the backend and surfaced via {@link OctopusGroup.canAccess}.
   *
   * The native SDKs model this as a *set*; it crosses the bridge as an array with no duplicates
   * and no meaningful order — compare it as a set, not by index.
   */
  entitlements: string[];
  /**
   * The connected user's id in **your** app's system, as passed to `connectUser` — the counterpart
   * of the Octopus profile id.
   *
   * Populated in SSO mode for a non-guest user; `null` in Octopus-authentication mode (there is no
   * host-side id) and for a guest. It is held locally by the native SDKs, **independent of the
   * community's expose-client-user-ids setting** — that setting gates *other* members' client user
   * ids, not the connected user's.
   */
  clientUserId: string | null;
}
