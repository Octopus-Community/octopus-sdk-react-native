[**@octopus-community/react-native v1.14.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusScreenStatesIcons

# Interface: OctopusScreenStatesIcons

Illustrations for empty lists and failed first loads, following the iOS reference API.

Drawn in their original colors on both platforms, without tinting. Use illustrations with
a transparent background rather than the small glyphs used for action icons.

## Properties

### emptyContent?

> `optional` **emptyContent**: `ImageResolvedAssetSource`

Displayed on an empty list of posts or comments.

---

### emptyNotifications?

> `optional` **emptyNotifications**: `ImageResolvedAssetSource`

Displayed on an empty list of notifications.

---

### error?

> `optional` **error**: `ImageResolvedAssetSource`

Displayed when a first load failed for any other reason.

---

### networkError?

> `optional` **networkError**: `ImageResolvedAssetSource`

Displayed when a first load failed because the device is offline.
