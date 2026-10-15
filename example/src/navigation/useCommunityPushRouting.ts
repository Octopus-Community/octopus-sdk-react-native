import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { OctopusNotification } from '@octopus-community/react-native';
import { pushInbox } from './pushInbox';
import { formatRedactedError } from '../config/apiKeyMask';

export function useCommunityPushRouting({
  ready,
  dismissPresentations,
  openTarget,
  inbox = pushInbox,
}: {
  inbox?: typeof pushInbox;
  ready: boolean;
  dismissPresentations: () => Promise<void>;
  openTarget: (notification: OctopusNotification) => void;
}) {
  const pending = useSyncExternalStore(inbox.subscribe, inbox.snapshot);
  const latest = useRef({ ready, dismissPresentations, openTarget });
  latest.current = { ready, dismissPresentations, openTarget };
  const routing = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [completed, setCompleted] = useState(0);
  useEffect(() => {
    inbox
      .hydrate()
      .catch((error) =>
        console.error('Push inbox restore failed', formatRedactedError(error))
      );
  }, [inbox]);
  useEffect(() => {
    const tap = pending[0];
    if (!ready || !tap || routing.current) return;
    routing.current = true;
    let failed = false;
    (async () => {
      await latest.current.dismissPresentations();
      if (!mounted.current || !latest.current.ready) return;
      await inbox.take(tap.id, (notification) => {
        if (!mounted.current || !latest.current.ready) return false;
        latest.current.openTarget(notification);
        return true;
      });
    })()
      .catch((error) => {
        failed = true;
        console.error('Push routing failed', formatRedactedError(error));
      })
      .finally(() => {
        routing.current = false;
        if (mounted.current && !failed) setCompleted((n) => n + 1);
      });
    // Keep the in-flight route across state changes. Readiness is checked after dismissal.
  }, [ready, pending, completed, inbox]);
}
