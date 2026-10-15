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
} from '@octopus-community/react-native';

import { pushInbox, pushTapId } from './navigation/pushInbox';
import { formatRedactedError } from './config/apiKeyMask';

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
  payload.sample_push_id =
    message.messageId ??
    payload.sample_push_id ??
    `fcm-${Date.now()}-${Math.random()}`;
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
    id: payload.sample_push_id,
    data: notification.rawPayload,
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_launcher',
      pressAction: { id: 'default' },
    },
  });
}

// All tap sources converge on the persisted inbox, including headless startup.
async function routeTap(
  data?: Record<string, any> | null,
  transportId?: string
): Promise<void> {
  if (!data || !isOctopusNotification(data)) return;
  const notification = getOctopusNotification(data);
  if (!notification) return;
  await pushInbox.enqueue({
    id: pushTapId(notification, transportId),
    notification,
  });
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
    if (type === EventType.PRESS)
      await routeTap(detail.notification?.data, detail.notification?.id);
  });
}

/** Attach once, before SDK initialization; token registration belongs to the session. */
export async function setupOctopusPush(
  options?: SetupOctopusPushOptions
): Promise<() => void> {
  const subscriptions = [
    messaging().onTokenRefresh((token) => options?.onToken?.(token)),
    messaging().onMessage((message) =>
      displayOctopusNotification(toPayload(message))
    ),
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS)
        routeTap(detail.notification?.data, detail.notification?.id).catch(
          (error) =>
            console.error('Push tap failed', formatRedactedError(error))
        );
    }),
    messaging().onNotificationOpenedApp((message) => {
      routeTap(toPayload(message), message.messageId).catch((error) =>
        console.error('Push tap failed', formatRedactedError(error))
      );
    }),
  ];
  try {
    const initialNotifee = await notifee.getInitialNotification();
    if (initialNotifee)
      await routeTap(
        initialNotifee.notification.data,
        initialNotifee.notification.id
      );
    const initialFcm = await messaging().getInitialNotification();
    if (initialFcm) await routeTap(toPayload(initialFcm), initialFcm.messageId);
    await messaging().requestPermission();
    await notifee.requestPermission();
    await ensureChannel();
    options?.onToken?.(await messaging().getToken());
  } catch (error) {
    console.error('Octopus push setup error', formatRedactedError(error));
  }
  return () => subscriptions.forEach((unsubscribe) => unsubscribe());
}
