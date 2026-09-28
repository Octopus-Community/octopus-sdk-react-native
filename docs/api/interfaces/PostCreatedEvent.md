[**@octopus-community/react-native v1.14.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / PostCreatedEvent

# Interface: PostCreatedEvent

Event emitted when a post is created

## Extends

- [`BaseSDKEvent`](BaseSDKEvent.md)

## Properties

### content

> **content**: [`PostContentType`](../type-aliases/PostContentType.md)[]

---

### groupId

> **groupId**: `string`

Id of the group the post was created in. Always set: both native SDKs report
a post's group as non-null.

---

### postId

> **postId**: `string`

---

### textLength

> **textLength**: `number`

---

### ~~topicId~~

> **topicId**: `string` \| `null`

Id of the group the post was created in — same value as [groupId](#groupid).

#### Deprecated

Use [groupId](#groupid). The native SDKs renamed this field to a
non-null `groupId` (iOS 1.11); it is still emitted for compatibility and
will be removed in a future major version.

---

### type

> **type**: `"postCreated"`

#### Overrides

[`BaseSDKEvent`](BaseSDKEvent.md).[`type`](BaseSDKEvent.md#type)
