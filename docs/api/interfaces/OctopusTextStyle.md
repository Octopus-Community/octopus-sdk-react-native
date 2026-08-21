[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusTextStyle

# Interface: OctopusTextStyle

Font configuration for a specific text type.

## Properties

### fontSize?

> `optional` **fontSize**: [`OctopusFontSize`](OctopusFontSize.md)

Font size configuration

---

### fontType?

> `optional` **fontType**: [`OctopusFontType`](../type-aliases/OctopusFontType.md)

Font type: serif, monospace, or default (uses system default).

This is the narrow, per-style knob: it can only pick one of the three
_system_ font designs. To use a font of your own, set
[OctopusFonts.fontFamily](OctopusFonts.md#fontfamily) on the theme instead — a resolved
`fontFamily` takes precedence over `fontType` on every style (see its
documentation for the full precedence rule).
