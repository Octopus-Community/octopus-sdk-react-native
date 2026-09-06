[**@octopus-community/react-native v1.13.3**](../README.md)

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

**In an embedded `<OctopusUIView>`, leaving this option out entirely is not the same as
passing `0`, on either platform.** Each bridge applies its own default when the option
is absent:

- Android resolves it from where the view is actually mounted. Since the bridge consumes
  the system insets before mounting (see above), nothing else would reserve the
  navigation bar on an edge-to-edge device (API 35+) if the default were "no extra
  padding" — so it reserves whatever portion of the navigation-bar inset overlaps the
  view's own on-screen position, and nothing when the host has already lifted the view
  above the navigation bar.
- iOS applies a fixed **additional** 10 pt on top of the safe area the embedded view
  sits in — the same default the Flutter bridge applies in that state — so the profile
  bubble and create-post button never sit flush against the bottom edge of the view.

Pass an explicit `0` on either platform to opt back out and reserve nothing. Neither
default applies to the fullscreen UI, where an absent value has always meant "reserve
nothing" and continues to.
