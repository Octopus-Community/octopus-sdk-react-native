[**@octopus-community/react-native v1.14.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusPostCreationIcons

# Interface: OctopusPostCreationIcons

Icons of the post creation screen.

## Properties

### addPicture?

> `optional` **addPicture**: `ImageResolvedAssetSource`

Adds a picture to the post.

---

### addPoll?

> `optional` **addPoll**: `ImageResolvedAssetSource`

Adds a poll to the post.

---

### addPollOption?

> `optional` **addPollOption**: `ImageResolvedAssetSource`

Adds an option to the poll.

**Android caveat (native 1.13.x):** the Android SDK does not read this slot, so an override
only shows on iOS.

---

### deletePicture?

> `optional` **deletePicture**: `ImageResolvedAssetSource`

Removes the picture of the post.

---

### deletePoll?

> `optional` **deletePoll**: `ImageResolvedAssetSource`

Removes the poll.

---

### deletePollOption?

> `optional` **deletePollOption**: `ImageResolvedAssetSource`

Removes a poll option.

**Android caveat (native 1.13.x):** the Android SDK does not read this slot, so an override
only shows on iOS.

---

### open?

> `optional` **open**: `ImageResolvedAssetSource`

Opens the post creation screen. On Android this is the "create post" button.

---

### topicSelection?

> `optional` **topicSelection**: `ImageResolvedAssetSource`

Opens the group (topic) selection of the post being written.
