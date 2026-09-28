[**@octopus-community/react-native v1.14.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusIconSource

# Type Alias: OctopusIconSource

> **OctopusIconSource** = `ImageResolvedAssetSource`

An icon override: a resolved image source, typically
`Image.resolveAssetSource(require('./assets/icons/my-icon.png'))`.

Remote `http(s)` URIs are accepted as well. They are downloaded when the Octopus UI is
built, and the native default stays on screen until the download completes (or for good if
it fails).
