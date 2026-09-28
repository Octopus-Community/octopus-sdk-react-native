[**@octopus-community/react-native v1.14.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusCommentIcons

# Interface: OctopusCommentIcons

Icons of comments.

## Properties

### creation?

> `optional` **creation**: [`OctopusCommentCreationIcons`](OctopusCommentCreationIcons.md)

Icons of the comment creation field.

---

### emptyFeed?

> `optional` **emptyFeed**: `ImageResolvedAssetSource`

Illustration of a post without comments.

Native 1.14 on iOS and Android renders [OctopusScreenStatesIcons.emptyContent](OctopusScreenStatesIcons.md#emptycontent)
instead. This per-feature slot is accepted but has no visible effect with the native 1.14 SDKs.

---

### likeNotSelected?

> `optional` **likeNotSelected**: `ImageResolvedAssetSource`

The like button of a comment when the current user has not reacted.

---

### notAvailable?

> `optional` **notAvailable**: `ImageResolvedAssetSource`

Shown in place of a comment that is no longer available.

---

### seeReply?

> `optional` **seeReply**: `ImageResolvedAssetSource`

Opens the replies of a comment.
