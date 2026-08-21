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
| `OCTOPUS_COMMUNITY_API_KEY` | Yes | Your Octopus community API key (used for SDK initialization). |
| `OCTOPUS_SSO_USER_ID` | For "Connect user" | SSO user ID used when you tap **Connect user** in the Setup tab. |
| `OCTOPUS_SSO_USER_TOKEN` | For "Connect user" | JWT token for that user (used by the token provider and for connecting). |
| `OCTOPUS_DEMO_POST_ID` | For the "reactions" scenario | Id of an existing post in your community, used by the Scenarios tab's reaction presets. |

Without `OCTOPUS_COMMUNITY_API_KEY`, the app will log an error and skip initialization. Without the SSO variables, the **Connect user** action in the example will not work correctly.

## What the example demonstrates

The app has six tabs:

- **Setup** — Initialize SDK (API key, connection mode), connect/disconnect user, display mode (fullscreen vs embedded), locale override, URL interception toggle.
- **Theme** — Configure theme (system/light/dark, color set, fonts, logo, bottom inset); changes apply when you reopen the UI.
- **SDK Data** — Notifications count (refresh and listener), community access (override, track, listener), custom events, and SDK event log.
- **Groups** — Sync followed groups in batches (manual group id entry).
- **Scenarios** — Single-tap QA presets for connection, community access, not-seen notifications, push notifications, custom events, locale, theme, and sync followed groups, each carrying a fixed `testID` for automated QA.
- **Community** — Open the Octopus UI in fullscreen or embedded mode with the current theme and options.

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
