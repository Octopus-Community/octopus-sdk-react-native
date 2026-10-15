[**@octopus-community/react-native v1.15.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusDebugCommunityConfig

# Type Alias: OctopusDebugCommunityConfig

> **OctopusDebugCommunityConfig** = `object`

Snapshot of the community config the backend currently serves (GetConfig),
as the native SDK holds it. Field values reflect any local `debugOverride*`
too — this reads the same effective config the SDK UI consumes.

## Properties

### consentTexts

> **consentTexts**: [`OctopusConsentTexts`](OctopusConsentTexts.md) \| `null`

Effective community consent wordings, or `null` when none are configured.

---

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

### forceNicknameChoice

> **forceNicknameChoice**: `boolean`

Whether the native nickname choice field starts empty before the first contribution.

---

### termsAcceptanceMode

> **termsAcceptanceMode**: `string`

Native enum name, lowercased here so both platforms read e.g. `implicit`.
