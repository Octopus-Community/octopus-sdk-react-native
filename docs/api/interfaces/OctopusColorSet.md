[**@octopus-community/react-native v1.14.0**](../README.md)

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

### gray100?

> `optional` **gray100**: `string`

**Android only.** First step of the native SDK's neutral gray ramp, the one nearest the
page: snackbar and tooltip ink, and the default page background in dark mode
(hex format: #FF6B35 or FF6B35). Overriding it does not move the page background:
set [background](#background) for that.

The four `gray*` keys let a host move the community's neutral surfaces, hairlines and
body text onto its own ladder — a navy dark theme rather than the default neutral
grays. Each one is optional and independent: an omitted key keeps the native default,
so a theme that sets none of them renders exactly as before.

Unlike [link](#link) and [background](#background), a gray given in one mode of a
`{ light, dark }` set is **not** applied to the other mode: the ramp is tuned per
appearance, and a dark gray reused in light mode would invert the contrast. A single
color set still applies to both modes, as every other key does.

Ignored on iOS, whose native SDK does not expose its gray ramp for customization.

---

### gray200?

> `optional` **gray200**: `string`

**Android only.** Second step of the native gray ramp: low-contrast fills such as poll
bars and disabled content (hex format: #FF6B35 or FF6B35). Same rules as
[gray100](#gray100).

---

### gray300?

> `optional` **gray300**: `string`

**Android only.** Third step of the native gray ramp: hairlines, dividers and borders,
and the default `disabled` color (hex format: #FF6B35 or FF6B35). Same rules as
[gray100](#gray100); overriding it does not move `disabled`.

---

### gray700?

> `optional` **gray700**: `string`

**Android only.** Secondary-text step of the native gray ramp: post metadata,
counters and toggles (hex format: #FF6B35 or FF6B35). Same rules as [gray100](#gray100).

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
