[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusNavigationMode

# Type Alias: OctopusNavigationMode

> **OctopusNavigationMode** = `"automatic"` \| `"navigationStack"`

How the Octopus UI hosts its internal navigation stack.

- `'automatic'` — the native SDK's own inherent default (not RN's — see
  below). Legacy SwiftUI `NavigationView`. Has a known bug where a push
  made while the SDK is itself hosted inside a modal presentation, or
  embedded inside a reparenting host, can silently get dropped ("modal
  reparenting").
- `'navigationStack'` — the modern `NavigationStack` (iOS 16+). Not
  affected by that bug.

**iOS only.** Android always drives the SDK through a Compose `NavHost`,
which has no such legacy/modern split and is unaffected by the bug above,
so there is no equivalent choice to make — the value is accepted on both
`openUI()` and `OctopusUIView` for API parity but ignored (no-op) on
Android.

**RN's own default is `'navigationStack'` on both entry points** —
deliberately overriding the native SDK's own `'automatic'` default,
because both RN entry points always put the SDK in a hosting shape the
bug affects: `openUI()` presents it inside a modally-hosted, full-screen
controller, and `<OctopusUIView>` embeds it inside the host's own
navigation/layout tree, which can reparent it (a modal route, a
conditionally-rendered ancestor). Iso with the Flutter reference, whose
`OctopusHomeScreen` widget defaults to `navigationStack` for the same
reason and is used, un-overridden, by both its full-screen route and its
`embeddedView`. Pass `'automatic'` explicitly to opt back into the native
default.

Applies to both entry points — `openUI({ navigationMode })` and
`<OctopusUIView navigationMode="..." />` — since the underlying bug is
about how the SDK is _hosted_ (modally presented vs. embedded), not about
which entry point mounted it.

A standalone `navigationStack` embedded default is tracked as remaining
parity work with the native SDKs.
