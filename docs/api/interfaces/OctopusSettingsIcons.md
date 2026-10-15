[**@octopus-community/react-native v1.15.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusSettingsIcons

# Interface: OctopusSettingsIcons

Icons of the settings screens.

## Properties

### ~~account?~~

> `optional` **account**: `ImageResolvedAssetSource`

The account entry, removed from the native 1.15 SDKs with Octopus-owned authentication.

#### Deprecated

No longer displayed by either native SDK since 1.15: user accounts are managed
by your app. This slot is accepted but has no visible effect. It will be removed in a future
major version together with the native SDKs.

---

### ~~deleteAccountWarning?~~

> `optional` **deleteAccountWarning**: `ImageResolvedAssetSource`

The warning shown before an account deletion, removed from the native 1.15 SDKs with
Octopus-owned authentication.

#### Deprecated

No longer displayed by either native SDK since 1.15: user accounts are managed
by your app. This slot is accepted but has no visible effect. It will be removed in a future
major version together with the native SDKs.

---

### help?

> `optional` **help**: `ImageResolvedAssetSource`

The help entry.

**Not drawn at native 1.15.x:** declared by both native SDKs, but no screen reads it at
the current pins, so an override is accepted and has no visible effect.

---

### info?

> `optional` **info**: `ImageResolvedAssetSource`

The information entry.

---

### ~~logout?~~

> `optional` **logout**: `ImageResolvedAssetSource`

The logout entry, removed from the native 1.15 SDKs with Octopus-owned authentication.

#### Deprecated

No longer displayed by either native SDK since 1.15: user accounts are managed
by your app. This slot is accepted but has no visible effect. It will be removed in a future
major version together with the native SDKs.
