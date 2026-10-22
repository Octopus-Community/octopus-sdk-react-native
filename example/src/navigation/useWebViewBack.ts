import { useCallback, useRef, useState } from 'react';
import type { WebView } from 'react-native-webview';
import { resolveWebViewBack } from './backDispatcher';

/** Each intercepted URL opens a fresh browser tab, even when the URL is unchanged. */
export function useWebViewBack() {
  const [url, setUrl] = useState<string | null>(null);
  const [presentationId, setPresentationId] = useState(0);
  const webViewRef = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const open = useCallback((nextUrl: string) => {
    canGoBack.current = false;
    setPresentationId((previous) => previous + 1);
    setUrl(nextUrl);
  }, []);
  const close = useCallback(() => {
    canGoBack.current = false;
    setUrl(null);
  }, []);
  const onNavigationStateChange = useCallback(
    (state: { canGoBack: boolean }) => {
      canGoBack.current = state.canGoBack;
    },
    []
  );
  const onHardwareBack = useCallback(() => {
    if (
      resolveWebViewBack(canGoBack.current) === 'goBackInHistory' &&
      webViewRef.current
    ) {
      webViewRef.current.goBack();
    } else {
      close();
    }
  }, [close]);
  return {
    url,
    presentationId,
    webViewRef,
    open,
    close,
    onNavigationStateChange,
    onHardwareBack,
  };
}
