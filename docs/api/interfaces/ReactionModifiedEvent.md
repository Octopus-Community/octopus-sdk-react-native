[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / ReactionModifiedEvent

# Interface: ReactionModifiedEvent

Event emitted when a reaction is modified (added, changed, or removed)

## Extends

- [`BaseSDKEvent`](BaseSDKEvent.md)

## Properties

### contentId

> **contentId**: `string`

---

### contentKind

> **contentKind**: [`ContentKind`](../type-aliases/ContentKind.md)

---

### newReaction

> **newReaction**: [`ReactionKind`](../type-aliases/ReactionKind.md) \| `null`

---

### previousReaction

> **previousReaction**: [`ReactionKind`](../type-aliases/ReactionKind.md) \| `null`

---

### type

> **type**: `"reactionModified"`

#### Overrides

[`BaseSDKEvent`](BaseSDKEvent.md).[`type`](BaseSDKEvent.md#type)
