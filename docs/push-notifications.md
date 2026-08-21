# Push notifications (iOS + Android)

How Octopus delivers pushes, and how to wire each platform.

| Platform | Delivery path | Token Octopus needs | Client setup |
|---|---|---|---|
| iOS | Octopus backend → Apple **APNs** → device | **APNs device token** (hex) | Native APNs (no Firebase) |
| Android | Octopus backend → **FCM** (data-only) → device | **FCM registration token** | FCM token + app renders the notification (Notifee) |

> Octopus signs iOS pushes with **its own APNs key** (configured in the Octopus
> dashboard). FCM is **not** in the iOS delivery path, so you do **not** upload an
> APNs key to Firebase and you do **not** need a `GoogleService-Info.plist` for
> the Octopus flow on iOS.

Call `registerPushNotificationToken(token)` once at startup with the
platform-appropriate token. No prior `connectUser` is required — Octopus
associates the token with the user when `connectUser` is later called.

The payload parser (`isOctopusNotification` / `getOctopusNotification`) accepts
both the flat Android-FCM shape and the iOS-APNs shape (Octopus keys at the top
level alongside `aps`, with `title`/`body` falling back to `aps.alert`), so you
pass the raw message/`userInfo` straight in.

## Backend payload shape

```json
{
  "is_octopus_notification": "true",
  "link_path": "post/{postId}?commentId={commentId}",
  "post_id": "{postId}",
  "comment_id": "{commentId}"
}
```

---

## iOS — native APNs

Octopus delivers on iOS via APNs directly. You need the **APNs device token**
(not an FCM token), which the OS gives you when the app registers for remote
notifications. No Firebase is required.

### Capabilities

In Xcode → target → Signing & Capabilities:
- **Push Notifications**
- **Background Modes** → **Remote notifications**

(In this example these are already set: `aps-environment` in the entitlements and
`remote-notification` in `Info.plist`'s `UIBackgroundModes`.)

### Native glue

The example registers for notifications and forwards the APNs token + tapped
`userInfo` to JS via a small native module
(`ios/OctopusReactNativeSdkExample/OctopusPushModule.swift`) plus
`UNUserNotificationCenterDelegate` callbacks in `AppDelegate.swift`. See those
files for the ~80 lines of reference glue.

### JS

```ts
import { NativeEventEmitter, NativeModules } from 'react-native';
import {
  isOctopusNotification,
  getOctopusNotification,
  openNotification,
  registerPushNotificationToken,
} from '@octopus-community/react-native';

const { OctopusPushModule } = NativeModules;
const emitter = new NativeEventEmitter(OctopusPushModule);

function handle(userInfo: Record<string, any>) {
  if (!isOctopusNotification(userInfo)) return;
  const n = getOctopusNotification(userInfo);
  if (n) void openNotification(n);
}

export async function setupOctopusPush() {
  await OctopusPushModule.requestPermissions();
  emitter.addListener('octopusPushToken', (t: string) => {
    if (t) void registerPushNotificationToken(t);
  });
  emitter.addListener('octopusNotificationOpened', handle);
  const initial = await OctopusPushModule.getInitialNotification();
  if (initial) handle(initial);
}
```

> The iOS Simulator never issues a real APNs token, so
> `registerPushNotificationToken` is a no-op there. Token registration is
> verified on a physical device; the tap → deep-link path is fully testable on
> the simulator (below).

---

## Android — FCM + the app displays the notification

Android delivery goes through FCM, so Firebase is required for the token. **The
key point:** Octopus sends **data-only** FCM messages (no `notification` block) —
exactly like the native Android SDK sample. Android does **not** auto-display
data-only messages, so **the app is responsible for displaying the
notification**, just as the native sample does in its `FirebaseMessagingService`.
This example uses [Notifee](https://notifee.app) to render it.

> **Backend contract (all platforms):** send the Octopus keys in `data`
> (`is_octopus_notification`, `link_path`, …) and, on Android, set
> **`android.priority: "high"`** — otherwise the background handler is blocked on
> Android 12+ (`BackgroundServiceStartNotAllowedException`) and nothing is shown.

### Setup

1. Add your Android app in the Firebase Console and download
   `google-services.json` into `android/app/`.
2. `android/build.gradle`: `classpath "com.google.gms:google-services:4.4.2"`.
3. `android/app/build.gradle` (top): `apply plugin: "com.google.gms.google-services"`.
4. `AndroidManifest.xml`: `<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>`.
5. `yarn add @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native`.

### Display + deep-link

The SDK stays push-provider-agnostic: it gives you `getOctopusNotification`
(parse, pure JS, safe before `initialize()`) and `openNotification` (deep-link).
The app builds the visible notification from the parsed data and routes taps:

```ts
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import {
  isOctopusNotification, getOctopusNotification, openNotification,
} from '@octopus-community/react-native';

async function display(data: Record<string, any>) {
  if (!isOctopusNotification(data)) return;
  const n = getOctopusNotification(data);
  if (!n) return;
  await notifee.createChannel({ id: 'octopus-sdk', name: 'Octopus', importance: AndroidImportance.DEFAULT });
  await notifee.displayNotification({
    title: n.title, body: n.body, data: n.rawPayload,
    android: { channelId: 'octopus-sdk', smallIcon: 'ic_launcher', pressAction: { id: 'default' } },
  });
}

function routeTap(data?: Record<string, any> | null) {
  if (data && isOctopusNotification(data)) {
    const n = getOctopusNotification(data);
    if (n) void openNotification(n);
  }
}

// Foreground (after initialize()):
messaging().onMessage((m) => display({ ...(m.data ?? {}) }));
notifee.onForegroundEvent(({ type, detail }) => {
  if (type === EventType.PRESS) routeTap(detail.notification?.data);
});
```

Background/quit handlers must be registered at module scope in `index.js`
(before `AppRegistry`):

```js
messaging().setBackgroundMessageHandler(async (m) => display({ ...(m.data ?? {}) }));
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) routeTap(detail.notification?.data);
});
```

In this example the platform split lives in `example/src/push.ios.ts` (native
APNs) and `example/src/push.ts` (FCM + Notifee, Android default); Metro resolves
the right one per platform. See those files for the full reference, which mirrors
`MessagingService.kt` in the native Android sample.

---

## Testing from the command line

### iOS Simulator — `xcrun simctl push` (no Firebase, no backend)

```bash
cat > /tmp/octopus-push.apns <<'JSON'
{
  "aps": { "alert": { "title": "New reply", "body": "Tap to open" }, "sound": "default" },
  "is_octopus_notification": "true",
  "link_path": "post/POST_ID",
  "post_id": "POST_ID"
}
JSON

xcrun simctl push booted com.octopuscommunity.sdk.reactnative.sample /tmp/octopus-push.apns
```

Tap the delivered banner to exercise the tap path; relaunch from the
notification for the cold-start path; deliver while the app is foregrounded for
the foreground path. Replace `POST_ID` with a real post in the connected demo
community to land on it; otherwise the JS console confirms `openNotification`
fired with the expected `linkPath`.

### Android emulator / device

Send a **data-only** message with **`android.priority: "high"`** to the FCM token
(FCM HTTP v1 API), using the payload shape above. The app renders the
notification via Notifee. A data-only message **without** high priority is
dropped in the background on Android 12+ — and a `notification` block is not
needed (the app builds the notification itself).
