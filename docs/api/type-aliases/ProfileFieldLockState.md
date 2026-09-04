[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / ProfileFieldLockState

# Type Alias: ProfileFieldLockState

> **ProfileFieldLockState** = `"editable"` \| `"readOnly"` \| `"disabled"`

Per-field editability status of a profile field, driven by the community configuration.

`disabled` is only meaningful for `bio` (the field disappears entirely); `nickname` and
`avatar` can only be `editable` or `readOnly`.
