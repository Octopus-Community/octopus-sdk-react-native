import { useCallback, useEffect, useRef, useState } from 'react';
import * as Octopus from '@octopus-community/react-native';
import { debugLog } from '../debug/debugLog';

export type HostScreen =
  | { kind: 'signIn' }
  | { kind: 'editProfile'; fieldToEdit: Octopus.UserProfileField | null }
  | { kind: 'profile'; clientUserId: string };

/** Host routes cover the existing tab without unmounting the embedded community. */
export function useHostScreens({
  enabled,
  fullscreen,
  isScenariosPreview,
  authEnabled,
  editEnabled = true,
  interceptProfiles,
  resumeFullscreen,
  retainedCommunity = false,
}: {
  enabled: boolean;
  fullscreen: boolean;
  isScenariosPreview: boolean;
  authEnabled: boolean;
  editEnabled?: boolean;
  interceptProfiles: boolean;
  resumeFullscreen: () => Promise<void>;
  retainedCommunity?: boolean;
}) {
  const [screen, setScreen] = useState<HostScreen | null>(null);
  const [presentationId, setPresentationId] = useState(0);
  const active = useRef(false);
  const showing = useRef(false);
  const requestId = useRef(0);
  const closeRequest = useRef<Promise<boolean> | null>(null);
  const closing = useRef(false);
  const resume = useRef(false);
  const dismissed = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    const open = async (next: HostScreen) => {
      if (showing.current || closing.current) return;
      // Share the close request when callbacks arrive before the host screen appears.
      active.current = true;
      const request = ++requestId.current;
      const pendingClose =
        closeRequest.current ??
        (retainedCommunity ? Promise.resolve() : Octopus.closeUI()).then(
          () => true,
          () => false
        );
      closeRequest.current = pendingClose;
      const wasPresented = await pendingClose;
      if (disposed || request !== requestId.current) return;
      // Android closeUI resolves even for an embedded view; app state must also allow resume.
      resume.current =
        !retainedCommunity && fullscreen && !isScenariosPreview && wasPresented;
      setPresentationId(request);
      setScreen(next);
    };
    const login = Octopus.addLoginRequiredListener(() => {
      if (authEnabled) {
        open({ kind: 'signIn' });
      } else {
        debugLog.apiCall('loginRequired', 'ignored — host callback disabled');
      }
    });
    const edit = Octopus.addEditUserListener(({ fieldToEdit }) => {
      if (editEnabled) open({ kind: 'editProfile', fieldToEdit });
    });
    const profile = interceptProfiles
      ? Octopus.addNavigateToProfileListener(({ clientUserId }) => {
          debugLog.apiCall('navigateToProfile', `clientUserId=${clientUserId}`);
          open({ kind: 'profile', clientUserId });
        })
      : null;
    return () => {
      disposed = true;
      active.current = false;
      showing.current = false;
      requestId.current += 1;
      closeRequest.current = null;
      closing.current = false;
      resume.current = false;
      setScreen(null);
      login.remove();
      edit.remove();
      profile?.remove();
    };
  }, [
    enabled,
    fullscreen,
    isScenariosPreview,
    authEnabled,
    editEnabled,
    interceptProfiles,
    retainedCommunity,
  ]);

  const onShow = useCallback(() => {
    if (
      presentationId === requestId.current &&
      active.current &&
      !closing.current
    ) {
      showing.current = true;
    }
  }, [presentationId]);

  const close = useCallback(() => {
    if (!active.current || closing.current) return;
    closing.current = true;
    setScreen(null);
  }, []);

  // Presenting while an iOS Modal is still dismissing can target its departing controller.
  const onDismiss = useCallback(() => {
    dismissed.current?.();
    dismissed.current = null;
    if (!closing.current) return;
    active.current = false;
    showing.current = false;
    closeRequest.current = null;
    closing.current = false;
    const shouldResume = resume.current;
    resume.current = false;
    if (shouldResume) resumeFullscreen();
  }, [resumeFullscreen]);

  const dismissForPush = useCallback(async () => {
    // Push owns the next destination. Never reopen an old fullscreen preview.
    resume.current = false;
    requestId.current += 1;
    if (screen !== null || closing.current) {
      await new Promise<void>((done) => {
        dismissed.current = done;
        close();
      });
    } else {
      await closeRequest.current;
      active.current = false;
      closeRequest.current = null;
    }
  }, [screen, close]);

  return { screen, presentationId, onShow, close, onDismiss, dismissForPush };
}
