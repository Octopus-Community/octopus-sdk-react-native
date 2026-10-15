[**@octopus-community/react-native v1.15.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / ContentOptions

# Interface: ContentOptions

Per-content-type options governing what members may add when creating content.

Every flag defaults to `true` when its sub-object (or the whole options object) is omitted.
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
