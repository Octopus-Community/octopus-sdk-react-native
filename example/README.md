This is the **Octopus Community React Native SDK** example app. It demonstrates initialization, SSO, theming, display modes (fullscreen and embedded), and all reactive and analytics APIs.

# Getting started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Environment variables

The example app reads configuration from a `.env` file. Copy the template and fill in your values:

```sh
cp .env.dist .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `OCTOPUS_COMMUNITY_API_KEY` | Yes | Your Octopus community API key. Offered as **Demo** on the Config screen. |
| `OCTOPUS_NAMED_API_KEYS` | No | Several labelled key sets to choose between, as `id~label~key` entries joined by `;`. When set, the Config screen lists them instead of the single Demo entry. |
| `OCTOPUS_SSO_USER_ID` | No | Default user id (the JWT `sub`) prefilled on the Config screen; falls back to `react-native-sample-user`. |
| `OCTOPUS_SSO_USER_TOKEN` | For **Connect** | Pre-baked JWT for that user with no entitlements — Connection preset 1, and the **Connect user** button in Settings. |
| `OCTOPUS_SSO_USER_TOKEN_PREMIUM` | For preset 2 | Same user, Premium entitlement. |
| `OCTOPUS_SSO_USER_TOKEN_MODERATOR` | For preset 3 | Same user, Moderator entitlement. |
| `OCTOPUS_SSO_USER_TOKEN_PREMIUM_MODERATOR` | For preset 4 | Same user, both entitlements. |
| `OCTOPUS_DEMO_POST_ID` | For the "reactions" scenario | Id of an existing post in your community, used by the reaction presets. |
| `OCTOPUS_API_HOST` | No | The backend this build talks to, passed to `initialize()` as `apiServer`. Left unset, it resolves to the **demo** backend; only naming `api.8pus.io` reaches production — see below. |
| `OCTOPUS_INTERNAL` | No | `true` marks this build as an Octopus-internal one. Changes nothing the SDK does; it only re-enables the production banner — see below. |

The app never signs a token itself: each entitlement variant is a JWT the build injects, and a
preset with no token stays disabled and names the variable that is missing.

An empty `.env` still launches the app: it opens on the Config screen, which says what is missing.
**Start** is the one thing it gates — with no key resolvable, neither injected nor pasted, the
button stays disabled. That refusal is deliberate: `initialize()` accepts an empty key (the Android
bridge only rejects `null`, and neither native SDK validates the value), so a keyless start would
report *Initialized* while every call to the backend failed. A key pasted on that screen is kept
for that session only — never written to device storage — so it is re-entered on the next launch.

> ### Production warning
>
> `OCTOPUS_API_HOST` really does reroute the SDK: the value is passed to `initialize()` as
> `apiServer`, which both native SDKs honour on their published artifacts — no native pin swap
> needed. Left unset it resolves to the **demo** backend, so an unconfigured checkout cannot write
> test content into real communities. Reaching production takes naming it: `api.8pus.io`. There,
> connecting, following and posting hit real communities.
>
> A red banner says so on every screen the sample renders — including its Debug and
> embedded-WebView modals, but not inside the SDK's own fullscreen UI, which is native — **when,
> and only when, the build also sets `OCTOPUS_INTERNAL=true`**. The banner is an internal safety
> net, not a product feature: pointing this sample at production with your own key is the nominal
> integration case, and it has no reason to shout an Octopus host at you. Nothing sets the marker
> for you — an Octopus developer sets it once in their own `.env`. The Android and Flutter samples
> gate their banner on the same marker.

## What the example demonstrates

The app opens on a **Config** screen — pick an API key, an auth mode, a user id and a theme, then
**Start** — and then shows four tabs:

The auth mode decides who owns the login: **SSO** connects the app's own user with an injected JWT
(`connectionMode: { type: 'sso' }`), **Octopus** lets the SDK run its own login flow
(`{ type: 'octopus' }`). In Octopus mode there is no host user, so the Connection presets and the
`clientUserId` lookups are disabled and say why.

- **Home** — Read-only dashboard: SDK status, which API key and server are in use, connection state, unseen-notification count, community access.
- **Scenarios** — The searchable index of capabilities. Each scenario opens its own page with single-tap QA presets carrying fixed `testID`s, its result panel, and the free-form controls for that capability: theming lives in the Theme scenario, batch group sync in Sync Followed Groups, the free-text custom event in Custom Events, the push token in Push Notifications.
- **Settings** — Connect/disconnect, display mode (fullscreen vs embedded), URL interception, profile-tap handling, locale override, **Back to Config** (disconnects, tears the SDK state down and returns to the Config screen), and the **Debug console**.
- **Community** — Open the Octopus UI in fullscreen or embedded mode with the current theme and options.

The **Debug console** (Settings → *Open debug console*) is one merged, newest-first log of the SDK
event stream and of every API call the app fired, copyable as plain text — it replaces the old SDK
event-log card. Rows are stamped in local time so they line up with what the operator just saw; the
clipboard export uses ISO-8601 UTC.

For full SDK documentation, see the [main README](../README.md) and [API reference](../docs/api/README.md).

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler from the **example** directory to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run (from the **example** directory).

```sh
yarn ios:pod
```

Or manually from the `ios` folder:

```sh
cd ios && bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.


# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.
