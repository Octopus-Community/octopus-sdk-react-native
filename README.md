# Octopus Community SDK for React Native

[![npm package](https://img.shields.io/npm/v/@octopus-community/react-native.svg)](https://www.npmjs.com/package/@octopus-community/react-native)
[![Android SDK](https://img.shields.io/badge/Android_SDK-1.13.4-34a853?logo=android&logoColor=white)](https://github.com/Octopus-Community/octopus-sdk-android)
[![iOS SDK](https://img.shields.io/badge/iOS_SDK-1.13.2-f05138?logo=apple&logoColor=white)](https://github.com/Octopus-Community/octopus-sdk-swift)

React Native module for the Octopus Community [Android](https://github.com/Octopus-Community/octopus-sdk-android) and [Swift](https://github.com/Octopus-Community/octopus-sdk-swift) SDKs.

**Official documentation:** [Octopus Developer Guide](https://doc.octopuscommunity.com/) — for concepts, SSO setup, and native SDK details.

- [Features](#features)
- [Installation](#installation)
  - [iOS setup](#ios-setup)
  - [Compatibility table](#compatibility-table)
- [Usage](#usage)
  - [Initialization](#initialization)
  - [Show the UI](#show-the-ui)
  - [Theming](#theming)
  - [API docs](./docs/api/README.md)
  - [Example app](./example)
- [Troubleshooting](#troubleshooting)
- [Documentation index](./docs/README.md)
- [License](#license)

## Features

- **SSO (Single Sign-On)** — Connect your users with JWT from your backend; app-managed profile fields
- **Theme customization** — Colors, fonts, logo and top app bar; light/dark and dual-mode support. See the [theming guide](./docs/theming.md).
- **Display modes** — Fullscreen via [`openUI()`](./docs/api/functions/openUI.md) or embedded via the `OctopusUIView` component (see [API reference](./docs/api/README.md))
- **Reactive events** — Unread notification count, community access state, and typed SDK events (content, interactions, gamification, navigation)
- **Reactive state** — Observe the SDK's current state, with the last value replayed to every new subscriber: the connected profile ([`addProfileListener`](./docs/api/functions/addProfileListener.md)), the followed groups ([`addGroupsListener`](./docs/api/functions/addGroupsListener.md)), the connection state ([`addConnectionStateListener`](./docs/api/functions/addConnectionStateListener.md), [`addIsUserConnectedListener`](./docs/api/functions/addIsUserConnectedListener.md)) and initialization ([`addIsInitialisedListener`](./docs/api/functions/addIsInitialisedListener.md)). Each has a synchronous getter counterpart ([`getProfile`](./docs/api/functions/getProfile.md), [`getGroups`](./docs/api/functions/getGroups.md), [`getConnectionState`](./docs/api/functions/getConnectionState.md), [`isUserConnected`](./docs/api/functions/isUserConnected.md), [`isInitialised`](./docs/api/functions/isInitialised.md)).
- **Community access / A/B testing** — Two cases: (1) **Octopus manages the cohort**: the SDK decides who has access; use [`overrideCommunityAccess`](./docs/api/functions/overrideCommunityAccess.md) to override for testing and [`addHasAccessToCommunityListener`](./docs/api/functions/addHasAccessToCommunityListener.md) to react to the state. (2) **Your app manages access**: your app decides who sees the community (e.g. your own feature flag); use [`trackCommunityAccess`](./docs/api/functions/trackCommunityAccess.md) to report the value to Octopus for analytics only (it does not change actual access).
- **Locale override** — Set SDK UI language programmatically ([`overrideDefaultLocale`](./docs/api/functions/overrideDefaultLocale.md))
- **Custom analytics** — Track custom events ([`trackCustomEvent`](./docs/api/functions/trackCustomEvent.md))
- **URL interception** — Handle link taps in your app ([`addNavigateToUrlListener`](./docs/api/functions/addNavigateToUrlListener.md))
- **Unified Profile** — Show your own profile screen when a member is tapped ([`addNavigateToProfileListener`](./docs/api/functions/addNavigateToProfileListener.md)). Opt in with `interceptProfileTaps`; requires a community configured to expose client user ids.
- **Push notifications** — Receive token-based pushes from Octopus; tap to deep-link into the SDK ([`registerPushNotificationToken`](./docs/api/functions/registerPushNotificationToken.md), [`openNotification`](./docs/api/functions/openNotification.md)). See [push notifications guide](./docs/push-notifications.md).
- **Batch follow/unfollow** — Sync many group follow actions in one round-trip ([`syncFollowGroups`](./docs/api/functions/syncFollowGroups.md)). See [sync follow groups guide](./docs/sync-follow-groups.md).
- **Groups & entitlements** — List groups and follow/unfollow one at a time ([`fetchGroups`](./docs/api/functions/fetchGroups.md), [`followGroup`](./docs/api/functions/followGroup.md)/[`unfollowGroup`](./docs/api/functions/unfollowGroup.md)); react to a gated group being tapped ([`setGroupAccessDeniedCallback`](./docs/api/functions/setGroupAccessDeniedCallback.md)); force a refresh of the connected user's entitlements after your own purchase flow ([`refreshEntitlements`](./docs/api/functions/refreshEntitlements.md)).

## Installation

```sh
npm install @octopus-community/react-native
```

### iOS setup

Make sure to `use_frameworks` in your `Podfile`.

```ruby
# Podfile
linkage = :static # or :dynamic
if linkage != nil
  Pod::UI.puts "Configuring Pod with #{linkage}ally linked Frameworks".green
  use_frameworks! :linkage => linkage.to_sym
end
```

Due to a bug in Xcode 15, you might need to set `ENABLE_USER_SCRIPT_SANDBOXING` to YES and then to NO in order to compile (see [this issue](https://github.com/CocoaPods/CocoaPods/issues/11946#issuecomment-1948423786)).

### Compatibility table

| React Native version(s) | Android       | iOS   | Old arch | New arch      | Octopus native SDK          |
| ----------------------- | ------------- | ----- | -------- | ------------- | --------------------------- |
| v0.81.x (tested 0.81.4) | 7.0+ (API 24) | 15.1+ | ✅       | Interop layer | Android 1.13.4 · iOS 1.13.2 |

* Older React Native versions (e.g. v0.78+) may work but are untested
* New architecture is supported via the React Native interoperability layer
* The minimum iOS version and the minimum Xcode version are the ones required by
  React Native itself, so they move with the React Native version you use
* Other requirements:
  * **Android**: Kotlin 2.x
  * **iOS**: Xcode 16.1+

#### Versioning

This package's `MAJOR.MINOR` tracks the wrapped native Octopus SDKs, so the two
numbers can be read together: package 1.13.x wraps native 1.13.x. The patch
levels are independent — package 1.13.0 wrapping Android 1.13.3 and iOS 1.13.2 is
normal, and the table above names the exact pins. That also means the two native
pins agree on `MAJOR.MINOR` but not necessarily on `PATCH`: when one platform
ships a fix the other does not need, only that platform's pin moves.

One consequence to plan for: because the minor tracks the natives, a **breaking
TypeScript change can arrive in a minor** — each one gets a section with a
before/after in [`MIGRATING.md`](./MIGRATING.md), and the release it shipped in is
listed in [`CHANGELOG.md`](./CHANGELOG.md).

### Expo

Configure `use_frameworks` (static or dynamic) with `expo-build-properties`:

```json
[
  "expo-build-properties",
  {
    "ios": {
      "useFrameworks": "static"
    }
  }
]
```

## Usage

### Initialization

Initialize the SDK with your API key with [`initialize`](./docs/api/functions/initialize.md).

Choose whether your app or Octopus handles user authentication:

#### Octopus-handled authentication

```ts
import { initialize } from '@octopus-community/react-native';

await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: { type: 'octopus' }
});
```

#### Single Sign-On (SSO)

For SSO mode:

* your app manages user authentication and certain profile fields; you specify which profile fields your app will handle directly
* you must provide a token provider that returns a valid JWT for the connected user. **The JWT must be signed on your backend** using the secret key provided by Octopus — never embed the secret in the app. See [Generate a signed JWT for SSO](https://doc.octopuscommunity.com/backend/sso)
* **handle the `connectUser` rejection.** The promise rejects when the platform refuses the
  connection — banned user, JWT the backend won't accept, no network. Ignoring it leaves the user
  anonymous while your app believes it connected them, which the user experiences as a login
  screen that "does nothing": they sign in, come back to the community, and are still asked for an
  account. See [error handling below](#handling-a-refused-connection).
* in React components, use the `useUserTokenProvider` hook to supply the token:

```ts
import {
  initialize,
  addEditUserListener,
  addLoginRequiredListener,
  connectUser,
  disconnectUser,
  isConnectUserError,
  useUserTokenProvider,
  closeUI,
} from '@octopus-community/react-native';

// Initialize with SSO mode and custom theme
await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: {
    type: 'sso',
    appManagedFields: ['username', 'profilePicture', 'biography']
  },
  theme: {
    colors: {
      primary: '#FF6B35', // Your brand's primary color
      primaryLowContrast: '#FF8C69', // Lighter variation
      primaryHighContrast: '#CC4A1A', // Darker variation
      onPrimary: '#FFFFFF', // Text color on primary background
    },
    logo: {
      image: Image.resolveAssetSource(require('./assets/images/logo.png')), // Your custom logo
    },
  }
});

// Listen for when authentication is required
const loginRequiredSubscription = addLoginRequiredListener(() => {
  // Navigate to your app's login screen
  console.log('User needs to log in');
  closeUI();
});

// Listen for when users want to edit their profile
const editUserSubscription = addEditUserListener(({ fieldToEdit }) => {
  // Navigate to your app's profile editing screen
  // for the specific field (username, profilePicture, etc.)
  console.log(`User wants to edit: ${fieldToEdit}`);
  closeUI();
});

// Set up token provider (in a React component)
useUserTokenProvider(async () => {
  const token = await refreshUserToken();
  return token;
});

// Connect a user after they log in.
// The token provider above must already be registered: the promise resolves only once the
// platform has authenticated the user, and rejects when it refuses.
try {
  await connectUser({
    userId: 'unique-user-id',
    profile: {
      username: 'john_doe',
      profilePicture: 'https://example.com/avatar.jpg',
      biography: 'Software developer',
    },
  });
} catch (error) {
  if (isConnectUserError(error) && error.code === 'USER_BANNED') {
    // `message` is the reason the platform itself returned — display it as-is.
    showBlockingMessage(error.message);
  } else {
    // The user is still anonymous. Say so, instead of returning them to the login screen.
    showRetryableError();
  }
}

// Disconnect the user when they log out
await disconnectUser();

// Cleanup listeners when appropriate (eg. in return of a useEffect)
loginRequiredSubscription.remove();
editUserSubscription.remove();
```

#### Handling a refused connection

`connectUser` rejects with an error whose `code` says why. The full list — and which platform
reports each one — is in
[`ConnectUserErrorCode`](./docs/api/type-aliases/ConnectUserErrorCode.md); the ones worth an
explicit branch:

| `code` | What happened | What to do |
|---|---|---|
| `USER_BANNED` | The user is banned from the community. | Show `error.message` — it is the reason the platform returned. Do not retry. |
| `MISSING_TOKEN` | Your token provider returned nothing usable. **An empty string counts as no token** — throw instead of returning `''`. | Fix the provider; re-authenticate the user in your app. |
| `INVALID_TOKEN` | The JWT was rejected (bad signature or algorithm). | Check the backend signing key and algorithm against [Generate a signed JWT for SSO](https://doc.octopuscommunity.com/backend/sso). |
| `TOKEN_REQUEST_TIMEOUT` | Nobody answered the token request within 60 s. | Register `useUserTokenProvider` / `addUserTokenRequestListener` **before** calling `connectUser` — a request emitted while nothing is listening is dropped — and make sure the provider always returns or throws. |
| `NO_NETWORK` | No connection was available. | Retry later; tell the user the community is unavailable. |
| `SERVER_ERROR` | The platform answered with an error it does not classify further — this covers transient outages *and* permanent problems such as a malformed request. | Read `error.message` before deciding: retry the transient ones, report the rest. |

Three limits worth knowing:

* **On iOS, a token request that fails does not always reject.** When nothing is connected yet,
  the native SDK falls back to an anonymous connection and reports success, so a provider that
  times out or throws can leave you with a resolved promise and an unauthenticated user. Treat a
  resolved `connectUser` as "the SDK is usable" rather than "my user is authenticated", and make
  answering every token request the thing you rely on.
* **The rejection covers the connection attempt only.** The platform calls your token provider
  again later (for instance when it refreshes the user's rights). A failure at that point has no
  promise left to reject, and this version has no event for it — the user simply stops being
  authenticated.
* **Codes are not symmetric across platforms**, because the native SDKs classify failures
  differently. Branch on the codes you handle and keep a default branch; never assume a given
  platform emits a specific one.

### Show the UI

You can show the Octopus Community in two ways:

- **Fullscreen** — Call [`openUI()`](./docs/api/functions/openUI.md) to open the native Octopus home screen (modal-style). Use [`closeUI()`](./docs/api/functions/closeUI.md) to dismiss it.
- **Embedded** — Render the `OctopusUIView` component inside your React tree for an in-screen embed. Pass `displayMode="embed"` or `displayMode="fullscreen"` and optional theme/options. See the [API reference](./docs/api/README.md) and the [example app](./example) for usage.

### Theming

Match the SDK UI to your brand — colors (single set or light/dark pairs), font family and
text styles, logo, and the top app bar — all through `initialize()`:

```ts
import { Image } from 'react-native';

await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: { type: 'octopus' },
  theme: {
    colors: {
      primary: '#FF6B35',
      primaryLowContrast: '#FF8C69',
      primaryHighContrast: '#CC4A1A',
      onPrimary: '#FFFFFF',
    },
    logo: {
      image: Image.resolveAssetSource(require('./assets/images/logo.png')),
    },
  },
});
```

All theme properties are optional; anything you omit keeps the default Octopus appearance. A
theme is read at initialization, so changing it means calling `initialize()` again.

**See the [theming guide](./docs/theming.md)** for dual-mode colors, custom fonts (including
`fontFamily` and how to register it with the host app), every text style, the top app bar
options, and the platform-behaviour notes.

### API docs

For details about the Typescript API, head to the [API docs](./docs/api/README.md).

### Example app

The [example app](./example) demonstrates the full SDK surface. From the root, run `yarn example start` then `yarn example ios` or `yarn example android`. It opens on a Config screen (API key, auth mode — SSO or Octopus — user id, theme, then **Start**; **Start** stays disabled until a key resolves) and then shows four tabs:

| Tab | Purpose |
|-----|---------|
| **Home** | Read-only dashboard: SDK status, API key source, server, connection state, unseen count, community access |
| **Scenarios** | Searchable index of capabilities; each opens a page with single-tap QA presets, its result panel, and that capability's controls (theming, batch group sync, custom events, push token) |
| **Settings** | Connect/disconnect, display mode (fullscreen vs embed), URL interception, profile taps, locale override, Back to Config, Debug console |
| **Community** | Open the Octopus UI (fullscreen or embedded) with the current theme and options |

See [example/README.md](./example/README.md) for environment variables (API key, SSO user/token) and run instructions. The example is the best reference for implementing SSO, theming, reactive events, and URL interception in your app.

## Troubleshooting

Any error that might be intercepted by the React Native module will be rejected in the methods you call. If it cannot be intercepted, you may see the underlying SDK's logs in your native logs.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

Use of this SDK is governed by the [Octopus Community Mobile SDK License Agreement](LICENSE.md).
