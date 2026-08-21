# Migrating

Upgrade notes for `@octopus-community/react-native`, **newest version at the
top**. Each release that changes the public API or requires consumer action
gets one `##` section here. Releases that only add APIs (no breaking change)
are listed in [`CHANGELOG.md`](./CHANGELOG.md) and don't need a migration entry.

> One file, one section per version — we do **not** create per-version
> `MIGRATION_x_y.md` files (a versioned filename multiplies docs over time).

## Unreleased — towards 1.13.0

The SDK is catching up to the 1.12/1.13 public surface already shipped by the
native Android/iOS SDKs and the Flutter plugin (typed `OctopusResult`, `profile`
/ `groups` / `connectionState` streams, `setReaction`, the Bridge Post API,
initial-screen routing, the create-post screen, Unified Profile, …). The full
gap and the planned API shape are tracked in the **1.12 API parity** issue.

### Breaking — the `ScreenType` union changed

The wrapped native SDKs now sit at **1.13.2** (they were 1.11.0). Two changes to
the union, both breaking for the same consumer code, both shipped in this one
release so hosts pay the migration once:

1. `'settingsAbout'` is **removed**.
2. `'unknown'` is **added**.

Everything below applies to code that names these literals — a lookup table keyed
by `ScreenType` (`Record<ScreenType, …>`), or a `switch` whose exhaustiveness the
compiler checks. Code that treats the screen type as an opaque string is
unaffected.

#### `'settingsAbout'` removed

Native 1.13.0 removed the "About the community" screen — its three legal links were already
duplicated in the Activity and Profile overflow menus — so neither platform
emits that screen-displayed event anymore and the bridge can no longer produce
it. `'settingsAbout'` is therefore gone from the union.

Delete the branch — nothing replaces it, the screen itself is gone rather than
renamed.

```ts
// Before
const label: Record<ScreenType, string> = {
  settingsAccount: 'Account settings',
  settingsAbout: 'About the community',
  // …
};

// After
const label: Record<ScreenType, string> = {
  settingsAccount: 'Account settings',
  // …
};
```

There is no runtime change to handle: the event stopped being emitted when the
native screen was removed, so no host logic keyed on it can still fire.

#### `'unknown'` added

This one is a **type fix, not a new behaviour**: both event serializers have
always been able to emit `{"type": "unknown"}` for a native screen the wrapper
does not model yet, but the union did not contain the literal. So an exhaustive
`switch` over `ScreenType` type-checked and then fell through at runtime — it
returned `undefined` from a function typed `string`, with no compiler or lint
diagnostic anywhere on the path, because the type said the case could not happen.
`'unknown'` is reachable today from `mainFeed`, `groups` and `groupDetail`.

Adding the literal makes that hole visible, which is why it lands here rather
than in a later release: it breaks exactly the same code the `'settingsAbout'`
removal breaks, so folding it in costs one migration instead of two.

```ts
// Before — compiles, and silently returns undefined on an 'unknown' event
function label(screen: ScreenType): string {
  switch (screen) {
    case 'settingsAccount':
      return 'Account settings';
    // …every other member…
  }
}

// After — handle it explicitly, or with a default branch
function label(screen: ScreenType): string {
  switch (screen) {
    case 'settingsAccount':
      return 'Account settings';
    // …every other member…
    case 'unknown':
      return 'Other';
  }
}
```

New screens will keep arriving as `'unknown'` until the wrapper types them, so
treat it as a permanent forward-compatibility branch, not a temporary one.
`ReactionKind` in the same module already works this way.

### `'settingsList'` is Android-only from 1.13 — no compiler signal

Not a type change, so nothing in the union or in `tsc` marks it, but it changes
what a host's analytics receives.

Native iOS 1.13 deleted its settings-list screen (`SettingsListView` and its view
model are gone). The `settingsList` case still exists in the native iOS event
enum, so the bridge still compiles and no API dump or compiler warning fires —
but nothing emits it anymore: the sole emission site was in the deleted view, and
at 1.13.2 no emission site on iOS names the case. Android still emits it from its
settings screen.

Net effect after upgrading: `{"type": "settingsList"}` keeps arriving on Android
and **silently stops arriving on iOS**. If you count screen views per platform,
expect that screen's iOS count to go to zero — it is the screen being gone, not
the event pipeline breaking. No code change is required or possible on the
wrapper side; this note exists so the drop is not read as a regression.

### Still to come

Some of the parity work is **breaking** and will get a migration entry here when
it lands. Notably:

- **`overrideCommunityAccess(hasAccess)`** will return a typed result
  (`OctopusResult<void, …>`) instead of `Promise<void>`. Fire-and-forget
  callers (`await overrideCommunityAccess(true)`) keep compiling; callers that
  need to know whether the override was applied should inspect the result.

No action is required yet — this section is a heads-up so integrators can plan.

<!--
Template for a real migration section (copy when a breaking release lands):

## From 1.x.y to 1.x.z

### <area that changed>

```ts
// Before
…

// After
…
```

### <next area>
…
-->
