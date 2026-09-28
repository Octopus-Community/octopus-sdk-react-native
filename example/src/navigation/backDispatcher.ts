/**
 * The sample's single answer to the Android hardware / gesture Back.
 *
 * The sample navigates with plain component state — the Settings pages, a Scenario's detail
 * and its host routes, the Config revisit, the tabs — so Android sees none of it. Without one
 * place that knows every level, a Back pressed inside a sub-page falls straight through to the
 * activity and leaves the app. This module is that place: each screen that owns a level of
 * navigation registers "what my own on-screen Back would do", and one `hardwareBackPress`
 * listener (installed by `App`) asks them in a fixed order.
 *
 * The order is by LEVEL, not by registration order: React runs a child's effects before its
 * parent's, so "most recently registered" would put the App shell above the Settings pages it
 * contains. Within a level the most recent registration is asked first.
 *
 * Kept free of `react-native` so the dispatch rule is testable on its own.
 */

/**
 * How deep a handler sits, from the outermost to the innermost. A deeper level is always
 * asked first.
 *
 * - `shell`: the App itself — Config revisit → Cancel, a root tab other than Home → Home.
 * - `screen`: a screen's own sub-navigation — a Settings page, a Scenario detail.
 * - `overlay`: anything drawn over a screen that its own Back dismisses first.
 *
 * RN `Modal`s are not registered: on Android a Modal is its own window and takes the Back
 * press through `onRequestClose` before JS ever sees it.
 */
export type BackLevel = 'shell' | 'screen' | 'overlay';

const LEVEL_RANK: Record<BackLevel, number> = {
  shell: 0,
  screen: 1,
  overlay: 2,
};

/**
 * Handles one Back press. Returns `true` when it consumed the press (it popped something),
 * `false` when it has nothing to pop at the moment and the next handler should be asked.
 */
export type BackHandlerFn = () => boolean;

export interface BackDispatcher {
  /** Registers a handler at a level; the returned function unregisters exactly it. */
  register(level: BackLevel, handler: BackHandlerFn): () => void;
  /**
   * Asks the handlers, deepest level first and most recent first within a level, until one
   * consumes the press. Returns `false` when none did — the caller then lets the platform
   * default run (the sample's `MainActivity` sends the app to the background).
   */
  dispatch(): boolean;
  /** How many handlers are registered — for tests and diagnostics. */
  size(): number;
}

interface Entry {
  level: BackLevel;
  handler: BackHandlerFn;
  order: number;
}

export function createBackDispatcher(): BackDispatcher {
  let entries: Entry[] = [];
  let nextOrder = 0;

  return {
    register(level, handler) {
      const entry: Entry = { level, handler, order: nextOrder++ };
      entries = [...entries, entry];
      return () => {
        entries = entries.filter((e) => e !== entry);
      };
    },
    dispatch() {
      // A snapshot: a handler that pops a level unmounts that level's screen, whose cleanup
      // unregisters while this loop is still running.
      const ordered = [...entries].sort(
        (a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.order - a.order
      );
      for (const entry of ordered) {
        if (entry.handler()) return true;
      }
      return false;
    },
    size() {
      return entries.length;
    },
  };
}

/** The dispatcher the running sample uses; `App` installs its one platform listener on it. */
export const appBackDispatcher = createBackDispatcher();

/** What the App shell's own Back does, given where the shell is. */
export type ShellBackAction = 'cancelReconfigure' | 'goHome' | 'none';

export interface ShellBackState {
  /** The Config screen is showing (either access). */
  isOnConfig: boolean;
  /** The Config screen has a Cancel back to a running session (the Settings-revisit access). */
  canCancelConfig: boolean;
  /** The tab bar is showing, so `activeTab` is a real place. */
  isShellVisible: boolean;
  activeTab: string;
}

/**
 * The shell's rule, as a pure function: Config revisit → Cancel (the app bar's own Back);
 * a root tab other than Home → Home; on Home, or on the first-launch Config screen, nothing —
 * the press goes to the platform and the app is backgrounded.
 */
export function resolveShellBack(state: ShellBackState): ShellBackAction {
  if (state.isOnConfig) {
    return state.canCancelConfig ? 'cancelReconfigure' : 'none';
  }
  if (state.isShellVisible && state.activeTab !== 'home') return 'goHome';
  return 'none';
}

/** What hardware Back does in the in-app WebView modal. */
export type WebViewBackAction = 'goBackInHistory' | 'close';

/**
 * The WebView modal's rule, as a pure function: a browser tab's. Back pops the page history
 * while the WebView reports `canGoBack`, and closes the modal only once that history is empty.
 *
 * The modal is an RN `Modal`, so on Android it is its own window and receives Back through
 * `onRequestClose` before JS's `BackHandler` — it is deliberately not registered on the
 * dispatcher above (see its header). The app bar's close button stays a plain close. Kept
 * independent of how the modal is presented, so a react-navigation WebView screen (#232) can
 * apply the same rule from its own Back handler.
 *
 * `canGoBack` is only as good as what the WebView reports: on Android, `react-native-webview`
 * does not surface `history.pushState` navigations through `onNavigationStateChange`, so on a
 * single-page site the flag stays `false` and Back closes the modal, as it did before.
 */
export function resolveWebViewBack(canGoBack: boolean): WebViewBackAction {
  return canGoBack ? 'goBackInHistory' : 'close';
}
