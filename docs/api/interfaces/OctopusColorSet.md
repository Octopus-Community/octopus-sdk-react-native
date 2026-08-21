[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusColorSet

# Interface: OctopusColorSet

Color set for a specific appearance mode (light or dark).

Every color is an optional hex string in one of these forms, with or without the
leading `#`: `#RRGGBB`, the `#RGB` shorthand, or `#AARRGGBB` to carry alpha.
**Alpha comes first**, as both native SDKs read it — an 8-digit value is _not_ the
`#RRGGBBAA` of CSS. Whichever form you use is rewritten to `#RRGGBB` / `#AARRGGBB`
before it reaches the native layer, so the same input renders the same color on
Android and on iOS. A value that is not a parseable hex string is dropped, the SDK
default applies, and a warning is logged by `initialize`.

## Properties

### background?

> `optional` **background**: `string`

Background color of the community screens (hex format: #FF6B35 or FF6B35).

Omit it to keep the native default: the Octopus light/dark scheme background on
Android, the system background on iOS.

---

### link?

> `optional` **link**: `string`

Color of links, i.e. URLs rendered inside posts and comments
(hex format: #FF6B35 or FF6B35).

Cosmetic only — it does not change how a link is opened. Omit it to keep the
native default.

---

### onPrimary?

> `optional` **onPrimary**: `string`

Color for content displayed over the primary color (hex format: #FF6B35 or FF6B35)

---

### primary?

> `optional` **primary**: `string`

Primary color set for branding (hex format: #FF6B35 or FF6B35)

---

### primaryHighContrast?

> `optional` **primaryHighContrast**: `string`

High contrast variation of primary color (hex format: #FF6B35 or FF6B35)

---

### primaryLowContrast?

> `optional` **primaryLowContrast**: `string`

Primary low contrast color (lighter variation of primary) (hex format: #FF6B35 or FF6B35)
