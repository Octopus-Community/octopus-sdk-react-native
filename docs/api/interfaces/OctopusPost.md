[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusPost

# Interface: OctopusPost

A read-only view of an Octopus post.

Returned by [fetchOrCreateClientObjectRelatedPost](../functions/fetchOrCreateClientObjectRelatedPost.md) and delivered by
[addClientObjectRelatedPostListener](../functions/addClientObjectRelatedPostListener.md). Use [id](#id) to open the post in the embedded
UI, and [formatOctopusCompactCount](../functions/formatOctopusCompactCount.md) to render the counts the way the embedded feed
does.

This is the **lean intersection** of the two native read interfaces — Android's
`OctopusPost` and iOS's `OctopusPost` both expose exactly these five members publicly.
Field names follow Android (the reference SDK): iOS calls [userReactionKind](#userreactionkind)
`userReaction` and [OctopusReactionCount.reactionKind](OctopusReactionCount.md#reactionkind) `reaction`.

## Properties

### commentCount

> `readonly` **commentCount**: `number`

The overall number of **comments and replies** on this post.

---

### id

> `readonly` **id**: `string`

Id of the post. Pass it to the embedded UI to display the post.

---

### reactions

> `readonly` **reactions**: readonly [`OctopusReactionCount`](OctopusReactionCount.md)[]

The reaction counts. A kind absent from this list has a count of 0.

---

### userReactionKind

> `readonly` **userReactionKind**: [`OctopusReactionKind`](../type-aliases/OctopusReactionKind.md) \| `string` & `object` \| `null`

The connected user's reaction on this post, or `null` if they did not react.

---

### viewCount

> `readonly` **viewCount**: `number`

The number of times this post has been viewed.
