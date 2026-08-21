[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / registerPushNotificationToken

# Function: registerPushNotificationToken()

> **registerPushNotificationToken**(`token`): `Promise`\<`void`\>

Registers the device's push-notification token with the Octopus SDK.

- On iOS, pass the APNs device token (hex string). Firebase Messaging
  exposes it via `messaging().getAPNSToken()`. Octopus sends to Apple's
  APNs servers directly, so the FCM token is not the right one on iOS.
- On Android, pass the FCM registration token (`messaging().getToken()`).

No prior `connectUser()` is required. The token is associated with the
user when `connectUser` is later called, and re-associated on user change.

## Parameters

### token

`string`

Device-specific push token.

## Returns

`Promise`\<`void`\>
