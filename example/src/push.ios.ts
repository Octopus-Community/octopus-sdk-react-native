import { NativeEventEmitter, NativeModules } from 'react-native';
import {
  isOctopusNotification,
  getOctopusNotification,
  openNotification,
  registerPushNotificationToken,
} from '@octopus-community/react-native';

// Native module defined in ios/OctopusReactNativeSdkExample/OctopusPushModule.swift.
// iOS uses direct APNs (no Firebase): this forwards the APNs device token and
// tapped notification userInfo from native to JS.
const { OctopusPushModule } = NativeModules;
const emitter = new NativeEventEmitter(OctopusPushModule);

export interface SetupOctopusPushOptions {
  /** Called with the device push token once available (debug aid). */
  onToken?: (token: string | null) => void;
}

function handle(userInfo: Record<string, any>): void {
  if (!isOctopusNotification(userInfo)) return;
  const notification = getOctopusNotification(userInfo);
  if (!notification) return;
  openNotification(notification).catch((err) =>
    console.error('Octopus openNotification error', err)
  );
}

/**
 * Bootstraps Octopus push handling on iOS using native APNs (no Firebase).
 * Call once after the SDK has been initialized. Mirrors the Android entry point
 * in `push.ts`.
 */
export async function setupOctopusPush(
  options?: SetupOctopusPushOptions
): Promise<void> {
  await OctopusPushModule.requestPermissions();

  emitter.addListener('octopusPushToken', (token: string) => {
    if (!token || token.length === 0) return;
    options?.onToken?.(token);
    registerPushNotificationToken(token).catch((err) =>
      console.error('Octopus token register error', err)
    );
  });

  emitter.addListener(
    'octopusNotificationOpened',
    (userInfo: Record<string, any>) => {
      handle(userInfo);
    }
  );

  const initial = (await OctopusPushModule.getInitialNotification()) as Record<
    string,
    any
  > | null;
  if (initial) handle(initial);
}
