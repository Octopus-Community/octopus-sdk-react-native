[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusProfile

# Interface: OctopusProfile

The public-facing profile of the connected user.

Exposed via [addProfileListener](../functions/addProfileListener.md) / [getProfile](../functions/getProfile.md). Mirrors the native Android
`OctopusProfile`; the iOS one additionally carries an `isGuest` flag, which this wrapper reads
off the connection state instead (see [OctopusConnectionState](../type-aliases/OctopusConnectionState.md)) — as Android does. Future
profile fields will be added here — **additive only; no breaking changes**.

## Properties

### clientUserId

> **clientUserId**: `string` \| `null`

The connected user's id in **your** app's system, as passed to `connectUser` — the counterpart
of the Octopus profile id.

Populated in SSO mode for a non-guest user; `null` in Octopus-authentication mode (there is no
host-side id) and for a guest. It is held locally by the native SDKs, **independent of the
community's expose-client-user-ids setting** — that setting gates _other_ members' client user
ids, not the connected user's.

---

### entitlements

> **entitlements**: `string`[]

Held entitlement identifiers (opaque tokens defined by the host app).

Display only — the SDK never intersects this set against per-group requirements. Group access
decisions are pre-resolved by the backend and surfaced via [OctopusGroup.canAccess](OctopusGroup.md#canaccess).

The native SDKs model this as a _set_; it crosses the bridge as an array with no duplicates
and no meaningful order — compare it as a set, not by index.
