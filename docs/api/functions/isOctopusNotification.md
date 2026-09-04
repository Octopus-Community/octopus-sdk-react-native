[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / isOctopusNotification

# Function: isOctopusNotification()

> **isOctopusNotification**(`payload`): `boolean`

Returns true when the payload's `is_octopus_notification` flag is set.
Pure JS — safe to call before `initialize()`.

Accepts both Android FCM (flat) and iOS APNs (`data`-envelope) shapes.

## Parameters

### payload

`Record`\<`string`, `any`\>

## Returns

`boolean`
