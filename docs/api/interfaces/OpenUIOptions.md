[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OpenUIOptions

# Interface: OpenUIOptions

Options for opening the Octopus UI.

## Properties

### initialScreen?

> `optional` **initialScreen**: [`OctopusInitialScreen`](../type-aliases/OctopusInitialScreen.md)

The screen the UI opens on: the main feed (the default), a specific post
or group (bridge mode), one member's posts (`activity`) or profile
(`profile`), or the post editor (`createPost`). See
[OctopusInitialScreen](../type-aliases/OctopusInitialScreen.md) for each variant's contract.

Ignored (with a warning) when [notification](#notification) is also provided — the
deep link wins.

#### Example

```typescript
// Open directly on a post (bridge mode)
await openUI({ initialScreen: { type: 'post', postId: 'post-1' } });

// Open one member's Octopus posts (Unified Profile)
await openUI({
  initialScreen: { type: 'activity', member: { clientUserId: 'user-42' } },
});

// Open the connected user's own profile
await openUI({ initialScreen: { type: 'profile' } });
```

---

### interceptProfileTaps?

> `optional` **interceptProfileTaps**: `boolean`

When `true`, profile taps inside the community UI do not open the SDK's own
profile screens. Instead, a `navigateToProfile` event is emitted with the
tapped member's `clientUserId`, so your app can show its own profile screen
(Unified Profile). Subscribe with `addNavigateToProfileListener`.

Also routes the Unified Profile activity screen's "edit my profile" action
to the existing `editUser` event, in any connection mode.

Requires the community to be configured to expose client user ids. Leave it
off — or leave the community unconfigured — to keep the SDK's own profile
screens.

#### Default

```ts
false;
```

---

### interceptUrls?

> `optional` **interceptUrls**: `boolean`

When `true`, URLs tapped inside the community UI are not opened by the SDK.
Instead, a `navigateToUrl` event is emitted. Subscribe with
`addNavigateToUrlListener` to receive the URL and decide whether to handle
it in-app or delegate back to the SDK (system browser).

#### Default

```ts
false;
```

---

### navBarLeadingAction?

> `optional` **navBarLeadingAction**: [`OctopusNavBarLeadingAction`](../type-aliases/OctopusNavBarLeadingAction.md)

Overrides the leading (top-left) icon on the top app bar with a close
(X) or back arrow. Tapping it closes the UI, exactly like the default
back arrow does. Useful when `openUI()` is presented from a modal and a
close affordance reads better than a back arrow, or vice-versa.

When omitted, the native default back arrow applies.

#### See

[OctopusNavBarLeadingAction](../type-aliases/OctopusNavBarLeadingAction.md)

---

### navigationMode?

> `optional` **navigationMode**: [`OctopusNavigationMode`](../type-aliases/OctopusNavigationMode.md)

How the UI hosts its internal navigation stack. iOS only — Android
ignores the value (no-op), since it always drives the SDK through its
own navigation host regardless.

Defaults to `'navigationStack'`, not the native SDK's own `'automatic'`
default — `openUI()` always presents through a modally-hosted, full-screen
controller (`UIHostingController` with `modalPresentationStyle =
.fullScreen`), which is exactly the hosting shape the legacy
`'automatic'` container silently drops sub-navigation pushes under. Matches
the Flutter reference, whose full-screen route (`showOctopusHomeScreen`)
inherits `OctopusHomeScreen`'s own `navigationStack` default without
overriding it away. Pass `'automatic'` explicitly to opt back into the
native default.

#### Default

```ts
'navigationStack';
```

#### See

[OctopusNavigationMode](../type-aliases/OctopusNavigationMode.md)

---

### notification?

> `optional` **notification**: [`OctopusNotification`](../type-aliases/OctopusNotification.md)

When provided, opens the SDK at the deep-linked content carried by the
notification (e.g. a specific post or comment). Pair with `openNotification`
for push-tap handling — see the push-notification docs.

A notification always wins over [initialScreen](#initialscreen): when both are
provided the deep link is followed and the initial screen is dropped with
a warning.
