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
| `OCTOPUS_DEMO_POST_ID` | No | Override the shared text post for initial-screen and notification presets, and the reaction target. Blank uses the built-in defaults. |
| `OCTOPUS_QA_REACTION_POST_ID` | No | Override only the reaction target; takes precedence over `OCTOPUS_DEMO_POST_ID`. |
| `OCTOPUS_QA_COMMENT_ID` / `OCTOPUS_QA_USER_ID` / `OCTOPUS_QA_TOPIC_ID` | No | Override the default comment, other member profile, or default group id. |
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

## Demo content ids

`src/config/sampleFixtures.ts` holds default ids of posts, a comment, a member and a group
in the demo community the sample targets, so the presets below have a target without extra
setup. Demo content can expire: if an id no longer resolves, override it (see below). The API
key still comes from the existing configuration.

After initialization, **Scenarios → Initial screen → Demo post → Run** opens
`post.text` by id. The embedded Post preview uses the same target.
**Push notifications → Run** replays a synthetic notification for that post through
`getOctopusNotification` and `openNotification`; it does not require a push service.
Reactions use the distinct `post.reactionStack` fixture. Group presets and the
editable group form use `topic.default`. Community-data lookup starts at `user.other`
and later reuses the latest successful lookup; the activity preset opens the other
member's posts directly. Host `clientUserId` presets still use the configured SSO user.

Non-blank `.env` overrides take precedence. Restart Metro with `yarn example start:reset` after editing them:
development needs no native rebuild, but a release needs a new JS bundle.
Retarget the ids as well as the API key when using another community.

`post.image`, `post.poll`, `post.cta`, `comment.reported`, `topic.gated` and
`deeplink.post` have no default and remain `null`. `comment.onPost` has a default, but this
sample has no comment-detail preset. It also has no external `octopus-sample://post`
URL handler on either platform; the in-app post and push presets do not claim to
verify that missing external route. Create-post presets let the SDK choose the
posting group (the bridge has no prefilled topic parameter).

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

### Optional design and feedback links

`OCTOPUS_DESIGN_REFERENCE_URL` in `.env` supplies the HTTPS target for
Settings → About → Design reference. An empty or invalid value hides the row.

Feedback is opt-in for internal bundles: set `OCTOPUS_INTERNAL=true` and
`OCTOPUS_FEEDBACK_REPO=owner/repository-private` in `.env`, then start Metro from `example/` with
`OCTOPUS_INTERNAL_FEEDBACK=true node node_modules/react-native/cli.js start --reset-cache`.
For a bundled internal build, set the same environment variable on the bundle/build
command. Verify that the configured destination is a **private** GitHub repository;
the app validates its shape but cannot inspect repository visibility without credentials.
The destination must have the `react-native` and `spotted` labels provisioned.

The confirmation sheet opens a pre-filled issue in the browser; it never submits it.
It includes platform/OS, wrapper version, native pins read at bundle time, environment
label, last content screen/scenario and up to 50 log entries. Log payloads and unknown
labels are omitted entirely, so arbitrary SDK data never enters the report. Screenshots
are not captured automatically; the reporter can add one in GitHub. No new native
dependency is required. The optional implementation lives under `debug/internal/` in
`*.local.*` files, already excluded by the public mirror. Without the explicit bootstrap
flag or those files, the bundle contains no import of it and Settings hides Send feedback.

The language and custom-event scenarios provide Customize and Reset to preset.
Preset buttons restore **every** input and execute that exact preset in one tap;
editing alone never calls the SDK. A result whose inputs have since changed is marked
stale. The custom-event editor retains the RN sample's existing preset values and accepts
a JSON object of string properties. Unsupported language codes follow the native SDK's
fallback behavior.
