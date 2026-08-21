[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / getOctopusNotification

# Function: getOctopusNotification()

> **getOctopusNotification**(`payload`): [`OctopusNotification`](../type-aliases/OctopusNotification.md) \| `null`

Parses an Octopus push-notification payload into a typed
`OctopusNotification`. Returns `null` when `link_path` is missing.
Pure JS — safe to call before `initialize()`.

## Parameters

### payload

`Record`\<`string`, `any`\>

## Returns

[`OctopusNotification`](../type-aliases/OctopusNotification.md) \| `null`
