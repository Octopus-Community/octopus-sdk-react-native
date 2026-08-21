[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusConnected

# Interface: OctopusConnected

A user is connected. The connection may be a regular authenticated user or an anonymous guest —
see [OctopusConnected.isGuest](#isguest).

## Properties

### connected

> **connected**: `true`

---

### isGuest

> **isGuest**: `boolean`

Whether the connected user is a guest (anonymous) session.

Reported on both platforms: Android exposes it natively; iOS exposes it via
`OctopusProfile.isGuest` since native SDK 1.12.6 (older iOS SDKs always reported `false`). To
gate features on a fully authenticated user, prefer [isUserConnected](../functions/isUserConnected.md) (`true` only for a
connected, non-guest user).
