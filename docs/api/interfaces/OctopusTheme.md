[**@octopus-community/react-native v1.0.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusTheme

# Interface: OctopusTheme

Theme configuration for customizing the Octopus UI appearance.

## Properties

### colors?

> `optional` **colors**: `object`

Color customization options

#### onPrimary?

> `optional` **onPrimary**: `string`

Color for content displayed over the primary color (hex format: #FF6B35 or FF6B35)

#### primary?

> `optional` **primary**: `string`

Primary color set for branding (hex format: #FF6B35 or FF6B35)

#### primaryHighContrast?

> `optional` **primaryHighContrast**: `string`

High contrast variation of primary color (hex format: #FF6B35 or FF6B35)

#### primaryLowContrast?

> `optional` **primaryLowContrast**: `string`

Primary low contrast color (lighter variation of primary) (hex format: #FF6B35 or FF6B35)

---

### logo?

> `optional` **logo**: `object`

Logo customization

#### image?

> `optional` **image**: `any`

Local image resource - use Image.resolveAssetSource(require('./path/to/image.png'))
