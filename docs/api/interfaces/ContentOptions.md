[**@octopus-community/react-native v1.16.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / ContentOptions

# Interface: ContentOptions

Per-content-type options governing content creation and post tap navigation.

Creation flags default to `true`; post tap flags default to `false`, including when
their sub-object (or the whole options object) is omitted.
Mirrors the native `CommunityConfig.ContentOptions` config type — see
[debugOverrideContentOptions](../functions/debugOverrideContentOptions.md). This is a **debug-only** testing hatch: it does not exist
on a real production community config, which is set server-side.

## Properties

### comment?

> `optional` **comment**: `object`

#### enablePictures?

> `optional` **enablePictures**: `boolean`

Whether a comment may include a picture. Defaults to `true`.

---

### post?

> `optional` **post**: `object`

#### enablePictures?

> `optional` **enablePictures**: `boolean`

Whether a post may include a picture. Defaults to `true`.

#### enablePolls?

> `optional` **enablePolls**: `boolean`

Whether a post may be a poll. Defaults to `true`.

#### groupNameTapOpensGroup?

> `optional` **groupNameTapOpensGroup**: `boolean`

Whether tapping a post's group name opens that group in feeds and post detail.
Defaults to `false`. Members without access follow the native group access-denied flow.

#### imageTapOpensPost?

> `optional` **imageTapOpensPost**: `boolean`

Whether tapping a feed image opens the post when its card can open the detail.
Defaults to `false`. Otherwise, and in post detail, images still open fullscreen.

#### textRequired?

> `optional` **textRequired**: `boolean`

Whether a post requires text. Defaults to `true`. When `false`, a post with an image
(with or without a poll) may omit text. A poll alone still requires text; native length
validation still applies whenever text is present.

---

### reply?

> `optional` **reply**: `object`

#### enablePictures?

> `optional` **enablePictures**: `boolean`

Whether a reply may include a picture. Defaults to `true`.
