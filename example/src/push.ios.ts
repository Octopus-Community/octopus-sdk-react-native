import { NativeEventEmitter, NativeModules } from 'react-native';
import {
  isOctopusNotification,
  getOctopusNotification,
} from '@octopus-community/react-native';
import { pushInbox, pushTapId } from './navigation/pushInbox';
import { formatRedactedError } from './config/apiKeyMask';

const { OctopusPushModule } = NativeModules;
const emitter = new NativeEventEmitter(OctopusPushModule);
export interface SetupOctopusPushOptions {
  onToken?: (token: string | null) => void;
}
async function handle(userInfo: Record<string, any>): Promise<void> {
  if (!isOctopusNotification(userInfo)) return;
  const notification = getOctopusNotification(userInfo);
  if (!notification) return;
  await pushInbox.enqueue({
    id: pushTapId(notification, userInfo.sample_push_id),
    notification,
  });
}

/** Listen before initialization so a warm tap remains pending during startup. */
export async function setupOctopusPush(
  options?: SetupOctopusPushOptions
): Promise<() => void> {
  const token = emitter.addListener('octopusPushToken', (value: string) => {
    if (value) options?.onToken?.(value);
  });
  const opened = emitter.addListener(
    'octopusNotificationOpened',
    (userInfo: Record<string, any>) => {
      handle(userInfo).catch((error) =>
        console.error('Push tap failed', formatRedactedError(error))
      );
    }
  );
  try {
    const initial = await OctopusPushModule.getInitialNotification();
    if (initial) await handle(initial);
    await OctopusPushModule.requestPermissions();
  } catch (error) {
    console.error('Octopus push setup error', formatRedactedError(error));
  }
  return () => {
    opened.remove();
    token.remove();
  };
}
