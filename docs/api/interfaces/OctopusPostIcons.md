[**@octopus-community/react-native v1.14.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusPostIcons

# Interface: OctopusPostIcons

Icons of posts.

## Properties

### commentCount?

> `optional` **commentCount**: `ImageResolvedAssetSource`

Next to the comment count of a post.

**Not drawn at native 1.13.x:** declared by both native SDKs, but no screen reads it at
the current pins, so an override is accepted and has no visible effect yet.

---

### creation?

> `optional` **creation**: [`OctopusPostCreationIcons`](OctopusPostCreationIcons.md)

Icons of the post creation screen.

---

### emptyFeedInCurrentUserProfile?

> `optional` **emptyFeedInCurrentUserProfile**: `ImageResolvedAssetSource`

Illustration of the current user's empty post feed on their profile.

Native 1.14 on iOS and Android renders [OctopusScreenStatesIcons.emptyContent](OctopusScreenStatesIcons.md#emptycontent)
instead. This per-feature slot is accepted but has no visible effect with the native 1.14 SDKs.

---

### emptyFeedInGroups?

> `optional` **emptyFeedInGroups**: `ImageResolvedAssetSource`

Illustration of an empty group feed.

Native 1.14 on iOS and Android renders [OctopusScreenStatesIcons.emptyContent](OctopusScreenStatesIcons.md#emptycontent)
instead. This per-feature slot is accepted but has no visible effect with the native 1.14 SDKs.

---

### emptyFeedInOtherUserProfile?

> `optional` **emptyFeedInOtherUserProfile**: `ImageResolvedAssetSource`

Illustration of another user's empty post feed on their profile.

Native 1.14 on iOS and Android renders [OctopusScreenStatesIcons.emptyContent](OctopusScreenStatesIcons.md#emptycontent)
instead. This per-feature slot is accepted but has no visible effect with the native 1.14 SDKs.

---

### likeNotSelected?

> `optional` **likeNotSelected**: `ImageResolvedAssetSource`

The like button when the current user has not reacted.

---

### moderated?

> `optional` **moderated**: `ImageResolvedAssetSource`

Shown on a moderated post.

---

### moreReactions?

> `optional` **moreReactions**: `ImageResolvedAssetSource`

Opens the full reaction picker.

**Not drawn at native 1.13.x:** declared by both native SDKs, but no screen reads it at
the current pins, so an override is accepted and has no visible effect yet.

---

### notAvailable?

> `optional` **notAvailable**: `ImageResolvedAssetSource`

Shown in place of a post that is no longer available.

---

### viewCount?

> `optional` **viewCount**: `ImageResolvedAssetSource`

Next to the view count of a post.

**Not drawn at native 1.13.x:** declared by both native SDKs, but no screen reads it at
the current pins, so an override is accepted and has no visible effect yet.
