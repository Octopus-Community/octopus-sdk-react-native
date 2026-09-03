[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusUIOptions

# Interface: OctopusUIOptions

UI customization options for platform-specific layout adjustments.

## Properties

### bottomSafeAreaInset?

> `optional` **bottomSafeAreaInset**: `number`

Bottom padding reserved below the Octopus UI, in points on iOS and dp on Android.

Its meaning depends on how the UI is presented, and is the same on both platforms:

- In an embedded `<OctopusUIView>`, it is the **total** bottom padding. Each bridge
  removes the system safe area from the equation first — Android by consuming the
  system insets before mounting, iOS by subtracting the safe area the embedded view
  sits in — so the same value renders the same band on both. On iOS the result is
  therefore `max(value, safeArea)`: a system safe area already larger than the
  requested padding satisfies the request on its own and nothing is added.
- In the fullscreen UI opened by `openUI()`, it is an **additional** inset applied on
  top of the system safe area (navigation bar on Android, home indicator on iOS).

Values of `0` or less reserve nothing on iOS, and on Android in the fullscreen UI.

**In an embedded `<OctopusUIView>` on Android, leaving this option out entirely is not
the same as passing `0`.** Since the bridge consumes the system insets before mounting
(see above), nothing else would reserve the navigation bar on an edge-to-edge device
(API 35+) if this were left at "no extra padding" by default — so when the option is
absent, Android instead resolves it from where the view is actually mounted: it
reserves whatever portion of the navigation-bar inset overlaps the view's own on-screen
position, and nothing when the host has already lifted the view above the navigation
bar. Pass an explicit `0` to opt back out and reserve nothing, matching the previous
default. This resolution is Android-only: on iOS the embedded view already sits inside
the safe area, so an absent value keeps reserving nothing there, as before. It does not
apply to the fullscreen UI either, where an absent value has always meant "reserve
nothing" and continues to.
