[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / GroupFollowUnfollowError

# Interface: GroupFollowUnfollowError

The error rejected by [followGroup](../functions/followGroup.md) / [unfollowGroup](../functions/unfollowGroup.md).

The `code` type keeps room (`| (string & {})`) for a future native code that predates its
addition to [GroupFollowUnfollowErrorCode](../type-aliases/GroupFollowUnfollowErrorCode.md) on the consuming app's SDK version.

## Extends

- `Error`

## Properties

### cause?

> `optional` **cause**: `unknown`

#### Inherited from

`Error.cause`

---

### code

> `readonly` **code**: `string` & `object` \| [`GroupFollowUnfollowErrorCode`](../type-aliases/GroupFollowUnfollowErrorCode.md)

---

### message

> **message**: `string`

#### Inherited from

`Error.message`

---

### name

> **name**: `string`

#### Inherited from

`Error.name`

---

### stack?

> `optional` **stack**: `string`

#### Inherited from

`Error.stack`
