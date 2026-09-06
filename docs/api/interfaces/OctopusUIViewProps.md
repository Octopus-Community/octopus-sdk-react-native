[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusUIViewProps

# Interface: OctopusUIViewProps

## Properties

### initialScreen?

> `optional` **initialScreen**: [`OctopusInitialScreen`](../type-aliases/OctopusInitialScreen.md)

The screen the embedded UI mounts on: the main feed (the default), a
specific post or group (bridge mode), one member's posts (`activity`) or
profile (`profile`), or the post editor (`createPost`). Same union — and
same per-variant contract — as `openUI({ initialScreen })`: see
[OctopusInitialScreen](../type-aliases/OctopusInitialScreen.md).

Read **on mount** only, on both platforms, like the other embedded props:
the native side consumes it when it builds the view, and a later prop
change reconfigures nothing. To mount on a different screen, force a
remount with a `key` derived from the screen — e.g.
`key={initialScreen.type + postId}`.

Ignored (with a warning) when [notification](#notification) is also provided — the
deep link wins, exactly as in `openUI()`.

Unlike `openUI()`, a prop cannot reject a promise: a `createPost` screen
whose `prefilledPost` fails native validation opens a **blank** editor and
logs natively, instead of surfacing a
[NavigateToOctopusCreatePostError](NavigateToOctopusCreatePostError.md). Use
[navigateToOctopusCreatePost](../functions/navigateToOctopusCreatePost.md) when you need that error back.

#### Throws

A plain `Error` synchronously, while rendering, when the screen is
structurally invalid (blank `postId` / `groupId`, or an `activity` member
violating the exactly-one-id contract).

#### Example

```tsx
// Mount the embedded view directly on a post
<OctopusUIView
  initialScreen={{ type: 'post', postId }}
  key={postId}
  style={StyleSheet.absoluteFill}
/>
```

---

### interceptProfileTaps?

> `optional` **interceptProfileTaps**: `boolean`

When `true`, profile taps inside the community UI are not handled by the
SDK. Instead, a `navigateToProfile` event is emitted with the tapped
member's `clientUserId`, so your app can show its own profile screen
(Unified Profile). Subscribe with `addNavigateToProfileListener`.

Requires the community to be configured to expose client user ids. On iOS
the prop is read **on mount** only, like the other embedded props.

#### Default

```ts
false;
```

---

### interceptUrls?

> `optional` **interceptUrls**: `boolean`

When `true`, URLs tapped inside the community UI are not opened by the SDK.
Instead, a `navigateToUrl` event is emitted. Subscribe with
`addNavigateToUrlListener` to receive the URL.

#### Default

```ts
false;
```

---

### navBarLeadingAction?

> `optional` **navBarLeadingAction**: [`OctopusNavBarLeadingAction`](../type-aliases/OctopusNavBarLeadingAction.md)

Overrides the leading (top-left) icon on the top app bar with a close
(X) or back arrow, regardless of [showBackButton](#showbackbutton). Tapping either
variant on the SDK's root screen fires [onBackRequested](#onbackrequested), same as
the [showBackButton](#showbackbutton) icon.

When omitted, the native default applies: a back arrow gated by
[showBackButton](#showbackbutton).

#### See

[OctopusNavBarLeadingAction](../type-aliases/OctopusNavBarLeadingAction.md)

---

### navBarPrimaryColor?

> `optional` **navBarPrimaryColor**: `boolean`

When `true`, the top app bar background uses the theme's primary color
for this view only, overriding the global `initialize({ topAppBar })`
setting. When omitted, the global setting (or the default) applies.

---

### navBarTitle?

> `optional` **navBarTitle**: `string`

Overrides the top app bar title for this view only. When omitted, the
title configured globally in `initialize({ topAppBar })` (if any) is
used, falling back to the community name.

---

### navigationMode?

> `optional` **navigationMode**: [`OctopusNavigationMode`](../type-aliases/OctopusNavigationMode.md)

How the embedded UI hosts its internal navigation stack. iOS only —
Android ignores the value (no-op), since it always drives the SDK
through its own navigation host regardless.

Defaults to `'navigationStack'`, not the native SDK's own `'automatic'`
default — matches the Flutter reference's `embeddedView`, whose doc
comment spells out why: every host embeds this view inside its own
navigation/layout tree, and the legacy `'automatic'` container silently
drops sub-navigation pushes when that tree reparents the view (a modal
route, hot reload, a push from elsewhere). Pass `'automatic'` explicitly
to opt back into the native default.

#### Default

```ts
'navigationStack';
```

#### See

[OctopusNavigationMode](../type-aliases/OctopusNavigationMode.md)

---

### notification?

> `optional` **notification**: [`OctopusNotification`](../type-aliases/OctopusNotification.md)

When provided, the embedded UI mounts at the deep-linked content carried
by the notification. On iOS the prop is read **on mount** only; on Android
updating it to a new `linkPath` also navigates an already-mounted view.
For consistent cross-platform re-deep-linking, force a remount by adding
`key={notification.linkPath}`.

---

### onBackRequested()?

> `optional` **onBackRequested**: () => `void`

Called when the top app bar's leading icon (back arrow or close — see
[showBackButton](#showbackbutton) and [navBarLeadingAction](#navbarleadingaction)) is tapped on the
SDK's **root** screen, where the SDK's own internal navigation has
nothing left to pop. The RN analog of the Flutter `OctopusHomeScreen`
widget's `onBack` callback: use it to dismiss your own container (pop
your route, close your modal, switch tab…).

Not called on the SDK's sub-screens — there the icon pops the SDK's
internal stack itself, exactly like `openUI()`'s fullscreen UI.

The fullscreen entry point has the same callback as an option —
[OpenUIOptions.onBackRequested](OpenUIOptions.md#onbackrequested) — with one difference: there the SDK
owns the container and closes it for you, so the callback is a
notification rather than a request to dismiss.

#### Returns

`void`

#### Example

```tsx
<OctopusUIView
  showBackButton={true}
  onBackRequested={() => navigation.goBack()}
  style={StyleSheet.absoluteFill}
/>
```

---

### showBackButton?

> `optional` **showBackButton**: `boolean`

Whether the embedded UI's top app bar shows a back button. Matches the
Flutter `OctopusHomeScreen` widget's `showBackButton`.

On the SDK's own sub-screens the icon pops the SDK's internal navigation
stack; on the SDK's root screen — where there is nothing left to pop —
tapping it fires [onBackRequested](#onbackrequested), so your app can dismiss or
navigate away from the embedded view.

#### Default

```ts
false;
```

---

### showNavBar?

> `optional` **showNavBar**: `boolean`

When `false`, the embedded UI renders with no top app bar at all — your
app is then expected to provide its own title chrome. Matches the
Flutter `OctopusHomeScreen` widget's `showNavBar`.

**iOS**: not supported yet — the native top app bar always renders; the
prop is accepted for API parity but has no visible effect on iOS.

#### Default

```ts
true;
```

---

### style?

> `optional` **style**: `StyleProp`\<`ViewStyle`\>

---

### titleCentered?

> `optional` **titleCentered**: `boolean`

When `true`, centers the top app bar title for this view only,
overriding the global `initialize({ topAppBar })` setting. When
omitted, the global setting (or the default, leading-aligned) applies.
