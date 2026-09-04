[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / isGroupFollowUnfollowError

# Function: isGroupFollowUnfollowError()

> **isGroupFollowUnfollowError**(`error`): `error is GroupFollowUnfollowError`

Narrows an unknown caught value to a [GroupFollowUnfollowError](../interfaces/GroupFollowUnfollowError.md).

## Parameters

### error

`unknown`

## Returns

`error is GroupFollowUnfollowError`

## Example

```typescript
try {
  await followGroup(groupId);
} catch (error) {
  if (isGroupFollowUnfollowError(error)) {
    console.warn(error.code);
  }
}
```
