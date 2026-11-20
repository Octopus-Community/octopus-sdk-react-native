[**@octopus-community/react-native v1.16.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / ClientPost

# Interface: ClientPost

The content of a post linked to one of your own objects (an article, a product, a recipe…).

Passed to [fetchOrCreateClientObjectRelatedPost](../functions/fetchOrCreateClientObjectRelatedPost.md), which creates the post the first time
and returns the existing one afterwards. **The content is only used when the post does not
exist yet**: editing these fields never rewrites a post that was already created.

## Properties

### ~~attachment?~~

> `readonly` `optional` **attachment**: [`OctopusClientPostAttachment`](../type-aliases/OctopusClientPostAttachment.md) \| `null`

A single image. Same as `medias: [attachment]`; cannot be set together with a non-empty
`medias`.

#### Deprecated

Use medias.

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

### medias?

> `readonly` `optional` **medias**: readonly [`OctopusClientPostAttachment`](../type-aliases/OctopusClientPostAttachment.md)[] \| `null`

The images of the post, in display order, at most [OCTOPUS_POST_MAX_IMAGE_COUNT](../variables/OCTOPUS_POST_MAX_IMAGE_COUNT.md).
More is refused by the native SDK with `CLIENT_POST_ERROR`, before the post is created.
Cannot be set together with `attachment`: [fetchOrCreateClientObjectRelatedPost](../functions/fetchOrCreateClientObjectRelatedPost.md) then
rejects with `INVALID_ARGS`, before any native call.

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

The post text: at least one visible character, at most 5000 characters.

---

### viewObjectButton?

> `readonly` `optional` **viewObjectButton**: [`OctopusLocalizedText`](../type-aliases/OctopusLocalizedText.md) \| `null`

The label of the button that takes the user back to your object:
[OctopusLocalizedText.perLanguage](../variables/OctopusLocalizedText.md#perlanguage) to give it in each language of your app,
[OctopusLocalizedText.autoTranslated](../variables/OctopusLocalizedText.md#autotranslated) to let Octopus translate one label. Omitted
means no button, and [setNavigateToClientObjectCallback](../functions/setNavigateToClientObjectCallback.md) then never fires for this
post.

Keep each label under 28 characters so that it fits on one line: a longer one is accepted,
and the button can then take several lines. Like the rest of the content, it is taken when
the post is created only: a post that already exists for `objectId` keeps its button.

A per-language label that breaks one of the rules listed on [OctopusLocalizedText](../variables/OctopusLocalizedText.md) is
refused with the matching `LOCALIZED_TEXT_…` [ClientPostErrorCode](../type-aliases/ClientPostErrorCode.md), before the post is
created. Cannot be set together with `viewObjectButtonText`:
[fetchOrCreateClientObjectRelatedPost](../functions/fetchOrCreateClientObjectRelatedPost.md) then rejects with `INVALID_ARGS`, before any
native call.

---

### ~~viewObjectButtonText?~~

> `readonly` `optional` **viewObjectButtonText**: `string` \| `null`

The label of the button that takes the user back to your object, translated automatically
by Octopus. Must be under 28 characters — 4 to 28 is the recommended range. Omitted means
no button, and [setNavigateToClientObjectCallback](../functions/setNavigateToClientObjectCallback.md) then never fires for this post.

#### Deprecated

Use viewObjectButton, with `OctopusLocalizedText.autoTranslated(text)` to keep
the automatic translation.
