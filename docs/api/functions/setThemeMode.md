[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / setThemeMode

# Function: setThemeMode()

> **setThemeMode**(`mode`): `void`

Forces the Octopus UI's color scheme, or releases a previous force back to
following the system appearance.

- `'light'` / `'dark'` — the Octopus UI renders in that scheme, regardless
  of the device's system appearance. While forced, this module keeps
  observing `Appearance`/`AppState` changes internally (so it is ready to
  resume immediately once released), and keeps notifying the native side on
  every such change same as always — but the forced value always wins over
  the observed one there, so the system value never actually reaches the
  native side while a force is active.
- `'system'` (the default before this is ever called) — the Octopus UI
  follows the device's system appearance, resuming the automatic tracking
  `initialize()` already starts.

**Timing (both platforms): not a live update.** This call does not repaint
an already-mounted `<OctopusUIView>` or an already-open `openUI()` screen.
It takes effect the next time the Octopus UI mounts or recreates its view —
on Android concretely, the next composition that reads the theme config
(the write lands in a plain non-observable holder, not observed state).
Call it before opening/mounting the UI, not while it's on screen expecting
an instant recolor.

**Android**: supported, subject to the timing note above. Also a silent
no-op if no theme configuration exists yet at all — i.e. the host passed
neither `initialize({ theme })` nor a resolvable system color scheme at
init time; there is nothing for this call to update in that case.
**iOS**: the native SDK renders with adaptive colors that already follow
the system automatically; it has no public entry point to force a scheme
independently of it yet, so calling this on iOS still updates this
module's internal tracking (consistent with Android) but has no visible
effect on the rendered colors. Tracked as a gap — see the parity PR's
port inventory.

**Shape diverges from the Flutter reference by design** — see
[OctopusThemeMode](../type-aliases/OctopusThemeMode.md) for the rationale.

## Parameters

### mode

[`OctopusThemeMode`](../type-aliases/OctopusThemeMode.md)

`'light'`, `'dark'`, or `'system'` to release the force.

## Returns

`void`

## Example

```typescript
// Always render the Octopus UI in dark mode
setThemeMode('dark');

// Go back to following the system appearance
setThemeMode('system');
```
