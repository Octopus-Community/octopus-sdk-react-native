[**@octopus-community/react-native v1.14.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusIconOnOff

# Interface: OctopusIconOnOff

A two-state icon pair (radio button, checkbox, toggle).

Both images are required: the native SDKs only accept a complete pair. A pair missing one
side is dropped by `initialize()` with a warning, and the native default pair is kept.

## Properties

### off

> **off**: `ImageResolvedAssetSource`

Displayed when the control is off.

---

### on

> **on**: `ImageResolvedAssetSource`

Displayed when the control is on.
