[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusFonts

# Interface: OctopusFonts

Font configuration for customizing the Octopus UI typography.

## Properties

### fontFamily?

> `optional` **fontFamily**: `string`

Custom font family applied to all SDK text (titles, body text, captions,
navigation-bar items).

**This name is not resolved from the JavaScript bundle.** A font linked with
`react-native-asset` / `react-native.config.js` is registered with the _host
app_, and that is exactly what is needed here: both native SDKs render their
screens natively (Compose on Android, SwiftUI on iOS), so the font must exist
as a **native** resource under this exact name:

- **Android**: the resource name of a font file, or of an XML
  `<font-family>`, under `android/app/src/main/res/font/` in the host app —
  `res/font/my_brand_font.ttf` is passed as `'my_brand_font'` (resource names
  are lowercase with underscores only, no extension).
- **iOS**: the exact **PostScript name** of a font added to the Xcode project
  and declared under `UIAppFonts` in `Info.plist`. This is often _not_ the
  filename — check it with Font Book.

If the name does not resolve, the SDK logs a native warning and keeps its own
default font.

**Precedence over [OctopusTextStyle.fontType](OctopusTextStyle.md#fonttype)**: these two are not
competing mechanisms — `fontFamily` names an arbitrary registered family for
the whole theme, `fontType` picks one of three _system_ designs for one style.
A `fontFamily` that resolves natively wins on every style, and `fontType` is
ignored; if it does not resolve, each style falls back to its `fontType` (and
then to the system default), so a `fontType` set alongside still works as the
fallback it now is. Setting both logs a warning at `initialize` naming the
styles whose `fontType` is being superseded.

**Android navigation-bar side effect**: setting this (or [fontWeight](#fontweight))
also sets the Android navigation-bar title to the size of the `body1` style,
which is smaller than the title size used with no font override. The native
top-app-bar title has no typography role of its own and the style we pass
replaces the ambient one rather than merging with it, so a complete style has
to be supplied. Use `textStyles.body1.fontSize` to control the resulting size.

Omit it to keep each native SDK's own default font.

---

### fontWeight?

> `optional` **fontWeight**: `number`

Custom font weight applied to all SDK text, on a 100 (thinnest) - 900
(boldest) scale — the same scale as CSS `font-weight` and React Native's own
numeric `fontWeight`.

Unlike [fontFamily](#fontfamily) this needs no native registration: it is applied on
top of whichever family is in effect (custom or default), and native rendering
picks the closest weight the font actually has a face for. iOS buckets the
value to the nearest of SwiftUI's nine named weights, which have no
arbitrary-integer initializer.

Must be a whole number within 100-900. Anything else is dropped with a warning
at `initialize` and the native default weight applies.

Setting this also triggers the Android navigation-bar side effect described on
[fontFamily](#fontfamily).

Omit it to keep each native SDK's own default weight.

---

### parsedConfig?

> `optional` **parsedConfig**: `ParsedFontConfig` \| `null`

Pre-processed font configuration for native platforms.
This is automatically generated and should not be set manually.

---

### textStyles?

> `optional` **textStyles**: `object`

Unified font configuration for different text types.

#### body1?

> `optional` **body1**: [`OctopusTextStyle`](OctopusTextStyle.md)

Configuration for body1 text

#### body2?

> `optional` **body2**: [`OctopusTextStyle`](OctopusTextStyle.md)

Configuration for body2 text

#### caption1?

> `optional` **caption1**: [`OctopusTextStyle`](OctopusTextStyle.md)

Configuration for caption1 text

#### caption2?

> `optional` **caption2**: [`OctopusTextStyle`](OctopusTextStyle.md)

Configuration for caption2 text

#### navBarItem?

> `optional` **navBarItem**: [`OctopusTextStyle`](OctopusTextStyle.md)

Configuration for navigation-bar items (back / close labels, bar actions).

**iOS only.** The native iOS theme has a dedicated `navBarItem` font slot,
but the native Android typography has no counterpart, so this style has no
effect on Android.

Omit it to keep the previous behaviour: nav-bar items follow `body1`.
If `body1` is omitted too, the slot falls back to a 17pt system font —
_not_ to the native iOS default of `.body`: as soon as `textStyles`
carries any entry, the bridge builds all seven slots explicitly, so the
native per-slot defaults no longer apply. Passing no `fonts` block at all
is what leaves the native theme untouched.

#### title1?

> `optional` **title1**: [`OctopusTextStyle`](OctopusTextStyle.md)

Configuration for title1 text

#### title2?

> `optional` **title2**: [`OctopusTextStyle`](OctopusTextStyle.md)

Configuration for title2 text
