[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusThemeMode

# Type Alias: OctopusThemeMode

> **OctopusThemeMode** = `"light"` \| `"dark"` \| `"system"`

Color scheme forced via [setThemeMode](../functions/setThemeMode.md). `'system'` releases the
force and follows the device's system appearance again.

**Diverges from the Flutter reference by design.** Flutter has no
standalone setter for this — `themeMode` is a nullable, two-value field
(`OctopusThemeMode.light` / `.dark`) of the `OctopusTheme` object passed to
`initialize()`; `null` means "follow the system". RN has no equivalent
reactive theme object to add a field to, so this ships as an imperative
setter with a third, explicit value instead: `'system'` is the RN-shaped
equivalent of Flutter's `null`. Same capability as the Flutter reference,
an RN-idiomatic surface rather than a field-for-field port — see the
parity PR's port inventory for the full rationale.

## See

[setThemeMode](../functions/setThemeMode.md)
