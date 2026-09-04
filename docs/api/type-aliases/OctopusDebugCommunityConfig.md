[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusDebugCommunityConfig

# Type Alias: OctopusDebugCommunityConfig

> **OctopusDebugCommunityConfig** = `object`

Snapshot of the community config the backend currently serves (GetConfig),
as the native SDK holds it. Field values reflect any local `debugOverride*`
too — this reads the same effective config the SDK UI consumes.

## Properties

### displayAccountAge

> **displayAccountAge**: `boolean`

---

### exposeClientUserId

> **exposeClientUserId**: `boolean`

Unified Profile activation flag (`CommunityConfig.exposeClientUserId`).

---

### forceLoginOnStrongActions

> **forceLoginOnStrongActions**: `boolean`

---

### termsAcceptanceMode

> **termsAcceptanceMode**: `string`

Native enum name, lowercased here so both platforms read e.g. `implicit`.
