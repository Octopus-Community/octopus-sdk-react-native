[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / OverrideCommunityAccessErrorCode

# Type Alias: OverrideCommunityAccessErrorCode

> **OverrideCommunityAccessErrorCode** = `"OVERRIDE_ERROR"`

The reason [overrideCommunityAccess](../functions/overrideCommunityAccess.md) was rejected.

| Code             | Meaning                                                                                    | Emitted on   |
| ---------------- | ------------------------------------------------------------------------------------------ | ------------ |
| `OVERRIDE_ERROR` | The override could not be applied. Neither native SDK classifies this failure any further. | Android, iOS |

## See

- [OverrideCommunityAccessError](../interfaces/OverrideCommunityAccessError.md) – the shape of the rejected error.
- [isOverrideCommunityAccessError](../functions/isOverrideCommunityAccessError.md) – narrow an unknown caught value.
