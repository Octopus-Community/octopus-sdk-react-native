[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / ClientPost

# Interface: ClientPost

The content of a post linked to one of your own objects (an article, a product, a recipe…).

Passed to [fetchOrCreateClientObjectRelatedPost](../functions/fetchOrCreateClientObjectRelatedPost.md), which creates the post the first time
and returns the existing one afterwards. **The content is only used when the post does not
exist yet**: editing these fields never rewrites a post that was already created.

## Properties

### attachment?

> `readonly` `optional` **attachment**: [`OctopusClientPostAttachment`](../type-aliases/OctopusClientPostAttachment.md) \| `null`

Optional image.

---

### catchPhrase?

> `readonly` `optional` **catchPhrase**: `string` \| `null`

A short line displayed in bold below the text, e.g. "What do you think about this?".
Must be under 84 characters — 6 to 38 is the recommended range. Omitted means not shown.

---

### groupId?

> `readonly` `optional` **groupId**: `string` \| `null`

The group to publish into. Omitted means the default group configured for your community
with the Octopus team.

---

### objectId

> `readonly` **objectId**: `string`

The id that uniquely identifies your object. It is what
[fetchOrCreateClientObjectRelatedPost](../functions/fetchOrCreateClientObjectRelatedPost.md) and
[addClientObjectRelatedPostListener](../functions/addClientObjectRelatedPostListener.md) look the post up by, and what
[setNavigateToClientObjectCallback](../functions/setNavigateToClientObjectCallback.md) receives when the user taps the post's button.

---

### text

> `readonly` **text**: `string`

The post text. Must be between 10 and 5000 characters.

---

### viewObjectButtonText?

> `readonly` `optional` **viewObjectButtonText**: `string` \| `null`

The label of the button that takes the user back to your object. Must be under 28
characters — 4 to 28 is the recommended range. Omitted means no button, and
[setNavigateToClientObjectCallback](../functions/setNavigateToClientObjectCallback.md) then never fires for this post.
