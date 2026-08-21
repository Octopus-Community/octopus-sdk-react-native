# @octopus-community/react-native

React Native module for the Octopus Community [Android](https://github.com/Octopus-Community/octopus-sdk-android) and [Swift](https://github.com/Octopus-Community/octopus-sdk-swift) SDKs.

**Official documentation:** [Octopus Developer Guide](https://doc.octopuscommunity.com/) — for concepts, SSO setup, and native SDK details.

- [Features](#features)
- [Installation](#installation)
  - [iOS setup](#ios-setup)
  - [Compatibility table](#compatibility-table)
- [Usage](#usage)
  - [Initialization](#initialization)
  - [Show the UI](#show-the-ui)
  - [API docs](./docs/api/README.md)
  - [Example app](./example)
- [Troubleshooting](#troubleshooting)
- [Documentation index](./docs/README.md)

## Features

- **SSO (Single Sign-On)** — Connect your users with JWT from your backend; app-managed profile fields
- **Theme customization** — Colors, fonts, logo; light/dark and dual-mode support
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

| React Native version(s) | Android       | iOS   | Old arch | New arch      | Octopus native SDK |
| ----------------------- | ------------- | ----- | -------- | ------------- | ------------------ |
| v0.81.x (tested 0.81.4) | 7.0+ (API 24) | 15.1+ | ✅       | Interop layer | 1.13.2             |

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
levels are independent — package 1.13.0 wrapping Android 1.13.2 and iOS 1.13.2 is
normal, and the table above names the exact pins.

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

### Theme Customization

The Octopus SDK provides comprehensive theming capabilities to match your app's branding. You can customize colors, fonts, and logo, with full support for both light and dark modes.

#### Basic Theme Setup

```ts
import { Image } from 'react-native';

await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: { type: 'octopus' },
  theme: {
    colors: {
      primary: '#FF6B35', // Main brand color
      primaryLowContrast: '#FF8C69', // Lighter variation of primary
      primaryHighContrast: '#CC4A1A', // Darker variation for high contrast
      onPrimary: '#FFFFFF', // Text color on primary background
      link: '#1D9BD1', // URLs rendered in posts and comments
      background: '#FFFFFF', // Community screens background (both modes here — see
                             // the dual-mode form below for per-mode values)
    },
    logo: {
      image: Image.resolveAssetSource(require('./assets/images/logo.png')),
    },
  }
});
```

#### Dark/Light Mode Management

The SDK automatically handles system appearance changes, but you can also force specific modes:

##### System Mode (Default)
```ts
// The SDK automatically follows the system appearance
// No additional configuration needed
await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: { type: 'octopus' },
  theme: { /* your theme */ }
});
```

##### Forced Light Mode
```ts
import { Appearance } from 'react-native';

// Force light mode for your entire app
Appearance.setColorScheme('light');

await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: { type: 'octopus' },
  theme: { /* your theme */ }
});
```

##### Forced Dark Mode
```ts
import { Appearance } from 'react-native';

// Force dark mode for your entire app
Appearance.setColorScheme('dark');

await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: { type: 'octopus' },
  theme: { /* your theme */ }
});
```

#### Dual-Mode Color Themes

For enhanced theming, you can provide separate color sets for light and dark modes:

```ts
await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: { type: 'octopus' },
  theme: {
    colors: {
      light: {
        primary: '#3B82F6', // Blue for light mode
        primaryLowContrast: '#60A5FA',
        primaryHighContrast: '#1D4ED8',
        onPrimary: '#FFFFFF',
      },
      dark: {
        primary: '#60A5FA', // Lighter blue for dark mode
        primaryLowContrast: '#93C5FD',
        primaryHighContrast: '#3B82F6',
        onPrimary: '#000000',
      },
    },
  }
});
```

#### Font Customization

Customize typography with text styles and font sizes:

```ts
await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: { type: 'octopus' },
  theme: {
    fonts: {
      // Theme-wide: applied to every text style below.
      fontFamily: 'MyBrandFont-Regular', // must be registered natively — see below
      fontWeight: 500, // 100-900, the CSS scale; needs no registration
      textStyles: {
        title1: {
          fontType: 'serif', // serif, monospace, or default
          fontSize: { size: 28 }
        },
        title2: {
          fontType: 'serif',
          fontSize: { size: 22 }
        },
        body1: {
          fontType: 'default', // Uses system default
          fontSize: { size: 16 }
        },
        body2: {
          fontSize: { size: 14 } // Only size, uses default font type
        },
        caption1: {
          fontType: 'monospace',
          fontSize: { size: 12 }
        },
        caption2: {
          fontSize: { size: 10 }
        },
        navBarItem: {
          fontSize: { size: 16 } // iOS only — no effect on Android
        },
      }
    }
  }
});
```

#### Theme Application

Themes are applied when the Octopus UI is opened. The SDK automatically detects the current system appearance (light/dark mode) and applies the appropriate theme configuration.

#### Complete Theme Example

Here's a comprehensive example showing all theming options:

```ts
import { Image, Appearance } from 'react-native';
import { initialize } from '@octopus-community/react-native';

// Force dark mode (optional)
Appearance.setColorScheme('dark');

await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: {
    type: 'sso',
    appManagedFields: ['username', 'profilePicture']
  },
  theme: {
    // Dual-mode colors
    colors: {
      light: {
        primary: '#8B5CF6',
        primaryLowContrast: '#A78BFA',
        primaryHighContrast: '#7C3AED',
        onPrimary: '#FFFFFF',
      },
      dark: {
        primary: '#A78BFA',
        primaryLowContrast: '#C4B5FD',
        primaryHighContrast: '#8B5CF6',
        onPrimary: '#000000',
      },
    },
    // Custom fonts
    fonts: {
      textStyles: {
        title1: { fontType: 'serif', fontSize: { size: 28 } },
        title2: { fontType: 'serif', fontSize: { size: 22 } },
        body1: { fontSize: { size: 16 } },
        body2: { fontSize: { size: 14 } },
        caption1: { fontType: 'monospace', fontSize: { size: 12 } },
        caption2: { fontSize: { size: 10 } },
      }
    },
    // Custom logo
    logo: {
      image: Image.resolveAssetSource(require('./assets/images/logo.png')),
    },
  }
});
```

#### Dynamic Theme Switching

To change themes in your app, you need to re-initialize the SDK with the new theme configuration:

```ts
// Example: Switch between different theme sets
const switchToGreenTheme = async () => {
  await initialize({
    apiKey: 'YOUR_OCTOPUS_API_KEY',
    connectionMode: { type: 'sso', appManagedFields: ['username'] },
    theme: {
      colors: {
        light: {
          primary: '#10B981',
          primaryLowContrast: '#34D399',
          primaryHighContrast: '#059669',
          onPrimary: '#FFFFFF',
        },
        dark: {
          primary: '#34D399',
          primaryLowContrast: '#6EE7B7',
          primaryHighContrast: '#10B981',
          onPrimary: '#000000',
        },
      }
    }
  });
};
```

#### Theme Configuration Reference

**Color Properties:**
- `primary`: Main brand color (hex format: `#FF6B35` or `FF6B35`)
- `primaryLowContrast`: Lighter variation for subtle elements
- `primaryHighContrast`: Darker variation for high contrast needs
- `onPrimary`: Text color displayed over primary background
- `link`: Color of links, i.e. URLs rendered inside posts and comments. Cosmetic only —
  it does not change how a link is opened. Omit it for the native default.
- `background`: Background color of the community screens. Omit it for the native
  default (the Octopus light/dark scheme background on Android, the system background
  on iOS).

Every color is optional and independent: a theme carrying only `link`, or only
`background`, is applied as-is. A color that is not a parseable hex string is dropped —
the SDK default applies and a warning is logged at `initialize`.

All the accepted hex forms are normalized to `#RRGGBB` (or `#AARRGGBB` with alpha)
before reaching the native layer, so the same input renders the same color on both
platforms. Write the leading `#` if you like it; you get the same result without it.

**Theme-wide font (`fonts.fontFamily` / `fonts.fontWeight`):**

Both are optional and apply to *every* text style, including navigation-bar items.

- `fontFamily`: an arbitrary font family name. **It is not resolved from the
  JavaScript bundle** — the SDK's screens are native (Compose on Android, SwiftUI on
  iOS), so the font must be registered with the *host app*, which is exactly what
  linking it with `react-native-asset` does:
  - **Android**: the resource name under `android/app/src/main/res/font/` —
    `res/font/my_brand_font.ttf` is passed as `'my_brand_font'` (lowercase and
    underscores only, no extension).
  - **iOS**: the exact **PostScript name** of a font added to the Xcode project and
    declared under `UIAppFonts` in `Info.plist`. This is often not the filename;
    check it in Font Book.

  If the name does not resolve, the SDK logs a native warning and keeps its own
  default font.
- `fontWeight`: a whole number on the 100 (thinnest) - 900 (boldest) CSS scale — 400
  is regular, 700 is bold. It needs no native registration: it applies on top of
  whichever family is in effect, and native rendering picks the closest weight the
  font has a face for (iOS buckets to the nearest of SwiftUI's nine named weights).
  A value outside 100-900, or a non-integer, is dropped with a warning at
  `initialize` and the native default weight applies.

`fontFamily` **takes precedence over the per-style `fontType`.** They are not two
competing mechanisms: `fontType` picks one of three *system* designs for one style,
`fontFamily` names an arbitrary registered family for the whole theme, so the family
is the more specific request and wins on every style. If it does not resolve
natively, each style falls back to its `fontType` — so a `fontType` set alongside
still works, as the fallback it now is. Setting both logs a warning at `initialize`
naming the styles whose `fontType` is superseded.

**Android navigation-bar side effect**: setting `fontFamily` or `fontWeight` also
sets the Android navigation-bar title to the size of `body1`, which is smaller than
the title size used with no font override. The native top-app-bar title has no
typography role of its own and the style passed to it replaces the ambient one
instead of merging with it, so a complete style has to be supplied. Use
`textStyles.body1.fontSize` to control the resulting size. iOS is unaffected.

**Font Types:**
- `default`: System default font
- `serif`: Serif font family
- `monospace`: Monospace font family

Superseded by `fonts.fontFamily` when that resolves — see above.

**Text Styles:**
- `title1`: Large titles (default: 28pt)
- `title2`: Medium titles (default: 22pt)
- `body1`: Primary body text (default: 16pt)
- `body2`: Secondary body text (default: 14pt)
- `caption1`: Small captions (default: 12pt)
- `caption2`: Extra small captions (default: 10pt)
- `navBarItem`: Navigation-bar items — back/close labels and bar actions. **iOS
  only**: the native iOS theme has a dedicated nav-bar-item font slot and the
  native Android typography has no counterpart, so this style has no effect on
  Android. Omit it and nav-bar items follow `body1`; omit `body1` too and the
  slot falls back to a 17pt system font — not to the native iOS `.body` default,
  because any `textStyles` entry makes the bridge build all seven slots
  explicitly. Passing no `fonts` block at all leaves the native theme untouched.



**Supported Formats:**
- **Colors**: 3-digit (`#F63`), 6-digit (`#FF6633`) or 8-digit (`#80FF6633`) hex codes,
  with or without the leading `#`. An 8-digit value is **`AARRGGBB` — alpha first**, as
  both native SDKs read it, *not* the `#RRGGBBAA` of CSS.
- **Images**: Use `Image.resolveAssetSource(require('./path/to/image.png'))` for bundled assets
- **Fonts**: `serif`, `monospace` or `default` per style, or a natively registered
  family name for the whole theme via `fonts.fontFamily`

**Platform Behavior:**
- **iOS**: Uses adaptive colors that automatically respond to system appearance changes
- **Android**: Theme is applied when the UI opens and reflects the current system appearance
- **Theme Changes**: Require re-initializing the SDK with new theme configuration
- **System Mode**: Automatically follows device light/dark mode settings
- **Forced Mode**: Use `Appearance.setColorScheme('light'|'dark')` to override system settings

**Note**: All theme properties are optional. If not provided, the default Octopus theme will be used.

For more detailed theming information and advanced customization options, see the [Octopus Community iOS SDK theming documentation](https://doc.octopuscommunity.com/SDK/sso/ios#modify-the-theme).

### Customize the TopAppBar

Customize the main-feed navigation bar globally at `initialize()`. It applies to
both the modal (`openUI()`) and the embedded `<OctopusUIView>`.

```ts
import { initialize } from '@octopus-community/react-native';

await initialize({
  apiKey: 'your-api-key',
  connectionMode: { type: 'octopus' },
  topAppBar: {
    title: { type: 'text', text: 'My Community' }, // or { type: 'logo' }
    alignment: 'center',                            // 'leading' (default) | 'center'
    coloredBackground: true,                        // primary color background
  },
});
```

| Option | Values | Notes |
|---|---|---|
| `title` | `{ type: 'logo' }` \| `{ type: 'text', text }` | `logo` uses `theme.logo`. Keep text under ~18 chars. Default: logo. |
| `alignment` | `'leading'` \| `'center'` | Default: `'leading'`. |
| `coloredBackground` | `boolean` | Uses the theme primary color. **iOS requires iOS 16+** (ignored below 16). Default: `false`. |

Omitting `topAppBar` keeps the default appearance (logo, leading, no colored
background).

> **Title vs. logo:** Use either a logo **or** a text title — not both. When a
> `theme.logo` is configured, Android gives the logo precedence over a `text`
> title in the nav bar (a native-SDK behavior), whereas iOS shows the text. For
> a consistent text title across platforms, don't set a `theme.logo`.

### API docs

For details about the Typescript API, head to the [API docs](./docs/api/README.md).

#### Key Theming Functions

- **`initialize(params)`**: Initialize the SDK with theme configuration
- **`Appearance.setColorScheme(mode)`**: Force light/dark mode (React Native API)
- **`openUI()`**: Open the Octopus UI with the current theme applied

### Example app

The [example app](./example) demonstrates the full SDK surface. From the root, run `yarn example start` then `yarn example ios` or `yarn example android`. It uses a tabbed UI:

| Tab | Purpose |
|-----|---------|
| **Setup** | Initialize the SDK (API key, SSO/Octopus mode), connect/disconnect user, display mode (fullscreen vs embed), locale override, URL interception toggle |
| **Community** | Open the Octopus UI (fullscreen or embedded) with the current theme and options |
| **Theme** | Theming: system/light/dark, color set, fonts, logo, bottom inset; see changes when reopening the UI |
| **SDK Data** | Notifications count (refresh, listener), community access (override, track, listener), custom events, SDK event log |

See [example/README.md](./example/README.md) for environment variables (API key, SSO user/token) and run instructions. The example is the best reference for implementing SSO, theming, reactive events, and URL interception in your app.

## Troubleshooting

Any error that might be intercepted by the React Native module will be rejected in the methods you call. If it cannot be intercepted, you may see the underlying SDK's logs in your native logs.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.
