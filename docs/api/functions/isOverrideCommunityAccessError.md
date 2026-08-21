[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / isOverrideCommunityAccessError

# Function: isOverrideCommunityAccessError()

> **isOverrideCommunityAccessError**(`error`): `error is OverrideCommunityAccessError`

Narrows an unknown caught value to a [OverrideCommunityAccessError](../interfaces/OverrideCommunityAccessError.md).

## Parameters

### error

`unknown`

## Returns

`error is OverrideCommunityAccessError`

## Example

```typescript
try {
  await overrideCommunityAccess(true);
} catch (error) {
  if (isOverrideCommunityAccessError(error)) {
    console.warn(error.code);
  }
}
```
