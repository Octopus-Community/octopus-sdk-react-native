[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusNotification

# Type Alias: OctopusNotification

> **OctopusNotification** = `object`

Represents a push notification from the Octopus Community platform.

Use `isOctopusNotification` to check that a payload originates from
Octopus, then `getOctopusNotification` to parse it into this typed
object. `rawPayload` retains the full source key/value map and is
forwarded to native iOS as the `notificationUserInfo` so new fields
the backend ships in the future pass through transparently.

## Properties

### body

> **body**: `string`

---

### commentId?

> `optional` **commentId**: `string`

---

### linkPath

> **linkPath**: `string`

---

### postId?

> `optional` **postId**: `string`

---

### rawPayload

> **rawPayload**: `Record`\<`string`, `string`\>

---

### replyId?

> `optional` **replyId**: `string`

---

### title

> **title**: `string`
