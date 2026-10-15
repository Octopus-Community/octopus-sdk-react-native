[**@octopus-community/react-native v1.15.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusCommentIcons

# Interface: OctopusCommentIcons

Icons of comments.

## Properties

### creation?

> `optional` **creation**: [`OctopusCommentCreationIcons`](OctopusCommentCreationIcons.md)

Icons of the comment creation field.

---

### ~~emptyFeed?~~

> `optional` **emptyFeed**: `ImageResolvedAssetSource`

Illustration of a post without comments.

Native 1.15 on iOS and Android renders [OctopusScreenStatesIcons.emptyContent](OctopusScreenStatesIcons.md#emptycontent)
instead. This per-feature slot is accepted but has no visible effect with the native 1.15 SDKs.

#### Deprecated

Use [OctopusScreenStatesIcons.emptyContent](OctopusScreenStatesIcons.md#emptycontent) via
`theme.icons.screenStates.emptyContent` instead. This slot has no visible effect.
It will be removed in a future major version together with the native SDKs.

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
