[**@octopus-community/react-native v1.15.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusProfileIcons

# Interface: OctopusProfileIcons

Icons of the profile and notification screens.

## Properties

### addBio?

> `optional` **addBio**: `ImageResolvedAssetSource`

Adds a bio.

---

### addPicture?

> `optional` **addPicture**: `ImageResolvedAssetSource`

Adds a profile picture.

---

### blockUser?

> `optional` **blockUser**: `ImageResolvedAssetSource`

Blocks a user.

---

### editPicture?

> `optional` **editPicture**: `ImageResolvedAssetSource`

Edits the profile picture.

---

### ~~emptyNotifications?~~

> `optional` **emptyNotifications**: `ImageResolvedAssetSource`

Illustration of an empty notification list.

Native 1.15 on iOS and Android renders [OctopusScreenStatesIcons.emptyNotifications](OctopusScreenStatesIcons.md#emptynotifications)
instead. This per-feature slot is accepted but has no visible effect with the native 1.15 SDKs.

#### Deprecated

Use [OctopusScreenStatesIcons.emptyNotifications](OctopusScreenStatesIcons.md#emptynotifications) via
`theme.icons.screenStates.emptyNotifications` instead. This slot has no visible effect.
It will be removed in a future major version together with the native SDKs.

---

### notConnected?

> `optional` **notConnected**: `ImageResolvedAssetSource`

The avatar shown when the user is not connected (error state).

**Android caveat (native 1.15.x):** the Android SDK declares this slot but no screen reads
it, so an override only shows on iOS.

---

### report?

> `optional` **report**: `ImageResolvedAssetSource`

Reports a profile.
