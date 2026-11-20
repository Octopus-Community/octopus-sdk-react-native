# Migrating

Upgrade notes for `@octopus-community/react-native`, **newest version at the
top**. Each release that changes the public API or requires consumer action
gets one `##` section here. Releases that only add APIs (no breaking change)
are listed in [`CHANGELOG.md`](./CHANGELOG.md) and don't need a migration entry.

> One file, one section per version — we do **not** create per-version
> `MIGRATION_x_y.md` files (a versioned filename multiplies docs over time).

## 1.16.0

The wrapped native SDKs move to the **1.16** line (Android 1.16.0, iOS 1.16.0). Android build
requirements, home-title behaviour and member-addressing string overrides change, and the iOS
native SDK now comes from Swift Package Manager instead of CocoaPods trunk. The new APIs are
listed in [`CHANGELOG.md`](./CHANGELOG.md); no call that worked in 1.15 fails at runtime, but a few
type-level changes can stop TypeScript code from compiling (see "Type-level changes" below). Two single-image
fields and two plain-string button labels are deprecated.

### Build requirements — Android `compileSdk` 36

The native Android SDK 1.16 compiles against Android 16 (API 36). Android host apps must use
`compileSdk` 36 or later and Android Gradle Plugin (AGP) 8.9.1 or later, the
[minimum AGP for API 36](https://developer.android.com/build/releases/about-agp#api-level-support).
`minSdk` stays at 24, and no `targetSdk` change is required.

React Native 0.81 projects created from its template already compile against API 36 with a
recent enough AGP. If you lowered them, raise them back.

**Before** (`android/build.gradle`):

```groovy
buildscript {
    ext {
        compileSdkVersion = 35
    }
}
```

**After:**

```groovy
buildscript {
    ext {
        compileSdkVersion = 36
    }
}
```

If your project pins the Android Gradle Plugin itself (`classpath("com.android.tools.build:gradle:<version>")`),
use 8.9.1 or later, with the Gradle version it requires.

### iOS — the native SDK comes from Swift Package Manager, not CocoaPods trunk

CocoaPods trunk stops accepting new publications on December 2, 2026, so the podspec no longer
depends on the `OctopusCommunity*` pods. `pod install` now attaches the native SDK's Swift package
([`octopus-sdk-swift`](https://github.com/Octopus-Community/octopus-sdk-swift), same exact
version) to the `OctopusReactNativeSdk` pod through React Native's `spm_dependency` helper, and
Xcode resolves it on the first build. No TypeScript change.

A standard React Native or Expo app only re-runs `pod install`: keep
`use_frameworks! :linkage => :static` (or `"useFrameworks": "static"`), and ignore the `[SPM]`
warning about static linking. Act only if one of these applies:

- **Your `Podfile` does not load `react-native/scripts/react_native_pods.rb`** (or uses React
  Native older than 0.75): `pod install` stops with an error naming `spm_dependency`. Load it, as
  the React Native and Expo templates do.
- **You added the `gRPC-Swift` workaround** next to Firebase Firestore: remove
  `pod 'gRPC-Swift', :podspec => 'gRPC-Swift.podspec.json'` from your `Podfile`; Octopus no longer
  uses that pod.
- **Your build machines have no access to `github.com`**: Xcode now fetches the native SDK and its
  Swift dependencies (gRPC Swift, SwiftNIO, SwiftProtobuf, KeychainAccess) as packages. Allow it,
  or resolve once with `xcodebuild -resolvePackageDependencies` and cache the packages directory.

### Home title behaviour — Android

The global `initialize({ topAppBar })` setting, used by both fullscreen `openUI()` and
embedded `<OctopusUIView>`, and the per-view `navBarTitle` prop now follow the iOS title
behaviour:

- **Explicit text takes precedence over a logo.** Previously, a theme logo hid an explicit
  home title on Android. A non-empty `topAppBar.title: { type: 'text', text }` or
  `navBarTitle` now displays that text instead. To keep showing the logo, use
  `topAppBar.title: { type: 'logo' }` and omit the per-view `navBarTitle` override.
- **An empty title falls back to the logo or default title.** Previously, passing `""`
  without a theme logo hid the home title on Android. It now shows the theme logo when
  configured, otherwise the default home title. An empty `navBarTitle` does not fall back to
  a text `topAppBar.title`; omit the prop to use that text.
  Hosts that passed `""` to hide the title must account for this fallback. There is no
  option to hide just the title while keeping the bar. Embedded Android hosts that provide
  their own title chrome can hide the entire bar with `<OctopusUIView showNavBar={false} />`.

### Android — member-addressing string overrides

The native Android SDK 1.16 reads each text that addresses the member from a `_formal` and an
`_informal` resource, so that a community can set an informal tone per language. The unsuffixed
resource of these texts is no longer read: a host override of it stops applying, silently. The keys
concerned are the ones the native SDK's `values/strings.xml` defines with both suffixes. Move each
such override to both variants. Some unused resources were also removed; see the native
[Android 1.16.0 release notes](https://github.com/Octopus-Community/octopus-sdk-android/releases/tag/v1.16.0).

**Before** (`android/app/src/main/res/values/strings.xml`):

```xml
<string name="error_unknown">Something went wrong, try again.</string>
```

**After:**

```xml
<string name="error_unknown_formal">Something went wrong, please try again.</string>
<string name="error_unknown_informal">Something went wrong, try again.</string>
```

iOS hosts have no string override to move.

### Several photos per post

Not breaking: a post now carries up to 10 photos (`OCTOPUS_POST_MAX_IMAGE_COUNT`), and the
single-image fields keep working. Move to the list forms when you touch the code.

`OctopusPrefilledPost` takes `imageUris`, in display order, instead of `imageUri`:

```ts
// Before
await navigateToOctopusCreatePost({ text, imageUri: photoUri });

// After
await navigateToOctopusCreatePost({ text, imageUris: [photoUri] });
```

Pass one or the other: `imageUri` together with a non-empty `imageUris` is refused with a plain
`Error`. More than 10 non-blank entries are refused with an
`OctopusPrefilledPostTooManyImagesError`, which is not a `NavigateToOctopusCreatePostError` (it
has no `code`), so check it on its own:

```ts
try {
  await navigateToOctopusCreatePost({ text, imageUris: photoUris });
} catch (error) {
  if (error instanceof OctopusPrefilledPostTooManyImagesError) {
    // error.count photos were passed, at most error.max are accepted
  } else if (isNavigateToOctopusCreatePostError(error)) {
    // text, CTA or image problem, as before
  }
}
```

`openUI` and `OctopusUIView` throw the same errors synchronously for a `createPost` initial
screen, as they do for their other `initialScreen` checks.

`ClientPost` takes `medias` instead of `attachment`:

```ts
// Before
await fetchOrCreateClientObjectRelatedPost({
  objectId: article.id,
  text: article.title,
  attachment: { type: 'remoteImage', url: article.imageUrl },
});

// After
await fetchOrCreateClientObjectRelatedPost({
  objectId: article.id,
  text: article.title,
  medias: [
    { type: 'remoteImage', url: article.imageUrl },
    { type: 'localImage', uri: thumbnailFileUri },
  ],
});
```

Do not set both: `fetchOrCreateClientObjectRelatedPost` then rejects with `INVALID_ARGS`, before
any native call. More than 10 `medias` are refused by the native SDK with `CLIENT_POST_ERROR`.
As before, the content only counts when the post is created: adding `medias` to an object whose
post already exists does not change that post.

### Per-language button labels

The button label of a bridge post and of a prefilled post's call to action can now
be given per language, with `OctopusLocalizedText`. The plain-string fields keep working as
auto-translated labels. Move to the new fields when you touch the code.

**Type-level change:** `OctopusPostCTA.label` is now optional. Code that reads it needs
`?? ''` or a narrowing check.

`ClientPost` takes `viewObjectButton` instead of `viewObjectButtonText`:

```ts
// Before
await fetchOrCreateClientObjectRelatedPost({
  objectId: article.id,
  text: article.title,
  viewObjectButtonText: 'Read the article',
});

// After: the same automatic translation…
await fetchOrCreateClientObjectRelatedPost({
  objectId: article.id,
  text: article.title,
  viewObjectButton: OctopusLocalizedText.autoTranslated('Read the article'),
});

// …or one label per language
await fetchOrCreateClientObjectRelatedPost({
  objectId: article.id,
  text: article.title,
  viewObjectButton: OctopusLocalizedText.perLanguage(
    { 'en': 'Read the article', 'fr': "Lire l'article", 'pt-BR': 'Ler o artigo' },
    'en'
  ),
});
```

`OctopusPostCTA` takes `localizedLabel` instead of `label`:

```ts
// Before
await navigateToOctopusCreatePost({ cta: { url, label: 'Learn more' } });

// After
await navigateToOctopusCreatePost({
  cta: { url, localizedLabel: OctopusLocalizedText.autoTranslated('Learn more') },
});
```

Set one or the other: `viewObjectButtonText` together with `viewObjectButton` makes
`fetchOrCreateClientObjectRelatedPost` reject with `INVALID_ARGS`, and `label` together with
`localizedLabel` is refused with a plain `Error`, both before any native call.

Give the languages as BCP 47 tags (`'en'`, `'pt-BR'`, `'zh-Hant-TW'`). They are sent as given:
the bridge only reads an underscore as a hyphen (`'pt_BR'` is `'pt-BR'`), on Android and iOS
alike. Nothing is checked in JS: the native SDK validates the label when the call reaches it,
and a label it refuses rejects with a `LOCALIZED_TEXT_…` code, with the language it names in
`languageCode`:

```ts
try {
  await fetchOrCreateClientObjectRelatedPost(post);
} catch (error) {
  if (isClientPostError(error) && error.code === 'LOCALIZED_TEXT_BLANK_TEXT') {
    // error.languageCode is the language whose label is blank
  }
}
```

These codes are new members of `ClientPostErrorCode` and `NavigateToOctopusCreatePostErrorCode`:
an exhaustive `switch` over either needs them. As before, a bridge post's content only counts when
the post is created: changing the button of an object whose post already exists does not change
that post.

### Type-level changes

Nothing is removed or renamed, and no call that worked in 1.15 fails at runtime, but TypeScript
can reject code that compiled against 1.15:

- **`OctopusPostCTA.label` is optional** (see "Per-language button labels" above): code that
  reads it needs `?? ''` or a narrowing check.
- **`fetchOrCreateClientObjectRelatedPost` takes an optional per-call `tokenProvider`** as its
  second parameter. A point-free callback now passes the array index there, which TypeScript
  refuses (TS2345); wrap it:

  ```ts
  // Before
  await Promise.all(articles.map(fetchOrCreateClientObjectRelatedPost));

  // After
  await Promise.all(
    articles.map((post) => fetchOrCreateClientObjectRelatedPost(post))
  );
  ```

  In plain JavaScript a non-function second argument is ignored, and the global bridge-share token
  listener signs as before.
- **`ScreenType` has a new member, `'communityAccessDenied'`**, reported by the `screenDisplayed`
  SDK event for the access denied screen (it was `'unknown'` before). A `Record<ScreenType, …>`
  or an exhaustive `switch` over `ScreenType` needs it.
- **`ClientPostErrorCode` and `NavigateToOctopusCreatePostErrorCode` have new `LOCALIZED_TEXT_…`
  members** (see "Per-language button labels" above): an exhaustive `switch` over either needs them.

## 1.15.0

The wrapped native SDKs move to the **1.15** line (Android 1.15.0, iOS 1.15.0), which removes
Octopus-owned authentication. One breaking change, three deprecated icon slots; the new APIs
are additive and listed in [`CHANGELOG.md`](./CHANGELOG.md).

### Breaking — SSO-only authentication: the `octopus` connection mode is removed

Your app now owns sign-in, aligned with the native SDKs' removal of Octopus-owned email
Magic Link authentication in 1.15.0. The `type: 'octopus'` connection mode and its optional
`deepLink` redirect field are removed from `initialize` and `switchCommunity`. The
`connectionMode` field remains required and accepts only the SSO object. Native account
settings, account deletion and logout flows are handled by your app.

**Before:**

```ts
await initialize({
  apiKey: 'YOUR_API_KEY',
  connectionMode: { type: 'octopus', deepLink: 'yourapp://sign-in' },
});
await switchCommunity({
  apiKey: 'YOUR_OTHER_API_KEY',
  connectionMode: { type: 'octopus' },
});
```

**After:**

```ts
import {
  addLoginRequiredListener,
  addUserTokenRequestListener,
  connectUser,
  initialize,
  switchCommunity,
} from '@octopus-community/react-native';

const loginSubscription = addLoginRequiredListener(() => openAppLogin());
const tokenSubscription = addUserTokenRequestListener(() => fetchTokenFromBackend());

await initialize({
  apiKey: 'YOUR_API_KEY',
  connectionMode: { type: 'sso', appManagedFields: [] },
});
// Once your app signs its user in; handle connection rejections in your UI.
await connectUser({ userId: signedInUser.id });

await switchCommunity({
  apiKey: 'YOUR_OTHER_API_KEY',
  connectionMode: { type: 'sso', appManagedFields: [] },
});
await connectUser({ userId: signedInUser.id });
```

`openAppLogin` opens your app's sign-in UI. `fetchTokenFromBackend` returns a fresh JWT
signed by your backend; never put the signing secret in the app. Register the provider
before `connectUser`; React components can use `useUserTokenProvider` instead. Include
`username`, `profilePicture` or `biography` in `appManagedFields` for fields owned by your
app. Remove the subscriptions when their owner unmounts, call `disconnectUser` when your
app signs out, and remount embedded views after switching community.

Old JavaScript callers and unknown connection modes are rejected by native, without a
fallback to SSO: `INITIALIZE_ERROR` for initialization or `SWITCH_COMMUNITY_ERROR` for a
community switch, with the message:
`Octopus-owned authentication was removed. SSO is required (connectionMode.type must be 'sso').`

The example runs SSO only. Stored SSO configurations remain usable; a stored removed mode
returns to Configuration. This change does not force a logout of a native stored session.

### Behaviour change (Android) — `fetchCommunityData` rejects when the lookup fails

When the native lookup fails (network, authentication, permission or server error),
`fetchCommunityData` now rejects with code `SERVER_ERROR` on Android. Before 1.15.0 it
resolved `null` there; iOS already rejected, so both platforms now behave the same. `null`
still means the member is unknown. An Android-only host that awaited the call without a
`catch` now gets an unhandled rejection: handle `SERVER_ERROR`.

```ts
try {
  const data = await fetchCommunityData({ clientUserId });
  // `data` is null when the member is unknown
} catch (error) {
  // `SERVER_ERROR`: keep the previous value or retry later
}
```

### Deprecated — `settings.account`, `settings.logout` and `settings.deleteAccountWarning` icons

The native screens that drew these three `theme.icons.settings` slots are gone with
Octopus-owned authentication, so an override is still accepted but has no visible effect on
either platform. Drop them from your theme; they will be removed in a future major version.
`settings.help` is not deprecated by the native SDKs and stays, but no native 1.15 screen
draws it either.

```ts
// Before
theme: { icons: { settings: { account, info, logout, deleteAccountWarning } } }

// After
theme: { icons: { settings: { info } } }
```

## 1.14.0

The wrapped native SDKs move to the **1.14** line (Android 1.14.1, iOS 1.14.0). No breaking
JavaScript API change: the new APIs (`theme.icons`, the Android-only `gray*`
theme colors, `PostCreatedEvent.groupId`) are additive and listed in
[`CHANGELOG.md`](./CHANGELOG.md). One deprecation and three host-side checks.

### Deprecated — `PostCreatedEvent.topicId`

`PostCreatedEvent` gains `groupId`, the name both native SDKs use. `topicId` is
deprecated: it still carries the same value on both platforms, so nothing breaks
today, but it will be removed in a future major version.

```ts
// Before
addSDKEventListener((event) => {
  if (event.type === 'postCreated') track(event.topicId);
});

// After
addSDKEventListener((event) => {
  if (event.type === 'postCreated') track(event.groupId);
});
```

### Android — nine string overrides are now unused

Native Android 1.14.0 replaced its empty-list texts with the new screen states
and removed these string resources. If your app overrides any of them in its own
`res/values*/strings.xml`, the override no longer shows anywhere — delete it:

`notifications_list_empty`, `post_create_incentive_button1` to
`post_create_incentive_button4`, `post_create_incentive_button6`,
`post_create_incentive_explanation`, `post_list_empty`,
`post_list_other_user_empty`.

### iOS — privacy manifest

Native iOS 1.14.0 ships a `PrivacyInfo.xcprivacy` inside the `OctopusCommunity`
pod, declaring the data the SDK collects and the required-reason APIs it uses.
Check that the App Privacy section of your App Store Connect page still matches
what your app, including the SDK, declares.

### iOS — the installation id survives a reinstall

Native iOS 1.14.0 keeps its installation id in the Keychain instead of the app
container, so deleting and reinstalling the app no longer hands out a new one —
a device-level ban is no longer shed by a reinstall. Existing installations keep
the id they already have, and a reinstall still signs the user out. Android
storage is unchanged: the id lives in the app's data, so it is reset whenever that
data is deleted and not restored from a backup. If your App Store
privacy answers or your own support flows assume a reinstall resets the device
identity, update them.

## 1.13.0

The SDK is catching up to the 1.12/1.13 public surface already shipped by the
native Android/iOS SDKs and the Flutter plugin (typed `OctopusResult`, `profile`
/ `groups` / `connectionState` streams, `setReaction`, the Bridge Post API,
initial-screen routing, the create-post screen, Unified Profile, …). The full
gap and the planned API shape are tracked in the **1.12 API parity** issue.

### Breaking — the `ScreenType` union changed

What follows is the consequence of the wrapped native SDKs crossing the
**1.13.0** boundary (they were 1.11.0) — that is the release that changed the
union, and the only version number this section depends on. The pins move on
past it independently per platform, so read `android/gradle.properties` and
`OctopusReactNativeSdk.podspec` for where they actually stand today rather than
a number frozen into this prose. Two changes to the union, both breaking for the
same consumer code, both shipped in this one release so hosts pay the migration
once:

1. `'settingsAbout'` is **removed**.
2. `'unknown'` is **added**.

Everything below applies to code that names these literals — a lookup table keyed
by `ScreenType` (`Record<ScreenType, …>`), or a `switch` whose exhaustiveness the
compiler checks. Code that treats the screen type as an opaque string is
unaffected.

#### `'settingsAbout'` removed

Native 1.13.0 removed the "About the community" screen — its three legal links were already
duplicated in the Activity and Profile overflow menus — so neither platform
emits that screen-displayed event anymore and the bridge can no longer produce
it. `'settingsAbout'` is therefore gone from the union.

Delete the branch — nothing replaces it, the screen itself is gone rather than
renamed.

```ts
// Before
const label: Record<ScreenType, string> = {
  settingsAccount: 'Account settings',
  settingsAbout: 'About the community',
  // …
};

// After
const label: Record<ScreenType, string> = {
  settingsAccount: 'Account settings',
  // …
};
```

There is no runtime change to handle: the event stopped being emitted when the
native screen was removed, so no host logic keyed on it can still fire.

#### `'unknown'` added

This one is a **type fix, not a new behaviour**: both event serializers have
always been able to emit `{"type": "unknown"}` for a native screen the wrapper
does not model yet, but the union did not contain the literal. So an exhaustive
`switch` over `ScreenType` type-checked and then fell through at runtime — it
returned `undefined` from a function typed `string`, with no compiler or lint
diagnostic anywhere on the path, because the type said the case could not happen.
`'unknown'` is reachable today from `mainFeed`, `groups` and `groupDetail`.

Adding the literal makes that hole visible, which is why it lands here rather
than in a later release: it breaks exactly the same code the `'settingsAbout'`
removal breaks, so folding it in costs one migration instead of two.

```ts
// Before — compiles, and silently returns undefined on an 'unknown' event
function label(screen: ScreenType): string {
  switch (screen) {
    case 'settingsAccount':
      return 'Account settings';
    // …every other member…
  }
}

// After — handle it explicitly, or with a default branch
function label(screen: ScreenType): string {
  switch (screen) {
    case 'settingsAccount':
      return 'Account settings';
    // …every other member…
    case 'unknown':
      return 'Other';
  }
}
```

New screens will keep arriving as `'unknown'` until the wrapper types them, so
treat it as a permanent forward-compatibility branch, not a temporary one.
`ReactionKind` in the same module already works this way.

### `'settingsList'` is Android-only from 1.13 — no compiler signal

Not a type change, so nothing in the union or in `tsc` marks it, but it changes
what a host's analytics receives.

Native iOS 1.13 deleted its settings-list screen (`SettingsListView` and its view
model are gone). The `settingsList` case still exists in the native iOS event
enum, so the bridge still compiles and no API dump or compiler warning fires —
but nothing emits it anymore: the sole emission site was in the deleted view, and
at 1.13.2 no emission site on iOS names the case. Android still emits it from its
settings screen.

Net effect after upgrading: `{"type": "settingsList"}` keeps arriving on Android
and **silently stops arriving on iOS**. If you count screen views per platform,
expect that screen's iOS count to go to zero — it is the screen being gone, not
the event pipeline breaking. No code change is required or possible on the
wrapper side; this note exists so the drop is not read as a regression.

### Still to come

Some of the parity work is **breaking** and will get a migration entry here when
it lands. Notably:

- **`overrideCommunityAccess(hasAccess)`** will return a typed result
  (`OctopusResult<void, …>`) instead of `Promise<void>`. Fire-and-forget
  callers (`await overrideCommunityAccess(true)`) keep compiling; callers that
  need to know whether the override was applied should inspect the result.

No action is required yet — this section is a heads-up so integrators can plan.

<!--
Template for a real migration section (copy when a breaking release lands):

## From 1.x.y to 1.x.z

### <area that changed>

```ts
// Before
…

// After
…
```

### <next area>
…
-->
