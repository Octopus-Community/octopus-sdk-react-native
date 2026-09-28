/**
 * Anchors: the named places inside a screen that a link can land on.
 *
 * A link that points at one setting has to land on that setting — open and on screen — rather
 * than on the top of the screen that holds it, which leaves the tester hunting for it. Each
 * screen that can be targeted names its sections here, and the link passes the name.
 */

/** Sections of the Config screen, in screen order. */
export type ConfigSection =
  | 'community'
  | 'server'
  | 'auth'
  | 'theme'
  | 'displayMode'
  | 'integration';

/** Pages of the Settings tab. `root` is the summary itself. */
export type SettingsPage =
  | 'root'
  | 'account'
  | 'appearance'
  | 'language'
  | 'developer'
  | 'about';

/** Sections of the Scenarios list — the ids of `SCENARIO_SECTIONS` in `ScenariosScreen`. */
export type ScenarioSectionId =
  | 'sso'
  | 'community'
  | 'notifications'
  | 'presentation'
  | 'appearance'
  | 'host';

/** Which of the two debug destinations of Developer tools is open. */
export type DebugView = 'events' | 'info';

/**
 * A request to show `target`, stamped so that asking for the same target twice is still two
 * requests. A screen that is already mounted applies a request when its `nonce` changes, so
 * without the stamp a second "Connect" tap on the same page would do nothing.
 */
export interface NavRequest<T> {
  target: T;
  nonce: number;
}

/** The request that follows `previous`, for `target`. */
export function nextNavRequest<T>(
  previous: NavRequest<T> | null,
  target: T
): NavRequest<T> {
  return { target, nonce: (previous?.nonce ?? 0) + 1 };
}

/**
 * The section-open record after a link asked for `sectionId`: that section opens, the others
 * keep whatever the tester left them in. A link never closes anything — it only makes sure
 * the one it names is visible.
 */
export function withSectionOpen(
  open: Readonly<Record<string, boolean>>,
  sectionId: string
): Record<string, boolean> {
  return { ...open, [sectionId]: true };
}

/**
 * Where to scroll so that a section whose top sits at `sectionY` (in scroll content
 * coordinates) lands just under the top edge. The margin keeps the section title from
 * touching the app bar; the floor keeps the first section from asking for a negative offset.
 */
export function anchorScrollOffset(sectionY: number, margin = 8): number {
  return Math.max(0, sectionY - margin);
}
