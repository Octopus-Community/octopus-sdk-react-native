[**@octopus-community/react-native v1.13.3**](../README.md)

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
(X) or back arrow. Tapping it on the SDK's root screen closes the UI,
exactly like the default back arrow does, and fires
[onBackRequested](#onbackrequested) if you passed one. Useful when `openUI()` is
presented from a modal and a close affordance reads better than a back
arrow, or vice-versa.

When omitted, each platform's own default applies: a leading back arrow
on Android, and on iOS no leading icon at all on the community feed —
that root is left to the SDK's own trailing "Close" button, which
dismisses the UI without firing [onBackRequested](#onbackrequested). Pass a value
here whenever you need the callback on iOS, but note that it adds a
leading icon without removing that trailing Close — see
[onBackRequested](#onbackrequested) for what that means for the signal.

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

---

### onBackRequested()?

> `optional` **onBackRequested**: () => `void`

Called when the SDK leaves its **root** screen at the user's request —
the top app bar's leading icon (the default back arrow or the
[navBarLeadingAction](#navbarleadingaction) override) tapped where the SDK's own internal
navigation has nothing left to pop, or an equivalent SDK affordance that
routes through that same leading action: on iOS the "OK" button of the
content-unavailable / content-deleted alert leaves the screen the same
way. The fullscreen counterpart of
[OctopusUIViewProps.onBackRequested](OctopusUIViewProps.md#onbackrequested), and the RN analog of the
Flutter `OctopusHomeScreen` widget's `onBack`.

**The UI still closes itself — this is a notification, not a delegation.**
You do not have to call [closeUI](../functions/closeUI.md) from the callback (doing so
anyway is harmless), and dismissal is identical whether you pass the
option or not. The container is the SDK's own — a native Activity on
Android, a full-screen modal on iOS — so leaving it up until the host
reacted would strand a user whose handler forgot to close it, on a screen
iOS gives no system way out of. Use the callback to _follow_ the user
back: pop your own route, restore chrome you hid, refresh a badge, log an
event.

Not called on the SDK's sub-screens — there the icon pops the SDK's
internal stack instead, exactly like the embedded view.

**Registration is last-write-wins across the fullscreen entry points**
([openUI](../functions/openUI.md), `openNotification`): each call replaces the previous
registration, and a call that omits the option clears it. Passing nothing
therefore keeps the pre-callback behaviour exactly.

**Not a complete exit signal on iOS.** The SDK's community feed root
renders its own trailing "Close" button whenever it is presented modally
— which `openUI` always is — _regardless_ of
[navBarLeadingAction](#navbarleadingaction), and that button dismisses the presentation
directly without firing anything. Passing a [navBarLeadingAction](#navbarleadingaction)
adds a leading icon that does fire the callback, but it does not take the
trailing Close away, so the user always keeps a silent way out. (On a
bridge-mode [initialScreen](#initialscreen) root the leading slot carries your
[navBarLeadingAction](#navbarleadingaction) when you pass one, and the SDK's own silent
close button when you do not.) Treat the callback as a best-effort
notification of the leading-icon path — never as "the user is still in
the community until it fires".

**Android**: the leading icon is always painted on the root screen, so
that path is always reachable. The OS-level gesture (system back,
predictive back) is not routed through the callback: on the SDK's
sub-screens — including one opened through [initialScreen](#initialscreen), which
this bridge pushes on top of the community feed rather than making it the
root of the stack — it pops the SDK's own stack back towards the feed,
and on the feed itself it finishes the SDK's Activity without firing.
iOS's full-screen modal offers no system dismissal gesture at all.

#### Returns

`void`

#### Example

```typescript
await openUI({
  navBarLeadingAction: 'close',
  onBackRequested: () => {
    // The UI is closing itself; just follow the user back — pop the route
    // you pushed, restore the chrome you hid. Do not use this as a
    // "community session ended" signal: iOS keeps a silent Close that
    // never fires it (see above).
    restoreHostChrome();
  },
});
```
