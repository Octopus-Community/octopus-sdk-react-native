import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OctopusNotification } from '@octopus-community/react-native';

const STORAGE_KEY = 'community_push_inbox_v1';
export interface PushTap {
  id: string;
  notification: OctopusNotification;
}
interface Inbox {
  pending: PushTap[];
  seen: string[];
}

/** Shared by headless Android taps and the shell. Persist before consuming a tap. */
export function createPushInbox(storage = AsyncStorage) {
  let state: Inbox = { pending: [], seen: [] };
  let loaded = false;
  let serial = Promise.resolve();
  const listeners = new Set<() => void>();
  const publish = () => listeners.forEach((listener) => listener());
  function run<T>(operation: () => Promise<T>): Promise<T> {
    const result = serial.then(async () => {
      if (!loaded) {
        const raw = await storage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            const value = JSON.parse(raw) as Inbox;
            if (Array.isArray(value.pending) && Array.isArray(value.seen))
              state = value;
          } catch {
            /* Ignore an unreadable sample inbox. */
          }
        }
        loaded = true;
      }
      return operation();
    });
    serial = result.then(
      () => {},
      () => {}
    );
    return result;
  }
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    snapshot: () => state.pending,
    hydrate: () =>
      run(async () => {
        publish();
      }),
    enqueue: (tap: PushTap) =>
      run(async () => {
        if (state.seen.includes(tap.id)) return;
        const next = {
          pending: [...state.pending, tap],
          seen: [...state.seen, tap.id].slice(-128),
        };
        await storage.setItem(STORAGE_KEY, JSON.stringify(next));
        state = next;
        publish();
      }),
    take: (
      id: string,
      accept?: (notification: OctopusNotification) => boolean
    ) =>
      run(async () => {
        const tap = state.pending.find((item) => item.id === id);
        if (!tap) return null;
        const next = {
          ...state,
          pending: state.pending.filter((item) => item.id !== id),
        };
        await storage.setItem(STORAGE_KEY, JSON.stringify(next));
        // Initialization can change while device storage is writing. Keep the tap
        // pending if the shell no longer accepts it; dispatch and consumption share a tick.
        if (accept && !accept(tap.notification)) {
          await storage.setItem(STORAGE_KEY, JSON.stringify(state));
          return null;
        }
        state = next;
        publish();
        return tap.notification;
      }),
  };
}
export const pushInbox = createPushInbox();

export function pushTapId(
  notification: OctopusNotification,
  transportId?: string
): string {
  return (
    transportId ??
    notification.rawPayload.sample_push_id ??
    notification.rawPayload.message_id ??
    notification.rawPayload['gcm.message_id'] ??
    JSON.stringify(notification.rawPayload)
  );
}
