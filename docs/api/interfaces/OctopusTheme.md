[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusTheme

# Interface: OctopusTheme

Theme configuration for customizing the Octopus UI appearance.

Supports two approaches:

1. Single color set (backward compatible) - colors are applied to both light and dark modes
2. Dual mode colors - separate color sets for light and dark modes

## Properties

### colors?

> `optional` **colors**: [`OctopusColorSet`](OctopusColorSet.md) \| \{ `dark`: [`OctopusColorSet`](OctopusColorSet.md); `light`: [`OctopusColorSet`](OctopusColorSet.md); \}

Color customization options.

For backward compatibility, you can pass a single color set that will be used for both light and dark modes.
For enhanced theming, you can pass separate color sets for light and dark modes.

#### Type Declaration

[`OctopusColorSet`](OctopusColorSet.md)

\{ `dark`: [`OctopusColorSet`](OctopusColorSet.md); `light`: [`OctopusColorSet`](OctopusColorSet.md); \}

#### dark

> **dark**: [`OctopusColorSet`](OctopusColorSet.md)

Colors for dark mode

#### light

> **light**: [`OctopusColorSet`](OctopusColorSet.md)

Colors for light mode

---

### fonts?

> `optional` **fonts**: [`OctopusFonts`](OctopusFonts.md)

Font customization options

---

### logo?

> `optional` **logo**: `object`

Logo customization

#### image?

> `optional` **image**: `ImageResolvedAssetSource`

Local image resource - use Image.resolveAssetSource(require('./path/to/image.png'))
