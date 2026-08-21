// Android / default push path. Octopus sends DATA-ONLY FCM messages (same
// format as the native Android sample), so the app is responsible for
// displaying the notification — mirrors `MessagingService.kt` in the native
// sample, using Notifee for the local notification.
//
// On iOS, Metro resolves `push.ios.ts` instead (native APNs, no Firebase/Notifee),
// so this file is never bundled on iOS.
import messaging from '@react-native-firebase/messaging';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import {
  isOctopusNotification,
  getOctopusNotification,
  openNotification,
  registerPushNotificationToken,
} from '@octopus-community/react-native';

export interface SetupOctopusPushOptions {
  /** Called with the device push token once available (debug aid). */
  onToken?: (token: string | null) => void;
}

const CHANNEL_ID = 'octopus-sdk';

async function ensureChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Octopus Community',
    importance: AndroidImportance.DEFAULT,
  });
}

// Build the Octopus payload from an FCM message: data-only, with a fallback to
// the `notification` block in case the backend sends a hybrid message.
function toPayload(
  message: FirebaseMessagingTypes.RemoteMessage
): Record<string, any> {
  const payload: Record<string, any> = { ...(message.data ?? {}) };
  const notif = message.notification;
  if (notif?.title && payload.title === undefined) payload.title = notif.title;
  if (notif?.body && payload.body === undefined) payload.body = notif.body;
  return payload;
}

// Display a local notification for an Octopus message. Pure-JS parsing
// (`getOctopusNotification`) is safe before `initialize()`, so this works from
// the background handler too. Non-Octopus messages are ignored.
async function displayOctopusNotification(
  payload: Record<string, any>
): Promise<void> {
  if (!isOctopusNotification(payload)) return;
  const notification = getOctopusNotification(payload);
  if (!notification) return;

  await ensureChannel();
  await notifee.displayNotification({
    title: notification.title,
    body: notification.body,
    // Carry the raw Octopus keys so the tap handler can re-parse and deep-link.
    data: notification.rawPayload,
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_launcher',
      pressAction: { id: 'default' },
    },
  });
}

// Route a notification tap to the Octopus deep-link. Requires the SDK to be
// initialized (true by the time the user taps and the app is open).
function routeTap(data?: Record<string, any> | null): void {
  if (!data || !isOctopusNotification(data)) return;
  const notification = getOctopusNotification(data);
  if (!notification) return;
  openNotification(notification).catch((err) =>
    console.error('Octopus openNotification error', err)
  );
}

async function registerCurrentToken(
  onToken?: (token: string | null) => void
): Promise<void> {
  const token = await messaging().getToken();
  if (!token || token.length === 0) return;
  // Logged so you can copy it into the Firebase Console "Send test message" flow.
  console.log('[Octopus] FCM registration token:', token);
  onToken?.(token);
  await registerPushNotificationToken(token);
}

/**
 * Registers the FCM background message handler + Notifee background tap handler.
 * MUST be called at module scope from `index.js` (before AppRegistry), so it
 * runs when the app is launched from a background/quit push.
 */
export function registerOctopusFcmBackground(): void {
  messaging().setBackgroundMessageHandler(async (message) => {
    await displayOctopusNotification(toPayload(message));
  });
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS) routeTap(detail.notification?.data);
  });
}

/**
 * Bootstraps Octopus push handling (foreground) on Android. Call once after the
 * SDK has been initialized. iOS uses `push.ios.ts`.
 */
export async function setupOctopusPush(
  options?: SetupOctopusPushOptions
): Promise<void> {
  const status = await messaging().requestPermission();
  const authorized =
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL;
  if (!authorized) return;

  await ensureChannel();

  await registerCurrentToken(options?.onToken);
  messaging().onTokenRefresh(() => {
    registerCurrentToken(options?.onToken).catch((err) =>
      console.error('Octopus token refresh error', err)
    );
  });

  // Foreground: display the notification ourselves (the system never shows
  // data-only messages automatically).
  messaging().onMessage(async (message) => {
    await displayOctopusNotification(toPayload(message));
  });

  // Foreground notification taps → deep-link.
  notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) routeTap(detail.notification?.data);
  });

  // Cold-start tap: app opened from a notification while it was quit.
  const initialNotifee = await notifee.getInitialNotification();
  if (initialNotifee) routeTap(initialNotifee.notification.data);

  // Hybrid messages (notification block) tapped from the system tray.
  messaging().onNotificationOpenedApp((message) =>
    routeTap(toPayload(message))
  );
  const initialFcm = await messaging().getInitialNotification();
  if (initialFcm) routeTap(toPayload(initialFcm));
}
