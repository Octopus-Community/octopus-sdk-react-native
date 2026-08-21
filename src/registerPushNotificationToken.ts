import { OctopusReactNativeSdk } from './internals/nativeModule';

/**
 * Registers the device's push-notification token with the Octopus SDK.
 *
 * - On iOS, pass the APNs device token (hex string). Firebase Messaging
 *   exposes it via `messaging().getAPNSToken()`. Octopus sends to Apple's
 *   APNs servers directly, so the FCM token is not the right one on iOS.
 * - On Android, pass the FCM registration token (`messaging().getToken()`).
 *
 * No prior `connectUser()` is required. The token is associated with the
 * user when `connectUser` is later called, and re-associated on user change.
 *
 * @param token Device-specific push token.
 */
export function registerPushNotificationToken(token: string): Promise<void> {
  return OctopusReactNativeSdk.registerPushNotificationToken(token);
}
