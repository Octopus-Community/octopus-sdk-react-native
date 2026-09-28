[**@octopus-community/react-native v1.14.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusGamificationIcons

# Interface: OctopusGamificationIcons

Icons of the gamification (levels and badges) screens.

## Properties

### badge?

> `optional` **badge**: `ImageResolvedAssetSource`

The badge of a user, tinted with the color of their level.

---

### info?

> `optional` **info**: `ImageResolvedAssetSource`

Opens the gamification rules.

---

### rulesHeader?

> `optional` **rulesHeader**: `ImageResolvedAssetSource`

Illustration at the top of the gamification rules.

**iOS caveat (native 1.13.x):** the iOS SDK ignores this slot and uses the `badge` image
(or its own default) for the rules header, so an override here only shows on Android,
and a `badge` override also changes the rules header on iOS.
