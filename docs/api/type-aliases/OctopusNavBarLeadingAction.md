[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusNavBarLeadingAction

# Type Alias: OctopusNavBarLeadingAction

> **OctopusNavBarLeadingAction** = `"close"` \| `"back"`

Overrides the leading (top-left) icon on the Octopus UI's top app bar.

- `'close'` — renders a close (X) icon.
- `'back'` — renders a back arrow.

Supported on both platforms (native Android SDK 1.12.1+ via
`leadingNavigationIcon`, native iOS SDK 1.12.2+ via `navBarLeadingAction`).

**Tapping either variant on the SDK's root screen — where the SDK's own
navigation has nothing left to pop — notifies JS on both entry points**
(issue #36):

- `<OctopusUIView>` — fires the [OctopusUIViewProps.onBackRequested](../interfaces/OctopusUIViewProps.md#onbackrequested)
  prop, same as the default back arrow (`showBackButton`). The embedded
  container is yours, so nothing is dismissed for you.
- `openUI()` — fires the [OpenUIOptions.onBackRequested](../interfaces/OpenUIOptions.md#onbackrequested) callback and
  closes the fullscreen UI, which the SDK owns. No `closeUI()` needed.

Sub-screens behave the same on both: the icon pops the SDK's own internal
navigation stack and nothing is emitted.
