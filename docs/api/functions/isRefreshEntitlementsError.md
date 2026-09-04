[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / isRefreshEntitlementsError

# Function: isRefreshEntitlementsError()

> **isRefreshEntitlementsError**(`error`): `error is RefreshEntitlementsError`

Narrows an unknown caught value to a [RefreshEntitlementsError](../interfaces/RefreshEntitlementsError.md).

## Parameters

### error

`unknown`

## Returns

`error is RefreshEntitlementsError`

## Example

```typescript
try {
  await refreshEntitlements();
} catch (error) {
  if (isRefreshEntitlementsError(error)) {
    console.warn(error.code);
  }
}
```
