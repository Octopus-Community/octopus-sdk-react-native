[**@octopus-community/react-native v1.0.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / ConnectUserParams

# Interface: ConnectUserParams

## Properties

### profile?

> `optional` **profile**: `object`

#### biography?

> `optional` **biography**: `string`

#### legalAgeReached?

> `optional` **legalAgeReached**: `boolean`

Whether the user has reached legal age.
Used for age-appropriate content filtering and compliance.

#### profilePicture?

> `optional` **profilePicture**: `string`

URL or local file path to the user's profile picture.
Supports HTTP/HTTPS URLs and local file paths.

#### username?

> `optional` **username**: `string`

---

### userId

> **userId**: `string`

Unique identifier for the user in your system.
This should be a stable, unique ID that won't change for the user.
