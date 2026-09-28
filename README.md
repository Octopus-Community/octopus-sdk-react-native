# Octopus Community SDK for React Native

[![npm package](https://img.shields.io/npm/v/@octopus-community/react-native.svg)](https://www.npmjs.com/package/@octopus-community/react-native)
[![Platforms](https://img.shields.io/badge/platforms-Android_7.0%2B_%7C_iOS_15.1%2B-lightgrey)](#requirements)
[![Android SDK](https://img.shields.io/badge/Android_SDK-1.14.1-34a853?logo=android&logoColor=white)](https://github.com/Octopus-Community/octopus-sdk-android)
[![iOS SDK](https://img.shields.io/badge/iOS_SDK-1.14.0-f05138?logo=apple&logoColor=white)](https://github.com/Octopus-Community/octopus-sdk-swift)
[![License](https://img.shields.io/badge/license-Octopus_SDK_License-lightgrey)](LICENSE.md)

Add a branded community (feed, posts, comments, reactions, profiles, groups) to your React Native
app. The module wraps the native Octopus [Android](https://github.com/Octopus-Community/octopus-sdk-android)
and [iOS](https://github.com/Octopus-Community/octopus-sdk-swift) SDKs behind one TypeScript API.

<img src="https://raw.githubusercontent.com/Octopus-Community/octopus-sdk-android/main/docs/images/fullscreen.png" width="280" alt="The Octopus community feed, as rendered by the native Android SDK">

## What you get

- **Native UI, no webview**: the community screens are the native SDKs' own (Jetpack Compose on
  Android, SwiftUI on iOS), opened fullscreen with `openUI()` or embedded with the
  `OctopusUIView` component.
- **Your brand**: colors (single set or light/dark pairs), fonts, logo, icons, screen-state illustrations and top app bar,
  all passed to `initialize()`. See the [theming guide](./docs/theming.md).
- **Your accounts**: connect your signed-in users through SSO with a JWT signed on your backend,
  or let Octopus run its own sign-in flow.
- **Nothing to host**: Octopus runs the backend and storage, the moderation, and the web dashboard
  for moderation, animation and analytics.
- **Hooks into your app**: unread-notification count, typed SDK events, URL and profile-tap
  interception, push notifications and custom analytics events.

## Requirements

### Compatibility table

| React Native version(s) | Android       | iOS   | Old arch | New arch      | Octopus native SDK          |
| ----------------------- | ------------- | ----- | -------- | ------------- | --------------------------- |
| v0.81.x (tested 0.81.4) | 7.0+ (API 24) | 15.1+ | ✅       | Interop layer | Android 1.14.1 · iOS 1.14.0 |

* Older React Native versions (e.g. v0.78+) may work but are untested
* New architecture is supported via the React Native interoperability layer
* The minimum iOS and Xcode versions are the ones React Native itself requires, so they move with
  the React Native version you use
* Other requirements:
  * **Android**: Kotlin 2.x
  * **iOS**: Xcode 16.1+, CocoaPods with `use_frameworks!` (see below)
* Package `MAJOR.MINOR` tracks the native SDKs (1.13.x wraps native 1.13.x), so a breaking
  TypeScript change can ship in a minor; each one is documented in [MIGRATING.md](./MIGRATING.md).
  Details in the [integration guide](./docs/integration-guide.md#versioning).

## Installation

```sh
npm install @octopus-community/react-native
```

**iOS**: the native SDK is distributed as frameworks and must be linked **statically** — with
dynamic frameworks the native UI cannot find its resource bundle and the first Octopus screen
crashes. Enable it in your `Podfile`, then run `pod install`:

```ruby
# Podfile
use_frameworks! :linkage => :static
```

CocoaPods applies this to every pod of the target. Next to Firebase Firestore (or another pod that
depends on `gRPC-Core`), the link can fail with `Undefined symbol: grpc_…`: see
[Troubleshooting](./docs/integration-guide.md#troubleshooting).

**Expo**: set the same option through `expo-build-properties`:

```json
["expo-build-properties", { "ios": { "useFrameworks": "static" } }]
```

## Quickstart

```tsx
import { Button } from 'react-native';
import { initialize, openUI } from '@octopus-community/react-native';

// 1. Once, at app start. Octopus runs the sign-in flow here; see the SSO guide to use your own accounts.
initialize({
  apiKey: 'YOUR_API_KEY',
  connectionMode: { type: 'octopus' },
}).catch(console.error);

// 2. Open the community from anywhere in your UI.
export function CommunityButton() {
  return <Button title="Community" onPress={() => openUI()} />;
}
```

To connect your own users instead, pass `connectionMode: { type: 'sso', appManagedFields: [...] }`
and follow [Single Sign-On](./docs/integration-guide.md#single-sign-on-sso): the JWT is signed on
your backend ([how](https://doc.octopuscommunity.com/backend/sso)), and `connectUser` rejections
must be handled ([error codes](./docs/integration-guide.md#handling-a-refused-connection)).

## Sample app

The [`example/`](./example) app exercises the whole SDK surface: SSO and Octopus sign-in,
theming, fullscreen and embedded display, events, push and groups. From the repository root:

```sh
yarn                                  # install the library and the example app
cp example/.env.dist example/.env     # then set OCTOPUS_COMMUNITY_API_KEY
yarn example android                  # iOS: yarn example ios:pod && yarn example ios
```

You need an API key: [request a sandbox key](https://doc.octopuscommunity.com/getting_started#1-get-an-api-key)
with the form in the Octopus Developer Guide. Left unset, `OCTOPUS_API_HOST` points the sample at
the Octopus demo backend; a key issued for production needs `OCTOPUS_API_HOST=api.8pus.io`. The
[example README](./example/README.md) covers the other variables and the first iOS run
(`bundle install`).

## Links

- [Octopus Developer Guide](https://doc.octopuscommunity.com/): concepts, SSO backend setup, the
  [React Native setup guide](https://doc.octopuscommunity.com/SDK/sso?platform=react-native)
- [Integration guide](./docs/integration-guide.md): feature map, SSO and connection errors,
  display modes, theming, versioning, troubleshooting
- [API reference](./docs/api/README.md) · [Theming](./docs/theming.md) ·
  [Push notifications](./docs/push-notifications.md) · [Sync follow groups](./docs/sync-follow-groups.md)
- [CHANGELOG](./CHANGELOG.md) · [MIGRATING](./MIGRATING.md) · [Contributing](./CONTRIBUTING.md)

Other Octopus SDKs: [Android](https://github.com/Octopus-Community/octopus-sdk-android) ·
[iOS](https://github.com/Octopus-Community/octopus-sdk-swift) ·
[Flutter](https://github.com/Octopus-Community/octopus-sdk-flutter) ·
[Unity](https://github.com/Octopus-Community/octopus-sdk-unity)

## License

Use of this SDK is governed by the [Octopus Community Mobile SDK License Agreement](LICENSE.md).
