[**@octopus-community/react-native v1.14.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusCommonIcons

# Interface: OctopusCommonIcons

Icons shared across screens.

## Properties

### activityButton?

> `optional` **activityButton**: `ImageResolvedAssetSource`

The activity button, shown in place of the connected user's avatar on the home floating
button when Unified Profile is active.

---

### checkbox?

> `optional` **checkbox**: [`OctopusIconOnOff`](OctopusIconOnOff.md)

Checkbox pair. Absent: the native default pair.

**Android caveat (native 1.13.x):** the Android SDK draws the platform checkbox and does
not read this pair, so an override only shows on iOS.

---

### listCellNavIndicator?

> `optional` **listCellNavIndicator**: `ImageResolvedAssetSource`

The navigation indicator (right arrow) of list cells.

---

### moreActions?

> `optional` **moreActions**: `ImageResolvedAssetSource`

The overflow "more actions" button.

---

### radio?

> `optional` **radio**: [`OctopusIconOnOff`](OctopusIconOnOff.md)

Radio button pair. Absent: the native default pair (the platform widget on Android).

---

### toggle?

> `optional` **toggle**: [`OctopusIconOnOff`](OctopusIconOnOff.md)

Toggle pair. Absent: the native default pair (the platform switch on Android).
