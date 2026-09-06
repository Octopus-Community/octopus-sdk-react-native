[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / ScreenInfo

# Interface: ScreenInfo

Screen information for screen displayed events.

Every field but `type` is optional and only present for the screens that carry it:
`feedId` on `'mainFeed'` and `'postsFeed'` (with `relatedTopicId` on the latter only, and
only when the feed maps to a single group), `groupId` on `'groupDetail'`, `postId` on
`'postDetail'`, `commentId` on `'commentDetail'`, and `profileId` on `'otherUserProfile'`
and `'otherUserPosts'`. An absent field is missing from the payload, so it reads as
`undefined` — never `null` — with one legacy exception: `relatedTopicId` predates that
convention and still carries an explicit `null` for "no single group", rather than being
omitted.

## Properties

### commentId?

> `optional` **commentId**: `string`

---

### feedId?

> `optional` **feedId**: `string`

---

### groupId?

> `optional` **groupId**: `string`

The ID of the group whose detail screen is displayed. `'groupDetail'` only.

---

### postId?

> `optional` **postId**: `string`

---

### profileId?

> `optional` **profileId**: `string`

---

### relatedTopicId?

> `optional` **relatedTopicId**: `string` \| `null`

---

### type

> **type**: [`ScreenType`](../type-aliases/ScreenType.md)
