import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/** A push waits for the departing iOS controller, not just visible=false. */
export function useModalDismissal(visible: boolean, hide: () => void) {
  const wasVisible = useRef(visible);
  const pending = useRef<Promise<void> | null>(null);
  const resolve = useRef<(() => void) | null>(null);
  const onDismiss = useCallback(() => {
    resolve.current?.();
    resolve.current = null;
    pending.current = null;
  }, []);
  useEffect(() => {
    if (wasVisible.current && !visible) {
      // The user may have started dismissal before a push arrived.
      if (!pending.current) {
        pending.current = new Promise<void>((done) => {
          resolve.current = done;
        });
      }
      if (Platform.OS !== 'ios') onDismiss();
    }
    wasVisible.current = visible;
  }, [visible, onDismiss]);
  const dismiss = useCallback(() => {
    if (pending.current) return pending.current;
    if (!visible) return Promise.resolve();
    pending.current = new Promise<void>((done) => {
      resolve.current = done;
    });
    hide();
    return pending.current;
  }, [visible, hide]);
  return { dismiss, onDismiss };
}
