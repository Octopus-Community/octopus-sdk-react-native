[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / ScreenType

# Type Alias: ScreenType

> **ScreenType** = `"mainFeed"` \| `"postsFeed"` \| `"groups"` \| `"groupDetail"` \| `"postDetail"` \| `"commentDetail"` \| `"createPost"` \| `"profile"` \| `"activity"` \| `"otherUserProfile"` \| `"otherUserPosts"` \| `"editProfile"` \| `"reportContent"` \| `"reportProfile"` \| `"validateNickname"` \| `"settingsList"` \| `"settingsAccount"` \| `"reportExplanation"` \| `"deleteAccount"` \| `"unknown"`

Screen types displayed in the Octopus UI.

Three members are **not** emitted by both pinned natives. Treat them as optional inputs
rather than as guarantees, and never assume one implies the absence of the other:

- `'postsFeed'` is kept in the union for source compatibility only — it is not emitted by
  either platform any more. It is superseded by `'mainFeed'` and `'groupDetail'`, which the
  native SDKs split it into: Android's `ScreenDisplayed.PostsFeed` has been `@Deprecated`
  with zero emission sites since native 1.13.3, and iOS's `Screen.postsFeed` has been
  deprecated and unreachable since native 1.13.2.
- `'settingsList'` is emitted on Android only since native SDK 1.13: iOS deleted the
  settings-list screen, so nothing emits it there anymore.
- `'activity'` is emitted on Android only. The native iOS SDK models no separate screen
  for the connected user's own Unified Profile activity and reports `'profile'` for it,
  so the same user action yields `'activity'` on Android and `'profile'` on iOS. A host
  counting "the user looked at their own community activity" must accept both.

The list grows as the native SDKs add screens, and a screen this wrapper version does not
model yet arrives as `'unknown'` — so match on the members you care about and keep a
default branch rather than assuming the union is closed.
