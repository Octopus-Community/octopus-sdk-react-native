[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / ProfileFieldsLock

# Interface: ProfileFieldsLock

Per-field profile lock for the current community.

Mirrors the native `ProfileFieldsLock` config type — see
[debugOverrideProfileFieldsLock](../functions/debugOverrideProfileFieldsLock.md). This is a **debug-only** testing hatch: it does not
exist on a real production community config, which is set server-side.

## Properties

### avatar

> **avatar**: [`ProfileFieldLockState`](../type-aliases/ProfileFieldLockState.md)

Status of the profile picture field. Only `editable` / `readOnly` are meaningful.

---

### bio

> **bio**: [`ProfileFieldLockState`](../type-aliases/ProfileFieldLockState.md)

Status of the bio field. May additionally be `disabled`.

---

### nickname

> **nickname**: [`ProfileFieldLockState`](../type-aliases/ProfileFieldLockState.md)

Status of the username field. Only `editable` / `readOnly` are meaningful.
