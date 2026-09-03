# @octopus-community/react-native

## 1.13.1

### Patch Changes

- 9325d66: Android: fix the unread-notification highlight (and every other palette slot the host did not
  set) coming out near-black on a light community when the device is in dark mode. The wrapper
  picked its light/dark base palette from the system setting alone, so a host passing a light
  `theme.colors.background` on a dark-mode device got the dark palette's `primaryLow` (`#303030`)
  behind unread notifications and gray text tuned for a dark surface, painted over its light
  background. The base palette now follows the host background's luminance when one is given —
  the same rule the native Android SDK applies since 1.12.1 to hosts that pass no palette, which
  this wrapper bypasses by always passing an explicit one. Hosts that set no `background` are
  unaffected; a dual-mode theme (`colors.light` / `colors.dark`) whose background agrees with the
  mode it is declared for is unaffected too. An explicit `primaryLowContrast` still wins.
- f2a0630: Android: fix `setThemeMode()` and system appearance changes leaving a dual-mode theme on the
  set picked at `initialize()`. The wrapper selected the `theme.colors.light` / `dark` set once,
  for the scheme known at init, and a later mode change only moved the base palette — so a host
  in dark mode kept its light `primaryLowContrast` behind unread notifications (#215). Both sets
  are now kept and the matching one is re-selected at render time for the mode in effect; the
  selection also applies live to an Octopus screen already open, and a `setThemeMode()` with no
  `theme` at all now forces the base palette instead of being dropped.
- 9325d66: Android: the wrapper's standalone `compileSdk`/`targetSdk` fallback (used only when the host app sets no `rootProject.ext.compileSdkVersion`) is now 36, with the matching AGP 8.11.0. Consumers overriding these through `rootProject.ext` are unaffected.
- 9325d66: Add a source-level test harness pinning the iOS bottom-inset invariants introduced with the
  embedded bottom-inset normalization; no runtime change. The new files live under
  `src/__tests__`, which npm's `files` allowlist excludes from the published package, but the
  public mirror's `sync-public.yml` allowlists `src` recursively with no `__tests__` exclude, so
  they do reach `octopus-sdk-react-native` on the next sync.
- 9325d66: Add `debugGetCommunityConfig`, a debug-only read of the community config the backend
  currently serves (GetConfig), on both platforms. It resolves the effective flags the SDK UI
  consumes — `exposeClientUserId`, `forceLoginOnStrongActions`, `displayAccountAge`,
  `termsAcceptanceMode` — or `null` while no config has been fetched yet. Not part of the
  stable public API surface and not for use in production apps — it exists so a test app can
  show the live server state next to the API key it runs on. The example app gains a matching
  "Server state (debug)" card on the Home tab displaying the effective API key and these
  values, with a Refresh button.
- 9325d66: Add `debugOverrideExposeClientUserId`, a debug-only binding over the native SDKs' internal
  test override for the `exposeClientUserId` community flag (Unified Profile activation), on
  both platforms. Pass a boolean to force the flag locally, or `null` to restore the
  backend-provided config. Not part of the stable public API surface and not for use in
  production apps — it exists so Unified Profile profile-tap routing can be exercised before
  the backend serves the flag. The example app gains a matching "Force exposeClientUserId"
  toggle in the Config screen's Host callbacks section.
- 9325d66: Add an `onBackRequested` callback prop to `OctopusUIView`, fired when the embedded top app
  bar's leading icon (back arrow or close) is tapped on the SDK's root screen — where the
  SDK's internal navigation has nothing left to pop. This closes the previously documented
  "inert tap" gap on `showBackButton` and `navBarLeadingAction`: hosts can now dismiss their
  own container (pop a route, close a modal) from the embedded view, the RN analog of the
  Flutter `OctopusHomeScreen` widget's `onBack` callback. On the SDK's sub-screens the icon
  still pops the SDK's internal stack itself; hosts that pass no callback keep the previous
  behaviour unchanged.
- 9325d66: Add an "Embedded Back Button" scenario to the example app, the QA surface for the embedded
  view's `showBackButton` / `navBarLeadingAction` / `onBackRequested` trio — until now no
  screen of the sample mounted any of the three, so the root-screen back tap had no route to
  exercise it on a device. Run opens a host route holding an embedded `OctopusUIView`, and the
  callback pops that route back to the scenario, which is the effect a host is expected to
  implement. No runtime change to the package itself; the example is on the public mirror's
  allowlist, so it reaches `octopus-sdk-react-native` on the next sync.
- 9325d66: iOS embedded view: when the host passes no `ui.bottomSafeAreaInset` at all, apply the
  same additive 10 pt bottom padding the Flutter bridge has always applied in that state,
  instead of forwarding 0 — which left the native `> 0` inset gate off and glued the
  profile bubble and create-post button to the very bottom of `<OctopusUIView>`. An
  explicit `0` still means "reserve nothing" (edge-to-edge opt-out), and explicit positive
  values keep the existing live total→additive normalization.
- 9325d66: Fix all native→JS events being silently dropped on iOS under the New Architecture
  (bridgeless, the React Native default since 0.74). `sendEvent` gated emission on
  `bridge.isValid`, but a legacy `RCTBridgeModule` is handed an `RCTBridgeProxy` there,
  whose `valid` returns `NO` by design for the whole lifetime of the app — so
  `navigateToProfile` (Unified Profile routing) and every state stream
  (`isInitialisedChanged`, `connectionStateChanged`, `profileChanged`,
  `notSeenNotificationsCountChanged`, …) never reached JS. Regressed in 1.13.0.
- 9325d66: Add a golden round-trip test pinning the `sdkEvent` wire contract: every member of the
  `SDKEvent` union and every `ScreenType` gets a fully-populated golden, an exhaustive inverse
  that TypeScript refuses to let drift, and a source-level anchor asserting the golden key sets
  against the tags the Android and iOS event serializers actually emit. No runtime change. The
  new file lives under `src/__tests__`, which npm's `files` allowlist excludes from the
  published package, but the public mirror's `sync-public.yml` allowlists `src` recursively with
  no `__tests__` exclude, so it does reach `octopus-sdk-react-native` on the next sync.
- f2a0630: iOS: `setThemeMode('light' | 'dark')` now has a visible effect. The forced scheme is applied
  as an interface-style override on the SDK's own screens — fullscreen and embedded, live — so
  the theme's adaptive colors resolve against it while the host app's appearance stays untouched;
  `setThemeMode('system')` hands control back to the trait collection.
- 9325d66: Internal test-configuration change only — no runtime behaviour, and no public API, changes.
  The repository's Jest and ESLint scans now skip the `.claude/` directory, so local agent
  worktrees no longer contribute duplicated suites and file-name collisions to the test run.
- 9325d66: Add a data-driven Lifecycle scenario to the example app, exercising `switchCommunity` at
  runtime. The target communities are the key sets the build injects through
  `OCTOPUS_NAMED_API_KEYS`, so the scenario enumerates none of them itself: a key added to
  the build's table becomes a preset with no edit to the sample, and a build that offers
  nothing to switch to — no named key set, or only the one already in force — falls back to a
  free-text field to paste a key into. A switch clears the session
  state that belonged to the community being left, remounts every embedded `OctopusUIView`
  (which the SDK requires after a switch), and is folded back into the sample's own
  configuration so the Home dashboard and the Settings summary keep naming the community the
  SDK is actually on. Package API unchanged.

## 1.13.0

### Minor Changes

- 0cafe33: Add `useBridgeShareTokenProvider` / `addBridgeShareTokenRequestListener`, so a host can sign
  the posts it prefills through `navigateToOctopusCreatePost`.

  A community can be configured to forbid member pictures. In that configuration the server
  refuses an image posted by a member — including one the host prefilled, which defeats Bridge
  and share-to-community flows. The native SDKs let the host authorize such a share: at publish
  time they compute a SHA-256 fingerprint of the final content (text + CTA + image) and ask for a
  JWT signed over it, with the same shared secret as SSO tokens. This release bridges that hook
  to JS, following the shape `useUserTokenProvider` already established — the host answers a
  request on demand, asynchronously.

  ```ts
  useBridgeShareTokenProvider(async (bridgeFingerprint) => {
    const response = await fetch(
      'https://your-backend.example/octopus/bridge-share-token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bridgeFingerprint }),
      }
    );
    const { token } = await response.json();
    return token;
  });
  ```

  Sign on your backend. The signing secret must never be shipped in the app bundle.

  Nothing changes for hosts that do not register a provider: the native signing hook is only
  wired when one is, so prefilled shares keep being published unsigned. Registration is
  announced to the native side explicitly rather than inferred from the event subscription —
  `NativeEventEmitter` cannot report whether a listener for one specific event name is still
  live.

  Returning `null` (or throwing) declines the signature, and the two platforms then differ
  because their native APIs do: Android publishes the post unsigned and lets the server refuse
  it, while iOS has no unsigned channel on its signing closure and fails the publish
  client-side. The same divergence exists in the Flutter SDK; it lives in the native APIs, not
  in the bridges. On both platforms a request left unanswered for 60 s stops waiting and is
  treated as declined.

- deeb0e4: Bump the wrapped native Octopus SDK from 1.11.0 to 1.13.2 on both platforms
  (`android/gradle.properties` → `OctopusReactNativeSdk_octopusCommunityVersion`,
  and the single `octopus_version` local that drives all six `OctopusCommunity*`
  pods in `OctopusReactNativeSdk.podspec`). A native minor bump forces a package
  minor bump even when the wrapper's own surface barely moves: the package number
  is a claim about which native feature set is inside it.

  Most of the 1.12/1.13 native work is inherited with no wrapper change: **24 SDK
  languages** (15 new, including Arabic with RTL), **large-screen content width**
  (content capped and centered on tablets instead of stretching edge to edge), a
  **"View group" entry in the post menu**, explicit terms acceptance driven by the
  community configuration, per-field profile lock, per-content-type media and poll
  gating, and design-system polish. Android 1.13.x additionally fixes **in-app
  browser theming** (a link the SDK opens no longer mixes a toolbar from one color
  scheme with content from the other, and a translucent color slot is dropped
  instead of rendering as a see-through toolbar), **text legibility on hosts that
  darken `background` without redefining its content colors** — most visibly the
  profile overflow menu, whose labels were invisible — and dropdown menus
  rendering transparent. iOS 1.13.x brings Xcode 27 compatibility, the community
  background color applied on every native screen, and a fix for a banned user
  being logged out under a non-English locale.

  **Breaking — `'settingsAbout'` removed from `ScreenType`.** The native SDKs
  removed the "About the community" screen in 1.13.0 (its three legal links were
  already duplicated in the Activity and Profile overflow menus), so neither
  platform emits that screen-displayed event anymore and the bridge can no longer
  produce it. This only breaks code that names the literal — a lookup table keyed
  by `ScreenType`, or a `switch` the compiler checks for exhaustiveness. Delete
  the `'settingsAbout'` branch; nothing replaces it. There is no runtime change to
  handle: the event stopped being emitted when the native screen was removed.

  **Breaking — `'unknown'` added to `ScreenType`.** Both event serializers have
  always been able to emit `{"type": "unknown"}` for a native screen the wrapper
  does not model yet, but the union did not contain the literal — so an exhaustive
  `switch` type-checked and then fell through at runtime. Adding it breaks the same
  code the `'settingsAbout'` removal breaks (`Record<ScreenType, …>`, checked
  `switch`), so it ships in the same release rather than costing hosts a second
  migration. Treat it as a permanent forward-compatibility branch;
  `ReactionKind` already works this way.

  **`'settingsList'` becomes Android-only.** Native iOS 1.13 deleted its
  settings-list screen, and although the `settingsList` case remains in the native
  iOS event enum (so nothing in the bridge fails to compile), no iOS emission site
  survives. Android still emits it. A host that upgrades will see
  `{"type": "settingsList"}` keep arriving on Android and silently stop arriving on
  iOS — no wrapper-side change is possible, but it will show up as an iOS
  screen-view count dropping to zero.

  The two Unified Profile screen events added natively in 1.13 (`Activity`, and a
  member's posts list) are serialized as `'unknown'`, the same deferral the bridge
  already applies to `mainFeed`, `groups` and `groupDetail`. The wrapper exposes no
  Unified Profile surface yet, so typed support belongs with that work.

- 838b27d: Bridge the client-object APIs to JS: fetch-or-create a post for one of your objects, observe it
  reactively, and route the "view object" button back into your own navigation.

  This is the **Bridge** feature — the one that links community discussion to your app's own
  content (an article, a product, a recipe, an event). The native SDKs and the Flutter plugin have
  had it for a while; React Native had the pieces but no entry point. Four additions:
  - `fetchOrCreateClientObjectRelatedPost(clientPost)` returns the Octopus post linked to
    `clientPost.objectId`, creating it from the supplied content if none exists yet. When a post
    already exists it is returned as-is and the content you pass is ignored. Use the returned
    `id` to open the post in the embedded UI.
  - `addClientObjectRelatedPostListener(clientObjectId, callback)` observes that post reactively —
    the current value first, then every change (new reactions, comment count, and the creation
    itself). Each call drives **its own** native observation, so two places can watch the same
    object independently; `remove()` on the returned subscription tears down both the JS listener
    and the native observation.
  - `setNavigateToClientObjectCallback(callback)` receives the `objectId` when a member taps the
    "view object" button on such a post. The SDK never navigates for you. It returns an
    identity-guarded unregister handle — `return setNavigateToClientObjectCallback(...)` straight
    out of a `useEffect` — so a late cleanup cannot wipe a newer registration.
  - `formatOctopusCompactCount(count, { locale })` renders a count the way the embedded feed does
    (`1.2K`, `9.9M`, `1,5B` in a comma-decimal locale) — a pure helper, no native call, so counts
    read from `OctopusPost` match what the UI next to them shows.

  New public types: `ClientPost`, `OctopusClientPostAttachment` (`OctopusLocalImageAttachment` /
  `OctopusRemoteImageAttachment`), `OctopusPost`, `OctopusReactionCount`, `ClientPostErrorCode`,
  `ClientPostError`, `isClientPostError`, `NavigateToClientObjectCallback`,
  `ClientObjectRelatedPostSubscription`, `ClientObjectRelatedPostListenerCallback`,
  `FormatOctopusCompactCountOptions`.

  Four things worth knowing before you integrate:
  - **The bridge signature reuses the existing global provider.** Where Flutter takes a
    `tokenProvider` argument per call, this SDK reads the one already registered through
    `useBridgeShareTokenProvider` / `addBridgeShareTokenRequestListener`. That hook shipped
    without a consumer; this release gives it one. Register a provider only if your community
    requires bridge signatures — without one, posts are created unsigned exactly as before, and
    for _this_ API declining a signature is expressible on both platforms (unlike the prefilled
    share, where iOS has no unsigned channel).
  - **A local attachment is a URI, not bytes.** `{ type: 'localImage', uri }` takes what an image
    picker or a bundled asset gives you and both native sides resolve it; Flutter's equivalent
    carries a `Uint8List`, which the React Native bridge cannot marshal cheaply. Only `file:`
    URIs and bundled names are accepted — a web image belongs in `{ type: 'remoteImage', url }`.
    An attachment the bridge cannot resolve rejects the call with `INVALID_ARGS` and **no post is
    created**: this post is written once and never rewritten, so a silently dropped image would
    be permanent.
  - **Error codes are not symmetric.** Android produces the full set (16 content codes on top of
    the connection-level ones); iOS keeps its validation detail internal and reports
    `CLIENT_POST_ERROR` with the native description. `ClientPostErrorCode` documents which
    platform emits which — write the `catch` against `CLIENT_POST_ERROR` and treat the
    fine-grained codes as extra information you get on Android.
  - **Register the navigation callback at app start.** On Android the button's visibility is read
    when the Octopus UI is composed, so a late registration leaves it hidden until the UI is
    reopened; on iOS the native setter is not optional, so unregistering silences your callback
    but leaves the button on screen in a UI that is already running.

  A community switch does not migrate an open post observation: cancel the subscription and
  re-subscribe afterwards, as on the other platforms.

- c22fd52: Forward the native `groupFollowingChanged` SDK event to JS. Both event serializers
  (`OctopusEventSerializer` on Android and iOS) fell through to their catch-all branch for
  this event and silently returned `nil`/`null`, so a consumer subscribing to `sdkEvent`
  could never observe a group follow/unfollow. The new `GroupFollowingChangedEvent`
  (`type: 'groupFollowingChanged'`, `groupId: string`, `followed: boolean`) is now part of
  the `SDKEvent` union.
- 1ae09d1: Add the lifecycle/init parity APIs: `apiServer` and `deepLink` on `initialize`, `switchCommunity`, `reset`, `stop`, and a synchronous `isInitialised()` getter.

  **Behaviour change (Android):** a fix to `parseConnectionMode` is bundled in this release. Before it, an Android host passing `connectionMode: { type: 'octopus' }` was silently placed in `ConnectionMode.SSO(appManagedFields = emptySet())` instead of Octopus-managed auth — those hosts were receiving `loginRequired` callbacks and never got the magic-link flow. After this fix, `loginRequired` will **never fire again** on Android for hosts using `{ type: 'octopus' }`, and the Octopus-managed magic-link flow runs instead. This is a fix, not an intentional API change — the documented contract was always Octopus-managed auth for that mode — but it is a real runtime behaviour change for any integration that had adapted to the broken state, so it ships as its own bullet rather than buried below.
  - `initialize({ apiServer })` targets a custom backend endpoint (`{ host, port? }`), mirroring the native SDKs' `ApiServer`/`Configuration` type.
  - `initialize({ connectionMode: { type: 'octopus', deepLink } })` forwards a deep link the backend can hand back after an Octopus-managed auth flow, matching iOS's `ConnectionMode.octopus(deepLink:)`. On Android this is plumbed through `deepLinksBasePaths`, since `ConnectionMode` has no such field there. **The value itself is not passed through unchanged on Android**: the backend receives `<deepLink>/<magic-link-confirmation-sub-path>`, not `<deepLink>` as given — register the platform-correct URL in your manifest/`Info.plist`.
  - `switchCommunity({ apiKey, connectionMode, apiServer? })` re-targets the SDK at a different community without restarting the app. Unlike the Flutter SDK's separate `switchCommunity`/`switchCommunityOctopusAuth`, this ports as a single function reusing `initialize`'s `connectionMode` union — after it resolves, remount `<OctopusUIView>` by changing its `key` prop, since the underlying native views are tied to the old community. On Android, this now also (re-)starts the SDK's reactive-event bridging, so a `switchCommunity` call with no prior `initialize()` still delivers notification-count/community-access/SDK events.
  - `reset()` and `stop()` are thin passthroughs to the native SDKs. iOS has no native equivalent of either; the bridge approximates both with `disconnectUser()` (`reset`) and a full teardown of the bridge's SDK instance and observers (`stop`), awaiting the disconnect before resolving so both calls only complete once the underlying work has actually finished. iOS's local Core Data caches are not cleared by `reset()` — only Android's local cache is (the caches themselves do exist on both platforms).
  - `isInitialised()` is a synchronous, client-side flag (flipped after `initialize`/`switchCommunity` resolve, and after `stop` resolves) — it does not call across the bridge. The reactive `isInitialised` event/flow is a separate parity effort and is not part of this change.

- b471ca4: Add `initialScreen` to `openUI`: open the Octopus UI directly on a specific screen — the main feed, a post or a group (bridge mode), one member's posts (`activity`) or profile (`profile`, or the connected user's own editable profile with no id), or the post editor (`createPost`, optionally prefilled). Mirrors the iOS `OctopusInitialScreen` enum and the Flutter API of the same name. A `notification` passed alongside always wins: the deep link is followed and the initial screen is dropped with a warning.
- ec7f3e7: Add groups and entitlements APIs, closing a parity gap with the Flutter and Android SDKs.

  New public API:
  - `fetchGroups()` returns the full list of `OctopusGroup` (`id`, `name`, `isFollowed`,
    `canChangeFollowStatus`, `canAccess`, `canCreateChildren`).
  - `followGroup(groupId)` / `unfollowGroup(groupId)` reject with a `GroupFollowUnfollowError`
    (`GroupFollowUnfollowErrorCode` + `isGroupFollowUnfollowError`) instead of resolving on a
    refused change. `LAST_FOLLOWED_GROUP` is Android-only: the native SDK there refuses to
    unfollow a user's last remaining group, a rule iOS does not enforce.
  - `setGroupAccessDeniedCallback(callback)` registers a single last-write-wins callback invoked
    whenever the native SDK denies access to a group's content — replacing any callback set
    before it, not stacking a second native listener. It returns an identity-guarded unregister
    handle (`() => void`), matching Flutter's own `VoidCallback` return.
  - `refreshEntitlements()` rejects with a `RefreshEntitlementsError`
    (`RefreshEntitlementsErrorCode` + `isRefreshEntitlementsError`, 5 cases). It only makes sense
    in `.sso` connection mode; `NO_CLIENT_TOKEN_PROVIDER` is the guard for calling it otherwise.
  - `overrideCommunityAccess` keeps its existing `Promise<void>` signature (no breaking change),
    but now has a typed rejection alongside it: `OverrideCommunityAccessError` and
    `isOverrideCommunityAccessError`.

  On iOS, `followGroup`/`unfollowGroup` bridge onto the native `syncFollowGroups(actions:)` call
  with a single action, mirroring how the Flutter iOS plugin exposes the same two methods on top
  of the same native API — iOS has no native per-group follow/unfollow call of its own.

- c522678: Port navigation & theme APIs from the Flutter SDK (issue #36, partially — see the PR's Port inventory):
  - `openUI({ navigationMode })` / `<OctopusUIView navigationMode>`: choose between the legacy `NavigationView` (`'automatic'`) and the modern `NavigationStack` (`'navigationStack'`, the default on both entry points) the native iOS SDK hosts its screens in — the legacy container has a bug where a push made while modally presented or reparented can be silently dropped, which is exactly the hosting shape both RN entry points use, so both default away from it. iOS only; accepted on Android for API parity but ignored (no-op), since the Compose `NavHost` it always uses is unaffected.
  - `openUI({ navBarLeadingAction })` / `<OctopusUIView navBarLeadingAction>`: override the top app bar's leading icon with `'close'` or `'back'`, regardless of the platform default. Supported on both platforms (native Android SDK 1.12.1+, native iOS SDK 1.12.2+). On `openUI()` tapping it closes the UI, exactly like the default icon. On the embedded `<OctopusUIView>` tapping it is currently inert — a known gap, see the type's TSDoc.
  - `<OctopusUIView>`: new per-view top app bar props — `showBackButton`, `showNavBar`, `navBarTitle`, `navBarPrimaryColor`, `titleCentered` — overriding, for that view only, what was previously only configurable globally via `initialize({ topAppBar })`. `showNavBar: false` is Android-only for now — the native iOS SDK has no way to hide its top app bar yet (matching Flutter's own gap there), so the prop is accepted on iOS for API parity but has no visible effect.
  - `setThemeMode('light' | 'dark' | 'system')`: forces the Octopus UI's color scheme independently of the device's system appearance, or releases the force back to following it. Supported on Android — takes effect the next time the Octopus UI mounts or recreates its view, not on an already-mounted one; a no-op if no theme was ever configured. Accepted on iOS for API parity but has no visible effect yet (the native iOS SDK has no public entry point to force a scheme independently of its own adaptive colors). A standalone setter rather than a field of the theme object, unlike Flutter — see the PR's Port inventory for the divergence and its rationale.

- a3d888d: Add reactive state channels for the profile, the followed groups, the connection state and the
  SDK's initialisation, closing the gap with the Flutter wrapper's streams.

  Until now the bridge emitted only _notifications_ — nine one-shot events, none of them carrying
  state — so a host could not observe the SDK's current state at all. It had to poll, or rebuild it
  from unrelated events. Five channels are added, each exposing the same pair: a listener returning
  a subscription with a `remove()` method — the same contract as every other `addXxxListener` in this
  package — and a getter for the value known right now.

  ```ts
  import {
    addProfileListener,
    addGroupsListener,
    addConnectionStateListener,
    addIsUserConnectedListener,
    addIsInitialisedListener,
    getProfile,
    getGroups,
    getConnectionState,
    isUserConnected,
    isInitialised,
  } from '@octopus-community/react-native';

  const subscription = addConnectionStateListener((state) => {
    setBadgeVisible(state.connected && !state.isGuest);
  });
  // …later
  subscription.remove();
  ```

  **The last value is replayed to every new subscriber**, as the Flutter streams do: a listener
  added after the native side published gets that value synchronously, before `addXxxListener`
  returns, so there is no window in which the host renders from a state it never received. Two
  consecutive identical values are collapsed into one call — Android's flows and iOS's `@Published`
  properties do not agree on how often they re-emit an unchanged value, and the host should not have
  to care.

  `getProfile()` returns `null` until a profile is known, `getGroups()` an empty array,
  `getConnectionState()` `{ connected: false }` and `isInitialised()` `false` — the same starting
  points the native SDKs use. `isInitialised()` flips to `true` the moment `initialize()` resolves,
  without waiting for a native round-trip, so a host that subscribes after initialization is never
  called back with a stale `false` first. The listener covers every lifecycle transition the same
  way: `stop()` publishes `false` and `switchCommunity()` publishes `true` as they resolve, exactly
  as the Flutter `isInitialisedFlow` reports them.

  `OctopusGroup` (`id`, `name`, `isFollowed`, `canChangeFollowStatus`, `canAccess`,
  `canCreateChildren`) and `OctopusProfile` (`entitlements`, `clientUserId`) are the wrapper-level
  models, identical to the Flutter ones: the narrow projection the wrappers expose, not the richer
  native types. `OctopusConnectionState` is a discriminated union on `connected`, so a TypeScript
  host that has narrowed on `state.connected === true` reads `state.isGuest` without a cast.

  iOS has no native connection state and no native initialisation flag; both are derived exactly as
  the Flutter iOS plugin derives them — from the published profile and its `isGuest` flag, and from
  the SDK instance existing.

  The channels start tracking from `initialize()` — as the Flutter wrapper does — and ask the native
  side once to re-emit what it currently holds. That request is the bridge's equivalent of the
  Flutter `EventChannel` `onListen` snapshot: `NativeEventEmitter` gives the native module no honest
  signal that a listener for one event name is live, so the JS side asks explicitly instead of the
  native side guessing. A getter or listener touched before `initialize()` attaches its channel on
  the spot.

- 43bc9b9: Report a refused `connectUser` to JS instead of resolving as if it had succeeded.

  Both bridges discarded the native outcome: Android dropped the
  `OctopusResult` the native SDK returns, and iOS called the fire-and-forget
  `connectUser` overload, which only logs a failure natively. A banned user, a
  JWT the backend rejects, or a missing token therefore resolved the promise —
  the host app believed the user was connected while the SDK kept them
  anonymous, which shows up as a login screen that appears to do nothing.

  `connectUser` now rejects with an error carrying a stable `code`. New public
  API: the `ConnectUserErrorCode` union, the `ConnectUserError` interface, and
  the `isConnectUserError` type guard. `USER_BANNED` carries the backend's own
  message and is meant to be displayed; the other codes are diagnostics. Codes
  are not symmetric across platforms — the reference lists which platform emits
  which, so keep a default branch.

  Three behaviour notes for existing integrations:
  - A rejection now needs handling. An unhandled one surfaces as an unhandled
    promise rejection where the call previously stayed silent.
  - On iOS the promise now settles on the connection outcome rather than on the
    call being accepted, so it waits for the `userTokenRequest` round-trip and a
    token provider must already be registered when it is called. Android already
    waited for that outcome; only the discarded result changes there.
  - An unanswered `userTokenRequest` no longer leaves the promise pending: both
    platforms bound the wait at 60 s and reject with `TOKEN_REQUEST_TIMEOUT`.

  The rejection covers the initial attempt only; a token provider that fails
  later on a refresh has no promise to reject. And on iOS a failing token
  request is not guaranteed to reject: when nothing is connected yet, the native
  SDK falls back to an anonymous connection and reports success, so a resolved
  promise means the SDK is usable rather than the user being authenticated.

- af0feaf: Expose a theme-wide custom font family and font weight.

  `theme.fonts` gains two optional keys, forwarded to the native theme on both
  platforms and applied to every text style, navigation-bar items included:
  - `fontFamily`: an arbitrary font family name. It is **not** resolved from the
    JavaScript bundle — the SDK's screens are native (Compose on Android, SwiftUI on
    iOS), so the font must be registered with the host app, which is what linking it
    with `react-native-asset` does: an Android `res/font/` resource name
    (`res/font/my_brand_font.ttf` → `'my_brand_font'`), or the exact iOS PostScript
    name of a font declared under `UIAppFonts`. When the name does not resolve, both
    bridges log a warning and keep the SDK's own font instead of failing silently.
  - `fontWeight`: a whole number on the 100-900 CSS scale. It needs no native
    registration and applies on top of whichever family is in effect. Out-of-range
    and non-integer values are dropped with a warning at `initialize`; iOS buckets
    the value to the nearest of SwiftUI's nine named weights, which have no
    arbitrary-integer initializer.

  `fontFamily` **takes precedence over the per-style `fontType`**, and the two are
  documented as one mechanism rather than two: `fontType` picks one of three _system_
  designs for a single style, `fontFamily` names an arbitrary registered family for
  the whole theme, so the family is the more specific request and wins everywhere.
  When it does not resolve natively, each style falls back to its `fontType` — which
  is why the bridges still receive both. Setting both logs a warning naming the
  superseded styles. No existing theme changes behaviour: with neither key set, the
  `fontType` path is exactly what it was.

  Known Android side effect, identical to Flutter's: setting either key also sets the
  Android navigation-bar title to the size of `body1`, smaller than the title size
  used with no font override. The native top-app-bar title has no typography role of
  its own and the style passed to it replaces the ambient one instead of merging with
  it, so a complete style has to be supplied and the ambient size cannot be read from
  that call site. `textStyles.body1.fontSize` is the knob to take it back. iOS is
  unaffected.

  This ports the pair Flutter exposes as `OctopusTheme.fontFamily` /
  `OctopusTheme.fontWeight` (`lib/src/octopus_theme.dart`, fields at lines 133 and
  151, the 100-900 assert at line 209, wire keys at lines 267-268), which itself
  follows the native iOS 1.13.2 `Font.custom(_:size:).weight(_:)` application.

- de918d7: Expose the link (URL) and community background colors in the theme.

  `OctopusColorSet` gains two optional hex keys, `link` and `background`, forwarded to the
  native theme on both platforms — `link` colors URLs rendered in posts and comments,
  `background` the community screens. Both work in the single color set and in the
  light/dark dual-mode form, and a value given for one mode only applies to both. Omitting
  a key keeps the native default, so nothing changes for an existing theme.

  Theme colors are also normalized before they reach the native layer, which fixes a
  pre-existing divergence on all six colors: iOS accepted 3-, 6- and 8-digit hex with or
  without the leading `#`, while Android required a `#` and exactly 6 or 8 digits, so
  `'1D9BD1'` or `'#F63'` was honored on iOS and silently dropped to the native default on
  Android. Every accepted form is now rewritten to `#RRGGBB` / `#AARRGGBB` (alpha first, as
  both natives read it), so one input means one color on both platforms.

  Two guards are fixed along the way. A theme carrying no `primary` was dropped wholesale
  by the iOS bridge, so a theme made only of `link` and/or `background` — or only of
  `onPrimary` — now applies instead of being silently ignored; the Android guard was
  widened the same way. And a color that is not a parseable hex string now logs a warning
  naming the offending key at `initialize`, on both platforms, instead of falling back to
  the default in silence.

- af0feaf: Expose the navigation-bar item font in the theme.

  `OctopusFonts.textStyles` gains an optional `navBarItem` entry (same
  `fontType`/`fontSize` shape as the six existing styles) that styles the
  navigation-bar items — back/close labels and bar actions.

  **iOS only**: the native iOS theme has a dedicated `navBarItem` font slot and
  the native Android typography has no counterpart, so the Android bridge
  documents the key as ignored rather than approximating it by resizing another
  slot. Omitting it keeps the previous behaviour — nav-bar items follow `body1` —
  so nothing changes for an existing theme. If `body1` is omitted too, the slot
  falls back to a 17pt system font rather than to the native iOS `.body` default:
  any `textStyles` entry makes the bridge build all seven slots explicitly, so the
  native per-slot defaults only apply when no `fonts` block is passed at all.

  No native change is involved: iOS `Theme.swift` has exposed `navBarItem: Font`
  since 1.0.3, and the wrapper had simply been hardwiring it to `body1`. What this
  completes is the wrapper-side catch-up the `link` and `background` theme colors
  started — Flutter exposed the same slot as `fontSizeNavBarItem`, while the React
  Native port had only shipped the colors half.

- b471ca4: Add `initialScreen` to the embedded `<OctopusUIView>`, so a host that embeds the community instead of opening it fullscreen can mount it directly on a post, a group, a member's posts or profile, or the post editor. Same `OctopusInitialScreen` union, same normalization and same notification-wins precedence as `openUI({ initialScreen })`. The prop is read on mount on both platforms — remount with a `key` to target a different screen — and, because a prop cannot reject a promise, a `createPost` prefill that fails native validation opens a blank editor with a native log instead of throwing a `NavigateToOctopusCreatePostError`.
- c8869ad: Add the Unified Profile navigation binding, so a host can show its own profile screen when a
  member is tapped inside the community UI.

  `addNavigateToProfileListener((event: { clientUserId: string }) => void)` fires with the id
  your app knows that member by, named after the iOS reference surface.

  Taking profile taps over is an explicit opt-in, mirroring `interceptUrls`: pass
  `interceptProfileTaps` to `openUI(options)` or as a prop on `<OctopusUIView>`. It is off by
  default, so nothing changes for a host that does not ask for it — and that matters here,
  because the native SDKs key the whole feature on the callback being set, so wiring it
  speculatively would replace their own profile screens with a dead end. With the flag on, iOS
  also gets `onNavigateToProfileEditCallback`, the mode-agnostic edit hook the Android bridge
  already routed, which is what makes the "Edit my profile" action appear on a member's own
  profile.

  The feature additionally requires a community configured to expose client user ids; without
  that, taps keep opening the SDK's own profile screens.

### Patch Changes

- e2772bf: Fix the comment composer and the "create post" editor floating above the Android keyboard
  instead of sitting directly on top of it, inside an embedded `<OctopusUIView>`.

  The SDK's own comment and post-editor screens size their keyboard-avoidance padding from
  `WindowInsets.ime`, which Android always reports relative to the window's bottom edge. That is
  correct only when the composable extends all the way to that edge. On the embedded path it
  often does not: a host laying out `<OctopusUIView>` as a flex sibling of its own bottom
  navigation/tab bar stops short of the window's true bottom by that sibling's height, and the
  SDK has no way to know it — so the padding was oversized by exactly that shortfall while the
  keyboard was visible, floating the composer above it by a fixed, keyboard-height-independent
  gap.

  The embedded view manager now resolves that shortfall from where `<OctopusUIView>` is actually
  mounted, the same way it already does for the Android navigation bar, and cancels out exactly
  that much of the keyboard padding. The fullscreen presentation (`OctopusActivity`) was already
  unaffected, since it always occupies the full window.

- 540c778: Document the `SyncFollowGroupAction` and `SyncFollowGroupResult` types and their
  `groupId` and `status` members with TSDoc. Both types were exported without any
  comment, so their generated API reference pages shipped with an empty
  description.
- 6da3c99: Fix `<OctopusUIView>` rendering its "create post" bar under the Android system navigation bar
  on an edge-to-edge host (API 35+) that never configured `ui.bottomSafeAreaInset`. The embedded
  view manager consumes the system-bar insets so a configured value can be a _total_ bottom
  padding rather than an additive one; when the host configured nothing at all, nothing else
  reserved the navigation bar, so the bar rendered behind it with no configuration a host could
  have been expected to supply.

  Android now resolves that case from where `<OctopusUIView>` is actually mounted: it reserves
  whatever portion of the system navigation-bar inset geometrically overlaps the view's own
  on-screen position, and nothing when the host has already lifted the view above the navigation
  bar (its own bottom chrome underneath). The resolution updates across a rotation or a
  navigation-mode change (gesture vs. 3-button).

  This is Android-only, deliberately: on iOS the embedded view already sits inside the safe area,
  so there was nothing to fix there. An explicit `ui.bottomSafeAreaInset`, including an explicit
  `0`, is unaffected on both platforms and keeps behaving exactly as before — only the case where
  the host configured nothing at all changes on Android.

  **Opt-out:** hosts that relied on an absent `ui.bottomSafeAreaInset` reserving nothing at all
  in an embedded `<OctopusUIView>` on Android should now pass an explicit `0` to get that
  behaviour back.

- 81ce5f4: Make `ui.bottomSafeAreaInset` reserve the same bottom band on both platforms in an embedded
  `<OctopusUIView>`. The option is documented as a bottom padding, and that is what Android
  renders: its view manager consumes the system insets before mounting, so the host's value is
  the only bottom padding applied. The iOS bridge forwarded the value untouched to
  `OctopusHomeScreen(bottomSafeAreaInset:)`, whose contract is _additive_ — the native SDK
  stacks it on top of the safe area the view already sits in — so the same value reserved
  roughly twice the documented band on a device with a home indicator.

  The iOS bridge now converts the host's total into the additive value the native SDK expects,
  by subtracting the safe area the embedded view is actually laid out in, and keeps that
  conversion current as the container's geometry changes (first layout, rotation, iPad
  multitasking). iOS therefore lands on `max(value, safeArea)` where Android lands on `value` —
  content cannot be pushed under the home indicator. Hosts that pass no value, or a
  non-positive one, are unaffected, and the fullscreen UI opened by `openUI()` is unchanged:
  there the value is additive on both platforms already. Hosts that had lowered the value to
  compensate for the iOS doubling should restore the total they actually want, since iOS now
  reserves that total rather than adding to the safe area.

  One divergence is documented rather than hidden: the native SDK compares the reported
  keyboard height against the same scalar it uses as a reserved height, so normalizing moves
  that threshold. Only a hardware keyboard (iPad, or Bluetooth on iPhone) reports a height
  small enough to fall in the affected band — a full-height software keyboard does not, for
  any realistic bottom chrome. Fixing it properly requires the native SDK to take the total
  and the threshold separately.

- 7a62910: Stop gating native → JS events on a listener tally, on both platforms. `OctopusEventEmitter`
  (Android) and `OctopusEventManager` (iOS) each kept one integer covering all seven event
  names, maintained from the `addListener` / `removeListeners` callbacks `NativeEventEmitter`
  makes. That tally cannot be kept honest: `removeListeners` carries no event name, so a count
  can never be attributed to one, and `removeAllListeners(event)` forwards a count over a
  globally scoped event name that also covers listeners registered outside this module. It
  could therefore reach zero while a listener was still live, silently starving it until the
  next `addListener` — and on Android, where the subtraction had no lower bound, a count driven
  below zero would have latched the channel shut for the rest of the process.

  Both sides now gate on whether their transport to JS is still usable — Android on
  `hasActiveReactInstance()`, iOS on bridge validity. Emitting to a JS side that has no
  listener is harmless, so nothing is lost by dropping the count. No supported code path
  reached either state, since the emitter is internal and nothing calls `removeAllListeners`,
  so this removes a latent trap rather than fixing observed behaviour.

- c8b9c92: Fix the compatibility table in the README. The announced minimums were stale:
  Android is 7.0+ (API 24) and not 5.0+, iOS is 15.1+ and not 14.0+, Xcode is
  16.1+ and not 16.0+, and the announced Octopus native SDK was still 1.9 while
  the pins had moved on. The table now names the version actually pinned. The iOS
  and Android minimums are the ones React Native itself requires, so they move
  with the React Native version you use.
- 7fcbf55: Lock the package's `MAJOR.MINOR` to the native SDK pins' `MAJOR.MINOR`; `PATCH` stays free
  on all three. A package version is a claim about which native feature set is inside it, so
  `@octopus-community/react-native@1.13.x` pins native 1.13.y on Android and iOS — and a
  native minor bump moves the package minor even when the TypeScript surface does not change.
  The rule is enforced on every pull request, against the version a tree will actually
  release, so the package can neither trail nor lead the pins at publish time.

  Nothing in the public API changes.

- 4e9d6eb: Regenerate the committed `docs/api` reference, which had drifted to a v1.9.2
  stamp while the package was on 1.11.1. Ten public API pages were missing from
  the repository entirely — including `syncFollowGroups`, `openNotification`,
  `registerPushNotificationToken` and the `OctopusTopAppBar` interface — so the
  README linked to pages that did not exist on the published mirror. Also restore
  the TSDoc on `openUI` and `OctopusUIView` (parameter descriptions, return
  description and usage examples) that was dropped when the `notification` option
  was introduced, and fix a broken link to the push-notifications guide in the
  docs index. Pin the Prettier config used to format the generated pages, so the
  same commit no longer produces different output depending on where the
  repository is checked out.
- cd9e90f: Remove the internal `updateTheme` bridge method. It was never part of the public API —
  no export from `src/index.ts` and no wrapper — so the only way to call it was to reach
  into `NativeModules` directly, and it could not deliver runtime theme switching: the
  module stores the theme in a plain holder that is read only when the UI is created, so
  the call does not restyle a UI that is already visible and the new theme surfaces
  unpredictably, on the next UI open or on an Android activity recreation. On Android it
  also replaced the whole stored configuration, so a call carrying only colours dropped
  the logo and the fonts and reset the colour scheme that the automatic light/dark
  tracking maintains.

  Theme configuration continues to be supplied through `initialize()`, and the automatic
  light/dark tracking is unaffected. To change the theme at runtime, re-initialize the SDK
  with the new configuration — see "Dynamic Theme Switching" in the README.

## 1.11.1

### Patch Changes

- b415688: Fix post/comment links not opening on Android. When `interceptUrls` is `false`, the embedded and full-screen community UI now open tapped URLs themselves in a Chrome Custom Tab (with an `ACTION_VIEW` fallback) instead of assuming the native SDK would — the wrapper's own Compose `NavHost` never installed the SDK's URL handler, so links did nothing regardless of the native SDK version. The `interceptUrls: true` flow (`navigateToUrl` event + `handleUrlStrategy`) is unchanged. iOS is unaffected: the pinned native SDK (1.11) already opens links there.
- f202786: Fix embedded `OctopusUIView` ignoring `interceptUrls` prop updates on Android: the value was stored on the ViewManager singleton and read without snapshot-state observation, so updates after the first composition were dropped (and multiple view instances overwrote each other). Both `interceptUrls` and `notification.linkPath` are now per-view Compose state.

All notable changes to this package are documented here. From `1.11.0` onward
this file is **managed by [Changesets](https://github.com/changesets/changesets)** —
add a changeset in your PR (`yarn changeset`) rather than editing this file by
hand. Entries follow the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/).

For releases before `1.11.0`, see the
[GitHub Releases](https://github.com/Octopus-Community/octopus-sdk-react-native/releases)
page.

## 1.11.0

### New Features

- **Push notifications**: end-to-end push-tap support on iOS and Android.
  New API:
  - `registerPushNotificationToken(token)`
  - `isOctopusNotification(payload)` and `getOctopusNotification(payload)`
  - Typed `OctopusNotification` (`title`, `body`, `linkPath`, `postId?`,
    `commentId?`, `replyId?`, `rawPayload`)
  - `openNotification(notification)` — opens the modal at the deep-linked
    content
  - `<OctopusUIView notification={...}>` — embedded surface accepts the same
    deep-link
    See `docs/push-notifications-with-firebase.md`.

- **`syncFollowGroups`**: batch follow/unfollow groups in one round-trip via
  `syncFollowGroups([...])`. Returns per-action `SyncFollowGroupResult` with
  a `SyncFollowGroupStatus` enum (with `UnknownError` fallback for forward
  compatibility). See `docs/sync-follow-groups.md`.

### Dependencies

- Android Octopus SDK: 1.9.1 → 1.11.0
- iOS Octopus SDK: 1.9.3 → 1.11.0
