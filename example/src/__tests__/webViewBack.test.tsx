import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import type { WebView } from 'react-native-webview';
import { useWebViewBack } from '../navigation/useWebViewBack';

let browser: ReturnType<typeof useWebViewBack>;
let tree: ReactTestRenderer;
const goBack = jest.fn();
function Harness() {
  browser = useWebViewBack();
  return null;
}
beforeEach(() => {
  goBack.mockClear();
  act(() => {
    tree = create(<Harness />);
  });
  browser.webViewRef.current = { goBack } as unknown as WebView;
});
afterEach(() => act(() => tree.unmount()));

it('goes back through history before closing the browser', () => {
  act(() => browser.open('https://example.com'));
  browser.onNavigationStateChange({ canGoBack: true });
  act(() => browser.onHardwareBack());
  expect(goBack).toHaveBeenCalledTimes(1);
  expect(browser.url).toBe('https://example.com');
  browser.onNavigationStateChange({ canGoBack: false });
  act(() => browser.onHardwareBack());
  expect(browser.url).toBeNull();
});

it('resets history on open and rekeys even when reopening the same URL', () => {
  act(() => browser.open('https://example.com'));
  const firstPresentation = browser.presentationId;
  browser.onNavigationStateChange({ canGoBack: true });
  act(() => browser.open('https://example.com'));
  expect(browser.presentationId).toBeGreaterThan(firstPresentation);
  act(() => browser.onHardwareBack());
  expect(goBack).not.toHaveBeenCalled();
  expect(browser.url).toBeNull();
});

it('clears history on close and tolerates a missing native view', () => {
  act(() => browser.open('https://example.com'));
  browser.onNavigationStateChange({ canGoBack: true });
  act(() => browser.close());
  act(() => browser.onHardwareBack());
  expect(goBack).not.toHaveBeenCalled();
  expect(browser.url).toBeNull();
  act(() => browser.open('https://example.org'));
  browser.onNavigationStateChange({ canGoBack: true });
  browser.webViewRef.current = null;
  act(() => browser.onHardwareBack());
  expect(browser.url).toBeNull();
});
