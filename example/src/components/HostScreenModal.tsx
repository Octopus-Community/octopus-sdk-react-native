import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Modal, Platform } from 'react-native';

/** A native window isolates Android Back and accessibility from the covered community. */
export function HostScreenModal({
  visible,
  onShow,
  onRequestClose,
  onDismiss,
  children,
  overlays,
}: {
  visible: boolean;
  onShow: () => void;
  onRequestClose: () => void;
  onDismiss: () => void;
  children: ReactNode;
  overlays: ReactNode;
}) {
  const wasVisible = useRef(visible);
  useEffect(() => {
    // RN's onDismiss is iOS-only. Android removes the non-animated window when visible
    // becomes false; resume after that render has committed, not in onRequestClose.
    if (Platform.OS !== 'ios' && wasVisible.current && !visible) onDismiss();
    wasVisible.current = visible;
  }, [visible, onDismiss]);

  return (
    <>
      <Modal
        visible={visible}
        onShow={onShow}
        animationType={Platform.OS === 'ios' ? 'slide' : 'none'}
        onRequestClose={onRequestClose}
        onDismiss={onDismiss}
        statusBarTranslucent
        presentationStyle="overFullScreen"
      >
        {children}
        {/* Nested presenters let Debug and WebView open above this screen on iOS too. */}
        {/* Debug/WebView are assumed hidden while the host opens or closes. */}
        {visible && overlays}
      </Modal>
      {!visible && overlays}
    </>
  );
}
