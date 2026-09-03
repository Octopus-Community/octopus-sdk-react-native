import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import * as Octopus from '@octopus-community/react-native';
import {
  trackCustomEvent,
  overrideCommunityAccess,
  trackCommunityAccess,
  openUI,
  isOctopusNotification,
  getOctopusNotification,
  openNotification,
  setReaction,
  isSetReactionError,
  fetchCommunityData,
  startObservingCommunityData,
  stopObservingCommunityData,
  addCommunityDataListener,
  debugOverrideProfileFieldsLock,
  debugOverrideContentOptions,
  debugOverrideTermsAcceptanceMode,
  navigateToOctopusCreatePost,
  isNavigateToOctopusCreatePostError,
  syncFollowGroups,
} from '@octopus-community/react-native';
import type {
  OctopusReactionKind,
  OctopusCommunityData,
  OctopusInitialScreen,
  OctopusNavBarLeadingAction,
  ProfileFieldsLock,
  ContentOptions,
  TermsAcceptanceMode,
} from '@octopus-community/react-native';
import { PillButton } from '../components/PillButton';
import { PresetButton } from '../components/PresetButton';
import { chromeColors } from '../theme/branding';
import { ScenarioResultPanel } from '../components/ScenarioResultPanel';
import { ScenarioRunButton } from '../components/ScenarioRunButton';
import {
  TextParamField,
  SetParamField,
  EnumParamField,
} from '../components/ScenarioParamField';
import type {
  EntitlementVariant,
  SwitchCommunityTarget,
} from '../config/demoConfig';
import {
  ENTITLEMENT_LABELS,
  hasUserToken,
  injectedApiKeys,
  octopusDemoPostId,
  resolveSwitchTarget,
  USER_TOKEN_ENV_VARS,
} from '../config/demoConfig';
import { useScenarioRun } from '../debug/useScenarioRun';
import { debugLog } from '../debug/debugLog';
import type { CommunityLocaleOverride } from './SettingsScreen';
import { CustomEventPanel } from './panels/CustomEventPanel';
import { SyncFollowGroupsPanel } from './panels/SyncFollowGroupsPanel';
import { ThemePanel } from './panels/ThemePanel';
import type {
  ThemeSet,
  FontType,
  LogoMode,
  FontSizeMode,
  ThemeMode,
  BottomInsetPreset,
  LinkBackgroundMode,
  FontOverrideMode,
} from '../types/theme';

/**
 * Bundled sample push payload for the `pushNotifications` preset — shaped like a real
 * backend FCM/APNs payload (see docs/push-notifications.md) so the preset exercises the
 * same `isOctopusNotification` → `getOctopusNotification` → `openNotification` path a
 * real push tap takes, without needing a live push to arrive.
 */
const SAMPLE_NOTIFICATION_PAYLOAD: Record<string, string> = {
  is_octopus_notification: 'true',
  link_path: 'post/sample-post-1',
  post_id: 'sample-post-1',
  title: 'Sample Octopus notification',
  body: 'Tap to open the linked content in the Octopus community',
};

/** Fixed properties for the "with props" custom-event preset — presets never take free text. */
const SAMPLE_CUSTOM_EVENT_PROPERTIES: Record<string, string> = {
  source: 'scenarios-tab',
  preset: 'with-props',
};

/**
 * Bundled sample group ids for the `syncFollowGroups` presets. RN has no fetchGroups /
 * groups-list binding (out of scope for this screen), so batch presets act on a fixed set
 * instead of a real fetched list — the same "replay a fixed payload" shape as the
 * pushNotifications preset above, rather than the Android sample's approach of batching
 * over its live `OctopusSDK.groups` cache.
 */
const SAMPLE_GROUP_IDS = ['sample-group-1', 'sample-group-2', 'sample-group-3'];

/** Labels for the `reactions` scenario's `EnumParamField` — hoisted to module scope so it
 *  is a stable reference, not a fresh object on every render (which would otherwise force
 *  it into `onRunReaction`'s dependency array). */
const REACTION_LABELS: Record<string, string> = {
  heart: 'Heart ❤️',
  joy: 'Joy 😂',
  none: 'Unreact (null)',
  mouthOpen: 'Mouth open 😮',
  clap: 'Clap 👏',
  cry: 'Cry 😢',
  rage: 'Rage 😡',
};

/**
 * Name of the bundled sample image used by the `createPost` "bundled image" presets. Resolved
 * as a native bundled resource by {@link navigateToOctopusCreatePost} (see the
 * `OctopusPrefilledPost.imageUri` doc comment): a bare name with no scheme resolves as an
 * Android drawable resource / an iOS asset-catalog image with that name. The two platforms
 * stage this sample asset under different, convention-mandated names — Android drawable names
 * must be lowercase snake_case, the iOS asset-catalog entry here is PascalCase — so this picks
 * the right one per platform instead of passing one literal for both.
 */
const BUNDLED_SAMPLE_IMAGE_NAME = Platform.select({
  ios: 'OctopusSampleImage',
  default: 'octopus_sample_image',
});

/**
 * Local, non-catalog view state for the `communityData` scenario's Preset 6: a small
 * host-rendered "client profile" page that replaces the scenario list, exercising
 * `fetchCommunityData` the way a host app's own profile screen would. The catalog notes this
 * preset leaves the scenario screen, so its outcome has no slot in `communityData-result` —
 * it gets its own `clientProfile-*` test ids instead.
 */
type ClientProfileView =
  | null
  | { status: 'data'; data: OctopusCommunityData }
  | { status: 'error'; message: string }
  | { status: 'unknown' };

/**
 * Card titles, spelled exactly as the shared scenario catalog's `title:` field (kept in the
 * internal QA tooling's shared config). The catalog is the cross-platform source of
 * truth for the wording, so the reference sample and this one label the same capability the same
 * way — and the search box below filters on it.
 */
const SCENARIO_TITLES = {
  connection: 'Connection',
  communityAccess: 'Community Access',
  notSeenNotifications: 'Not-Seen Notifications',
  pushNotifications: 'Push Notifications',
  customEvents: 'Custom Events',
  locale: 'Locale',
  theme: 'Theme',
  createPost: 'Create Post (Bridge Share)',
  initialScreen: 'Initial Screen',
  embeddedBack: 'Embedded Back Button',
  reactions: 'Reactions',
  profileFieldsLock: 'Profile Field Lock',
  contentOptions: 'Content Options',
  termsAcceptance: 'Terms Acceptance (Consent)',
  communityData: 'Community Data (Unified Profile)',
  syncFollowGroups: 'Sync Followed Groups',
  lifecycle: 'Lifecycle',
} as const;

/** A scenario the list can open. */
export type ScenarioId = keyof typeof SCENARIO_TITLES;

/**
 * One-line capability summary per card, condensed from the catalog's `capability:` field so a
 * reader of the list knows what a scenario exercises before opening it.
 */
const SCENARIO_SUBTITLES: Record<ScenarioId, string> = {
  connection: 'connectUser / disconnectUser, per-entitlement test users',
  communityAccess:
    'overrideCommunityAccess, trackCommunityAccess, access stream',
  notSeenNotifications: 'not-seen count stream + forced refresh',
  pushNotifications: 'push-tap deep link, replayed from a bundled payload',
  customEvents: 'trackCustomEvent, with and without properties',
  locale: 'overrideDefaultLocale',
  theme: 'custom Octopus theme — colors, fonts, logo, insets',
  createPost: 'prefilled create-post screen + post CTA',
  initialScreen:
    'openUI({ initialScreen }) — feed, post, group, profile, editor',
  embeddedBack:
    'showBackButton / navBarLeadingAction + onBackRequested on the embedded view',
  reactions: 'setReaction — set / change / unreact',
  profileFieldsLock: 'per-field lock: nickname / avatar / bio',
  contentOptions: 'per-content-type options: pictures, polls',
  termsAcceptance: 'terms acceptance modes + the consent sheet',
  communityData: 'fetchCommunityData by profileId or clientUserId',
  syncFollowGroups: 'batch follow / unfollow with per-action timestamps',
  lifecycle: 'switchCommunity — re-target the SDK at another community',
};

/**
 * The binding calls each scenario drives, shown as monospace chips on the row and again at the
 * head of the detail.
 *
 * These are the package's own exported names, not prose: a chip is what a host developer
 * greps for after seeing the scenario work. Only the calls the scenario itself makes are
 * listed — the listeners `App` registers once at mount are Developer tools' business.
 */
const SCENARIO_APIS: Record<ScenarioId, string[]> = {
  connection: ['connectUser', 'disconnectUser'],
  communityAccess: ['overrideCommunityAccess', 'trackCommunityAccess'],
  notSeenNotifications: ['updateNotSeenNotificationsCount'],
  pushNotifications: ['isOctopusNotification', 'openNotification'],
  customEvents: ['trackCustomEvent'],
  locale: ['overrideDefaultLocale'],
  theme: ['initialize', 'setThemeMode'],
  createPost: ['navigateToOctopusCreatePost'],
  initialScreen: ['openUI'],
  embeddedBack: ['OctopusUIView'],
  reactions: ['setReaction'],
  profileFieldsLock: ['debugOverrideProfileFieldsLock'],
  contentOptions: ['debugOverrideContentOptions'],
  termsAcceptance: ['debugOverrideTermsAcceptanceMode'],
  communityData: ['fetchCommunityData', 'startObservingCommunityData'],
  syncFollowGroups: ['syncFollowGroups'],
  lifecycle: ['switchCommunity'],
};

/**
 * Scenarios whose effect is visible in the community itself, and which therefore offer the
 * "Verify in Community" step of the shared detail skeleton.
 *
 * Not every scenario qualifies: a push replay or a custom event leaves nothing on screen to
 * look at, so offering the jump there would promise an observation that cannot be made.
 */
const VERIFIABLE_IN_COMMUNITY: ScenarioId[] = [
  'connection',
  'communityAccess',
  'locale',
  'theme',
  'createPost',
  'reactions',
  'profileFieldsLock',
  'contentOptions',
  'termsAcceptance',
  'syncFollowGroups',
  // A switch lands on a different community's feed — the Community tab is where that is
  // actually observable, and the only way to tell a successful switch from a claimed one.
  'lifecycle',
];

/** A collapsible group of the list — the shared six, in the shared order. */
interface ScenarioSection {
  id: string;
  title: string;
  scenarios: ScenarioId[];
}

/**
 * The six sections the shared design gives the list, in order.
 *
 * The grouping is the point: fifteen flat rows made a reader scan the whole list to find the
 * one capability they came for. These sections are also the list ORDER — every scenario
 * belongs to exactly one of them, and a scenario named in none would simply not be reachable,
 * so adding a scenario means adding it here too.
 */
const SCENARIO_SECTIONS: ScenarioSection[] = [
  {
    id: 'sso',
    title: 'SSO & user',
    scenarios: [
      'connection',
      'profileFieldsLock',
      'termsAcceptance',
      'communityData',
    ],
  },
  {
    id: 'community',
    title: 'Community & groups',
    scenarios: [
      'communityAccess',
      'createPost',
      'reactions',
      'contentOptions',
      'syncFollowGroups',
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    scenarios: ['notSeenNotifications', 'pushNotifications'],
  },
  {
    id: 'presentation',
    title: 'Presentation modes',
    scenarios: ['initialScreen', 'embeddedBack'],
  },
  {
    id: 'appearance',
    title: 'Theme & language',
    scenarios: ['theme', 'locale'],
  },
  {
    id: 'host',
    title: 'Host callbacks & events',
    scenarios: ['customEvents', 'lifecycle'],
  },
];

/**
 * Which sections are open, remembered across visits to the tab.
 *
 * Module-level on purpose: the screen unmounts every time QA leaves the tab, so component
 * state would re-collapse the section they were working in on every round trip to Community.
 * Nothing here is persisted to disk — remembering across a process restart would be
 * remembering a session that no longer exists.
 */
const DEFAULT_OPEN_SECTION_IDS: ReadonlySet<string> = new Set([
  'sso',
  'community',
]);

const expandedSections: Record<string, boolean> = Object.fromEntries(
  SCENARIO_SECTIONS.map((section) => [
    section.id,
    DEFAULT_OPEN_SECTION_IDS.has(section.id),
  ])
);

/**
 * The entitlement variants the Connection scenario walks, in preset order.
 *
 * The numbering is the shared cross-platform vocabulary from the catalog (1 = no
 * entitlements, 2 = Premium, 3 = Moderator, 4 = Premium + Moderator, 5 = disconnect) —
 * used below only to validate which `.env` tokens are present, not as UI presets anymore
 * (the Connection scenario's entitlements are now a `qa-param-connection-entitlements`
 * Set<String> field).
 */
const ENTITLEMENT_VARIANTS: EntitlementVariant[] = [
  'none',
  'premium',
  'moderator',
  'premiumModerator',
];

/**
 * Case-insensitive substring match over a scenario's title, its capability line AND its API
 * names; an empty query matches everything.
 *
 * The API names are in scope because that is how a host developer arrives: they read
 * `setReaction` in the documentation and want the scenario that calls it, not the scenario
 * whose title happens to contain the word "reaction".
 */
function matchesQuery(id: ScenarioId, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  const haystack = [
    SCENARIO_TITLES[id],
    SCENARIO_SUBTITLES[id],
    ...SCENARIO_APIS[id],
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

/**
 * Zone 4 of the shared detail skeleton — placed by each card immediately above its
 * `ScenarioRunButton` so it is never the last interactive control on screen, above the
 * anchored Run. Renders nothing for a scenario outside {@link VERIFIABLE_IN_COMMUNITY}: not
 * every scenario's effect is observable in the community, so offering the jump there would
 * promise a check that cannot be made.
 */
function VerifyInCommunityButton({
  id,
  isDark,
  onPress,
}: {
  id: ScenarioId;
  isDark: boolean;
  onPress: () => void;
}) {
  if (!VERIFIABLE_IN_COMMUNITY.includes(id)) return null;
  return (
    <PillButton
      testID="scenario-verify-in-community"
      label="Verify in Community"
      icon="forum"
      isDark={isDark}
      variant="secondary"
      onPress={onPress}
      style={styles.verifyButton}
    />
  );
}

/** The monospace API chips of a scenario — the row's and the detail's shared signature line. */
function ApiChips({
  id,
  chrome,
}: {
  id: ScenarioId;
  chrome: ReturnType<typeof chromeColors>;
}) {
  return (
    <View style={styles.apiChips}>
      {SCENARIO_APIS[id].map((api) => (
        <View
          key={api}
          style={[styles.apiChip, { backgroundColor: chrome.tint }]}
        >
          <Text style={[styles.apiChipText, { color: chrome.control }]}>
            {api}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * The body of one scenario, rendered only while that scenario is the open route.
 *
 * The `scenarios-<id>-card` handle the catalog names lives on the LIST row that opens this, not
 * here: the catalog reads "each scenario opens from the Scenarios tab via `scenarios-<id>-card`",
 * so the id has to be on the thing QA taps.
 */
function ScenarioCard({
  id,
  title,
  selected,
  cardBg,
  chrome,
  borderColor,
  textColor,
  children,
}: {
  id: ScenarioId;
  title: string;
  selected: ScenarioId | null;
  cardBg: string;
  chrome: ReturnType<typeof chromeColors>;
  borderColor: string;
  textColor: string;
  children: React.ReactNode;
}) {
  if (selected !== id) return null;
  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      {/* Zone 1 of the shared detail skeleton: what this calls, then what it does. Repeated
          from the list row on purpose — the row is gone by the time this is on screen. */}
      <Text style={[styles.cardTitle, { color: textColor }]}>{title}</Text>
      <ApiChips id={id} chrome={chrome} />
      <Text style={[styles.rowSubtitle, { color: chrome.textSecondary }]}>
        {SCENARIO_SUBTITLES[id]}
      </Text>
      {children}
    </View>
  );
}

/** One row of the scenario list — the handle QA taps to open a scenario. */
function ScenarioRow({
  id,
  onOpen,
  cardBg,
  chrome,
  borderColor,
  textColor,
  secondaryColor,
}: {
  id: ScenarioId;
  onOpen: (id: ScenarioId) => void;
  cardBg: string;
  chrome: ReturnType<typeof chromeColors>;
  borderColor: string;
  textColor: string;
  secondaryColor: string;
}) {
  return (
    <TouchableOpacity
      testID={`scenarios-${id}-card`}
      style={[styles.row, { backgroundColor: cardBg, borderColor }]}
      onPress={() => onOpen(id)}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <View style={styles.rowTextColumn}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          {SCENARIO_TITLES[id]}
        </Text>
        <Text style={[styles.rowSubtitle, { color: secondaryColor }]}>
          {SCENARIO_SUBTITLES[id]}
        </Text>
        <ApiChips id={id} chrome={chrome} />
      </View>
      <Text style={[styles.rowChevron, { color: secondaryColor }]}>›</Text>
    </TouchableOpacity>
  );
}

/**
 * Embedded-view initialScreen presets, previewed live inside the `initialScreen` scenario.
 * `enabled` is resolved from a *static* `process.env.X`: react-native-dotenv inlines those at
 * build time, so a computed lookup would read undefined.
 */
const EMBEDDED_INITIAL_SCREENS: {
  key: string;
  label: string;
  screen?: OctopusInitialScreen;
  enabled: boolean;
}[] = [
  { key: 'mainFeed', label: 'Main feed', enabled: true },
  {
    key: 'post',
    label: 'Post',
    screen: {
      type: 'post',
      postId: process.env.OCTOPUS_DEMO_POST_ID as string,
    },
    enabled: !!process.env.OCTOPUS_DEMO_POST_ID,
  },
  {
    key: 'activity',
    label: 'Member posts',
    screen: {
      type: 'activity',
      member: { clientUserId: process.env.OCTOPUS_SSO_USER_ID as string },
    },
    enabled: !!process.env.OCTOPUS_SSO_USER_ID,
  },
  {
    key: 'ownProfile',
    label: 'Own profile',
    screen: { type: 'profile' },
    enabled: true,
  },
  {
    key: 'createPost',
    label: 'Post editor',
    screen: { type: 'createPost' },
    enabled: true,
  },
];

/**
 * The leading-icon configurations the `embeddedBack` scenario mounts its embedded view with.
 *
 * The first three are the same assertion three ways: whichever icon the SDK's top app bar
 * ends up showing — the `showBackButton` arrow or either `navBarLeadingAction` override —
 * tapping it on the SDK's ROOT screen fires `onBackRequested` instead of doing nothing. The
 * fourth asserts the documented precedence between the two props: `navBarLeadingAction`
 * wins regardless of `showBackButton`, so this one must show a close icon, not an arrow.
 * The last is the negative control: no leading icon at all, so there is nothing to tap and
 * nothing must fire.
 *
 * Each entry carries the shared QA catalog's `qa-preset-embeddedBack-<n>` id verbatim, so the
 * chip that selects it is the handle the QA pipeline drives.
 */
const EMBEDDED_BACK_PRESETS: {
  key: string;
  label: string;
  testID: string;
  showBackButton: boolean;
  navBarLeadingAction?: OctopusNavBarLeadingAction;
}[] = [
  {
    key: 'backButton',
    label: 'Back arrow',
    testID: 'qa-preset-embeddedBack-1',
    showBackButton: true,
  },
  {
    key: 'leadingBack',
    label: "Leading 'back'",
    testID: 'qa-preset-embeddedBack-2',
    showBackButton: false,
    navBarLeadingAction: 'back',
  },
  {
    key: 'leadingClose',
    label: "Leading 'close'",
    testID: 'qa-preset-embeddedBack-3',
    showBackButton: false,
    navBarLeadingAction: 'close',
  },
  {
    key: 'backAndClose',
    label: "Back + leading 'close'",
    testID: 'qa-preset-embeddedBack-4',
    showBackButton: true,
    navBarLeadingAction: 'close',
  },
  {
    key: 'none',
    label: 'No leading icon',
    testID: 'qa-preset-embeddedBack-5',
    showBackButton: false,
  },
];

export interface ScenariosScreenProps {
  isDark: boolean;
  primaryColor: string;
  /**
   * The client user id the Config screen captured — the same one `connectUser` uses, so
   * the `communityData` presets look up the member the Connection presets create.
   */
  clientUserId: string;
  /** Whether the SDK runs in `sso` mode; `octopus` mode has no host user to connect. */
  isSsoAuth: boolean;
  /**
   * Switches to the Community tab — the "Verify in Community" step of the shared detail
   * skeleton, offered by the scenarios whose effect is visible there.
   */
  onVerifyInCommunity: () => void;
  /** Fed to the embedded preview's `OctopusUIView` — same flags the Community tab itself uses. */
  interceptUrls: boolean;
  interceptProfileTaps: boolean;

  // connection
  isMockUserConnected: boolean;
  isConnectingUser: boolean;
  /**
   * Connects the demo SSO user with the entitlements of the given variant, optionally
   * overriding the userId/nickname the form fields carry. Rejects on failure so
   * {@link useScenarioRun} reports it as the scenario's Result.
   */
  onConnectUser: (
    variant: EntitlementVariant,
    overrides?: { userId?: string; nickname?: string }
  ) => Promise<void>;
  onDisconnectUser: () => Promise<void>;
  /** Outcome of the last connectUser attempt made from this screen, if it failed. */
  connectionError: string | null;

  // communityAccess
  hasAccessToCommunity: boolean | null;

  // pushNotifications
  pushToken: string | null;

  // notSeenNotifications
  notSeenNotificationsCount: number;
  onRefreshNotifications: () => Promise<void>;

  // locale
  communityLocaleOverride: CommunityLocaleOverride;
  onCommunityLocaleOverrideChange: (
    mode: CommunityLocaleOverride
  ) => Promise<void>;
  /** Outcome of the last locale override change, if it failed. */
  localeOverrideError: string | null;

  // theme — the presets below plus the folded-in Theme panel
  onPrimaryColor: string;
  themeMode: ThemeMode | null;
  onThemeModeChange: (mode: ThemeMode) => void;
  themeSet: ThemeSet;
  onThemeSetChange: (value: ThemeSet) => void;
  fontType: FontType;
  onFontTypeChange: (value: FontType) => void;
  logoMode: LogoMode;
  onLogoModeChange: (value: LogoMode) => void;
  fontSizeMode: FontSizeMode;
  onFontSizeModeChange: (value: FontSizeMode) => void;
  bottomInsetPreset: BottomInsetPreset;
  onBottomInsetPresetChange: (value: BottomInsetPreset) => void;
  linkBackgroundMode: LinkBackgroundMode;
  onLinkBackgroundModeChange: (value: LinkBackgroundMode) => void;
  fontOverrideMode: FontOverrideMode;
  onFontOverrideModeChange: (value: FontOverrideMode) => void;

  // lifecycle
  /**
   * Re-targets the SDK at another community. Rejects on failure so {@link useScenarioRun}
   * reports it as the scenario's Result.
   */
  onSwitchCommunity: (target: SwitchCommunityTarget) => Promise<void>;
  /** The community the SDK is on right now — the scenario's standing live state. */
  activeCommunityLabel: string;
  /**
   * The named slot that community came from, or `null` when the key was pasted (on the
   * Config screen or into this scenario's own fallback field). The slot it names is the one
   * preset that cannot be switched to, since the SDK is already on it.
   */
  activeApiKeyId: string | null;
  /**
   * The pasted key currently in force, or `null` when the active community came from a named
   * slot instead. Guards the free-text switch field the same way `activeApiKeyId` guards the
   * slot chips — pasting back the key already in force must not offer a switch to itself.
   */
  activeCustomApiKey: string | null;
  /** Bumped by every switch — keys the embedded preview, which the switch invalidated. */
  communitySessionNonce: number;
}

/**
 * Scenarios tab: the searchable index of the SDK capabilities the example exercises,
 * and the per-scenario pages behind it. Each page carries that capability's single-tap
 * QA presets, its result panel, and its free-form controls (theming, batch group sync,
 * custom events, push token) — which is why the example has no separate Theme, SDK Data
 * or Groups tab: a capability is documented, driven and asserted in one place.
 *
 * Each card mirrors one entry of the shared scenarios catalog (kept in the internal QA
 * tooling's shared config) — its preset `testID`s and result panel `testID` are copied
 * verbatim from there for the cross-platform QA gate.
 */
export function ScenariosScreen({
  isDark,
  primaryColor,
  clientUserId,
  isSsoAuth,
  onVerifyInCommunity,
  interceptUrls,
  interceptProfileTaps,
  isMockUserConnected,
  isConnectingUser,
  onConnectUser,
  onDisconnectUser,
  hasAccessToCommunity,
  pushToken,
  notSeenNotificationsCount,
  onRefreshNotifications,
  communityLocaleOverride,
  onCommunityLocaleOverrideChange,
  localeOverrideError,
  onPrimaryColor,
  themeMode,
  onThemeModeChange,
  themeSet,
  onThemeSetChange,
  fontType,
  onFontTypeChange,
  logoMode,
  onLogoModeChange,
  fontSizeMode,
  onFontSizeModeChange,
  bottomInsetPreset,
  onBottomInsetPresetChange,
  linkBackgroundMode,
  onLinkBackgroundModeChange,
  fontOverrideMode,
  onFontOverrideModeChange,
  onSwitchCommunity,
  activeCommunityLabel,
  activeApiKeyId,
  activeCustomApiKey,
  communitySessionNonce,
}: ScenariosScreenProps) {
  const chrome = chromeColors(isDark);
  const textColor = chrome.text;
  const secondaryColor = chrome.textSecondary;
  const cardBg = chrome.surface;
  const borderColor = chrome.border;

  // Which scenario is open; `null` is the searchable list.
  const [selected, setSelected] = useState<ScenarioId | null>(null);

  /** Entitlement variants this build has no token for — their presets are disabled. */
  const missingEntitlementVariants = ENTITLEMENT_VARIANTS.filter(
    (variant) => !hasUserToken(variant)
  );
  /** No variant has a token, so no preset on this scenario can run. */
  const hasNoUserToken =
    missingEntitlementVariants.length === ENTITLEMENT_VARIANTS.length;

  // --- connection -------------------------------------------------------------------------
  const [connectionRunState, runConnection] = useScenarioRun('connection');
  const [connectionUserId, setConnectionUserId] = useState(
    () => clientUserId || 'demo-user-42'
  );
  const [connectionNickname, setConnectionNickname] = useState('Jordan D.');
  // Only two of the four token variants are individually selectable entitlements — `none`
  // and `premiumModerator` are the empty/full combination of these two, not choices of
  // their own — so the field toggles exactly the entitlements that exist.
  const [connectionEntitlements, setConnectionEntitlements] = useState<
    ReadonlySet<'premium' | 'moderator'>
  >(
    () =>
      new Set(
        (['premium', 'moderator'] as const).filter((variant) =>
          hasUserToken(variant)
        )
      )
  );
  const toggleConnectionEntitlement = useCallback(
    (key: string) =>
      setConnectionEntitlements((prev) => {
        const next = new Set(prev);
        if (next.has(key as 'premium' | 'moderator')) {
          next.delete(key as 'premium' | 'moderator');
        } else {
          next.add(key as 'premium' | 'moderator');
        }
        return next;
      }),
    []
  );
  const connectionVariant: EntitlementVariant =
    connectionEntitlements.has('premium') &&
    connectionEntitlements.has('moderator')
      ? 'premiumModerator'
      : connectionEntitlements.has('premium')
        ? 'premium'
        : connectionEntitlements.has('moderator')
          ? 'moderator'
          : 'none';
  // The scenario's single Run button carries whichever catalog `qa-preset-connection-<n>`
  // id the current entitlements selection (and connect/disconnect state) will actually run —
  // the shared QA catalog has no dedicated control per combination, so the id follows the
  // button rather than a chip.
  const connectionPresetTestID = isMockUserConnected
    ? 'qa-preset-connection-5'
    : connectionVariant === 'premiumModerator'
      ? 'qa-preset-connection-4'
      : connectionVariant === 'moderator'
        ? 'qa-preset-connection-3'
        : connectionVariant === 'premium'
          ? 'qa-preset-connection-2'
          : 'qa-preset-connection-1';
  const onRunConnection = useCallback(() => {
    if (isMockUserConnected) {
      return runConnection(() => onDisconnectUser(), 'Disconnected');
    }
    return runConnection(
      () =>
        onConnectUser(connectionVariant, {
          userId: connectionUserId,
          nickname: connectionNickname,
        }),
      `Connected (${ENTITLEMENT_LABELS[connectionVariant]})`
    );
  }, [
    isMockUserConnected,
    runConnection,
    onDisconnectUser,
    onConnectUser,
    connectionVariant,
    connectionUserId,
    connectionNickname,
  ]);
  // --- communityAccess ------------------------------------------------------------------
  const [communityAccessRunState, runCommunityAccessPreset] =
    useScenarioRun('communityAccess');

  const onGrantAccessPreset = useCallback(
    () =>
      runCommunityAccessPreset(
        () => overrideCommunityAccess(true),
        'Override applied: access granted'
      ),
    [runCommunityAccessPreset]
  );
  const onDenyAccessPreset = useCallback(
    () =>
      runCommunityAccessPreset(
        () => overrideCommunityAccess(false),
        'Override applied: access denied'
      ),
    [runCommunityAccessPreset]
  );
  const onTrackHasAccessPreset = useCallback(
    () =>
      runCommunityAccessPreset(
        () => trackCommunityAccess(true),
        'Tracked: has access (analytics only)'
      ),
    [runCommunityAccessPreset]
  );
  const onTrackNoAccessPreset = useCallback(
    () =>
      runCommunityAccessPreset(
        () => trackCommunityAccess(false),
        'Tracked: no access (analytics only)'
      ),
    [runCommunityAccessPreset]
  );

  const accessLabel =
    hasAccessToCommunity === null ? '—' : hasAccessToCommunity ? 'Yes' : 'No';
  const communityAccessInfo = `Has access to community (Octopus-managed): ${accessLabel}`;

  type CommunityAccessAction = 'grant' | 'deny' | 'track' | 'trackNone';
  const [communityAccessAction, setCommunityAccessAction] =
    useState<CommunityAccessAction>('grant');
  const onRunCommunityAccess = useCallback(() => {
    if (communityAccessAction === 'grant') return onGrantAccessPreset();
    if (communityAccessAction === 'deny') return onDenyAccessPreset();
    if (communityAccessAction === 'track') return onTrackHasAccessPreset();
    return onTrackNoAccessPreset();
  }, [
    communityAccessAction,
    onGrantAccessPreset,
    onDenyAccessPreset,
    onTrackHasAccessPreset,
    onTrackNoAccessPreset,
  ]);

  // --- notSeenNotifications --------------------------------------------------------------
  const [notSeenNotificationsRunState, runNotSeenNotificationsPreset] =
    useScenarioRun('notSeenNotifications');

  const onOpenOctopusPreset = useCallback(
    () =>
      runNotSeenNotificationsPreset(openUI, 'Opened Octopus (full-page route)'),
    [runNotSeenNotificationsPreset]
  );

  type NotSeenNotificationsAction = 'open' | 'refresh';
  const [notSeenNotificationsAction, setNotSeenNotificationsAction] =
    useState<NotSeenNotificationsAction>('refresh');
  const onRunNotSeenNotifications = useCallback(() => {
    if (notSeenNotificationsAction === 'open') return onOpenOctopusPreset();
    return runNotSeenNotificationsPreset(
      onRefreshNotifications,
      'Not-seen count refreshed'
    );
  }, [
    notSeenNotificationsAction,
    onOpenOctopusPreset,
    runNotSeenNotificationsPreset,
    onRefreshNotifications,
  ]);

  const notSeenNotificationsInfo = [
    `Not-seen notifications count: ${notSeenNotificationsCount}`,
    hasAccessToCommunity === false
      ? 'The SDK stops streaming the count for a user without community access — expect it to stay at 0.'
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  // --- pushNotifications ------------------------------------------------------------------
  const [pushNotificationsRunState, runPushNotificationsPreset] =
    useScenarioRun('pushNotifications');

  const onReplaySampleNotificationPreset = useCallback(
    () =>
      runPushNotificationsPreset(
        async () => {
          if (!isOctopusNotification(SAMPLE_NOTIFICATION_PAYLOAD)) {
            throw new Error(
              'Sample payload is not recognized as an Octopus notification'
            );
          }
          const notification = getOctopusNotification(
            SAMPLE_NOTIFICATION_PAYLOAD
          );
          if (!notification) {
            throw new Error(
              'Sample payload could not be parsed (missing link_path)'
            );
          }
          await openNotification(notification);
          return notification;
        },
        (notification) => `Opened deep link: ${notification.linkPath}`
      ),
    [runPushNotificationsPreset]
  );

  // --- customEvents -----------------------------------------------------------------------
  const [customEventsRunState, runCustomEventPreset] =
    useScenarioRun('customEvents');

  const onTrackSampleEventPreset = useCallback(
    () =>
      runCustomEventPreset(
        () => trackCustomEvent('sample_event', undefined),
        'Tracked "sample_event" (no props)'
      ),
    [runCustomEventPreset]
  );
  const onTrackSampleEventWithPropsPreset = useCallback(
    () =>
      runCustomEventPreset(
        () => trackCustomEvent('sample_event', SAMPLE_CUSTOM_EVENT_PROPERTIES),
        'Tracked "sample_event" (with props)'
      ),
    [runCustomEventPreset]
  );
  const [customEventIncludeProps, setCustomEventIncludeProps] = useState<
    ReadonlySet<'properties'>
  >(new Set());
  const toggleCustomEventIncludeProps = useCallback(
    () =>
      setCustomEventIncludeProps((prev) =>
        prev.has('properties') ? new Set() : new Set(['properties'])
      ),
    []
  );
  const onRunCustomEvent = useCallback(
    () =>
      customEventIncludeProps.has('properties')
        ? onTrackSampleEventWithPropsPreset()
        : onTrackSampleEventPreset(),
    [
      customEventIncludeProps,
      onTrackSampleEventWithPropsPreset,
      onTrackSampleEventPreset,
    ]
  );
  // The Properties toggle picks which of the catalog's two presets the Run button executes.
  const customEventsPresetTestID = customEventIncludeProps.has('properties')
    ? 'qa-preset-customEvents-2'
    : 'qa-preset-customEvents-1';

  // The panel's free-text form is a third way to call `trackCustomEvent`, routed through the
  // same `useScenarioRun` as the two presets above so the scenario has a single Result surface
  // instead of the panel keeping its own success/error line alongside it. Resolves to whether
  // the call actually went through — `trackCustomEvent` itself resolves to `void`, which
  // wouldn't tell the panel apart from the error branch (also `undefined`).
  const onSendCustomEvent = useCallback(
    (eventName: string, properties?: Record<string, string>) =>
      runCustomEventPreset(
        async () => {
          await trackCustomEvent(eventName, properties);
          return true as const;
        },
        `Tracked "${eventName}"${properties ? ` ${JSON.stringify(properties)}` : ' (no properties)'}`
      ),
    [runCustomEventPreset]
  );

  // --- locale -------------------------------------------------------------------------------
  const [localeRunState, runLocale] = useScenarioRun('locale');
  const [localeSelection, setLocaleSelection] =
    useState<CommunityLocaleOverride>(communityLocaleOverride);
  const onRunLocale = useCallback(
    () =>
      runLocale(
        () => onCommunityLocaleOverrideChange(localeSelection),
        `Locale override: ${
          localeSelection === 'system' ? 'system default' : localeSelection
        }`
      ),
    [runLocale, onCommunityLocaleOverrideChange, localeSelection]
  );
  const localeResultText = [
    `Community locale override: ${
      communityLocaleOverride === 'system'
        ? 'system default'
        : communityLocaleOverride
    }`,
    localeOverrideError ? `✕ ${localeOverrideError}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  // --- connection ---------------------------------------------------------------------------
  // Standing status only — the Result panel below now carries the outcome (success/error +
  // duration) of the last Run, so this line no longer repeats `connectionError`.
  const connectionResultText = !isSsoAuth
    ? 'The SDK runs in octopus mode — the SDK owns the login, so there is no host user to connect'
    : hasNoUserToken
      ? `No SSO token injected — set ${USER_TOKEN_ENV_VARS.none} in .env, see the example README`
      : isConnectingUser
        ? 'Connecting…'
        : isMockUserConnected
          ? 'Connected'
          : 'Disconnected';

  // --- theme ----------------------------------------------------------------------------------
  const onDefaultThemePreset = useCallback(() => {
    onThemeSetChange('none');
    onFontTypeChange('default');
    onFontSizeModeChange('default');
    onLogoModeChange('disabled');
  }, [
    onThemeSetChange,
    onFontTypeChange,
    onFontSizeModeChange,
    onLogoModeChange,
  ]);

  const onCustomThemePreset = useCallback(() => {
    onThemeSetChange('theme1');
    onFontTypeChange('default');
    onFontSizeModeChange('default');
    onLogoModeChange('enabled');
  }, [
    onThemeSetChange,
    onFontTypeChange,
    onFontSizeModeChange,
    onLogoModeChange,
  ]);

  const themeResultText = `Color set: ${themeSet} · Font: ${fontType}/${fontSizeMode} · Logo: ${logoMode}`;

  const [themeRunState, runTheme] = useScenarioRun('theme');
  const [themeSelection, setThemeSelection] = useState<'default' | 'custom'>(
    'default'
  );
  const onRunTheme = useCallback(
    () =>
      runTheme(
        async () => {
          if (themeSelection === 'default') {
            onDefaultThemePreset();
          } else {
            onCustomThemePreset();
          }
        },
        themeSelection === 'default'
          ? 'Applied default theme'
          : 'Applied custom theme (brand colors + logo)'
      ),
    [runTheme, themeSelection, onDefaultThemePreset, onCustomThemePreset]
  );

  // --- createPost -----------------------------------------------------------------------------
  const [createPostRunState, runCreatePost] = useScenarioRun('createPost');

  const runCreatePostPreset = useCallback(
    (prefilledPost: Parameters<typeof navigateToOctopusCreatePost>[0]) =>
      runCreatePost(async () => {
        try {
          await navigateToOctopusCreatePost(prefilledPost);
        } catch (e) {
          const message = isNavigateToOctopusCreatePostError(e)
            ? `${e.code}: ${e.message}`
            : e instanceof Error
              ? e.message
              : String(e);
          throw new Error(message);
        }
      }, 'Opened the create-post editor'),
    [runCreatePost]
  );

  const [createPostText, setCreatePostText] = useState(
    'QA scenario — text post'
  );
  const [createPostAttachments, setCreatePostAttachments] = useState<
    ReadonlySet<'cta' | 'image'>
  >(new Set());
  const toggleCreatePostAttachment = useCallback(
    (key: string) =>
      setCreatePostAttachments((prev) => {
        const next = new Set(prev);
        if (next.has(key as 'cta' | 'image')) {
          next.delete(key as 'cta' | 'image');
        } else {
          next.add(key as 'cta' | 'image');
        }
        return next;
      }),
    []
  );
  const onRunCreatePost = useCallback(() => {
    const text = createPostText.trim();
    return runCreatePostPreset({
      text: text === '' ? undefined : text,
      imageUri: createPostAttachments.has('image')
        ? BUNDLED_SAMPLE_IMAGE_NAME
        : undefined,
      cta: createPostAttachments.has('cta')
        ? { url: 'https://example.com', label: 'Learn more' }
        : undefined,
    });
  }, [createPostText, createPostAttachments, runCreatePostPreset]);
  // The Run button carries whichever catalog preset the current text + attachments
  // combination matches. Combinations the catalog doesn't name (e.g. no text and no
  // attachments) fall back to the scenario's generic run id.
  const createPostPresetTestID = (() => {
    const hasText = createPostText.trim() !== '';
    const hasCta = createPostAttachments.has('cta');
    const hasImage = createPostAttachments.has('image');
    if (hasText && !hasCta && !hasImage) return 'qa-preset-createPost-1';
    if (hasText && hasCta && !hasImage) return 'qa-preset-createPost-2';
    if (hasText && !hasCta && hasImage) return 'qa-preset-createPost-3';
    if (hasText && hasCta && hasImage) return 'qa-preset-createPost-4';
    if (!hasText && !hasCta && hasImage) return 'qa-preset-createPost-5';
    return 'qa-run-createPost';
  })();

  // --- initialScreen --------------------------------------------------------------------------
  const [initialScreenRunState, runInitialScreen] =
    useScenarioRun('initialScreen');

  // Embedded-preview initial screen. `initialScreen` is read on mount only, so switching preset
  // has to remount the native view — see the `key` prop on the `OctopusUIView` below.
  const [embeddedScreenKey, setEmbeddedScreenKey] = useState('mainFeed');

  const runInitialScreenPreset = useCallback(
    (screen: OctopusInitialScreen, successMessage: string) =>
      runInitialScreen(() => openUI({ initialScreen: screen }), successMessage),
    [runInitialScreen]
  );

  const onInitialScreenMainFeedPreset = useCallback(
    () =>
      runInitialScreenPreset({ type: 'mainFeed' }, 'Opened on the main feed'),
    [runInitialScreenPreset]
  );
  const onInitialScreenPostPreset = useCallback(
    () =>
      runInitialScreenPreset(
        { type: 'post', postId: process.env.OCTOPUS_DEMO_POST_ID as string },
        'Opened on the demo post'
      ),
    [runInitialScreenPreset]
  );
  const onInitialScreenGroupPreset = useCallback(
    () =>
      runInitialScreenPreset(
        { type: 'group', groupId: SAMPLE_GROUP_IDS[0] as string },
        `Opened on group ${SAMPLE_GROUP_IDS[0]}`
      ),
    [runInitialScreenPreset]
  );
  const onInitialScreenActivityByClientUserIdPreset = useCallback(
    () =>
      runInitialScreenPreset(
        {
          type: 'activity',
          member: { clientUserId },
        },
        "Opened the SSO member's posts (by clientUserId)"
      ),
    [runInitialScreenPreset, clientUserId]
  );
  // Resolves the SSO member's Octopus profile id first — the way a host holding only an
  // Octopus id (e.g. from fetchCommunityData) would open the activity screen.
  const onInitialScreenActivityByProfileIdPreset = useCallback(
    () =>
      runInitialScreen(
        async () => {
          const data = await fetchCommunityData({ clientUserId });
          if (!data) {
            throw new Error(
              'No community data for the SSO member — connect first'
            );
          }
          await openUI({
            initialScreen: {
              type: 'activity',
              member: { profileId: data.profileId },
            },
          });
          return data;
        },
        (data) => `Opened the member's posts (by profileId ${data.profileId})`
      ),
    [runInitialScreen, clientUserId]
  );
  const onInitialScreenProfilePreset = useCallback(
    () =>
      runInitialScreenPreset(
        { type: 'profile', clientUserId },
        "Opened the SSO member's profile"
      ),
    [runInitialScreenPreset, clientUserId]
  );
  const onInitialScreenOwnProfilePreset = useCallback(
    () =>
      runInitialScreenPreset(
        { type: 'profile' },
        "Opened the connected user's own profile"
      ),
    [runInitialScreenPreset]
  );

  type InitialScreenSelection =
    | 'mainFeed'
    | 'post'
    | 'group'
    | 'activityByClientUserId'
    | 'activityByProfileId'
    | 'profileByClientUserId'
    | 'ownProfile';
  const [initialScreenSelection, setInitialScreenSelection] =
    useState<InitialScreenSelection>('mainFeed');
  const onRunInitialScreen = useCallback(() => {
    switch (initialScreenSelection) {
      case 'post':
        return onInitialScreenPostPreset();
      case 'group':
        return onInitialScreenGroupPreset();
      case 'activityByClientUserId':
        return onInitialScreenActivityByClientUserIdPreset();
      case 'activityByProfileId':
        return onInitialScreenActivityByProfileIdPreset();
      case 'profileByClientUserId':
        return onInitialScreenProfilePreset();
      case 'ownProfile':
        return onInitialScreenOwnProfilePreset();
      case 'mainFeed':
      default:
        return onInitialScreenMainFeedPreset();
    }
  }, [
    initialScreenSelection,
    onInitialScreenMainFeedPreset,
    onInitialScreenPostPreset,
    onInitialScreenGroupPreset,
    onInitialScreenActivityByClientUserIdPreset,
    onInitialScreenActivityByProfileIdPreset,
    onInitialScreenProfilePreset,
    onInitialScreenOwnProfilePreset,
  ]);

  // --- embeddedBack -----------------------------------------------------------------------
  const [embeddedBackRunState, runEmbeddedBack] =
    useScenarioRun('embeddedBack');
  const [embeddedBackPresetKey, setEmbeddedBackPresetKey] =
    useState('backButton');
  const embeddedBackPreset =
    EMBEDDED_BACK_PRESETS.find(
      (preset) => preset.key === embeddedBackPresetKey
    ) ?? EMBEDDED_BACK_PRESETS[0]!;
  // The scenario's own host route: the sample's whole content area, holding nothing but its own
  // thin band and the embedded view. Run opens it, `onBackRequested` closes it — which is what
  // makes the callback observable at all, since the prop's whole contract is "the host dismisses
  // its own container". Like the `clientProfileView` route it is modelled on, it replaces the
  // content below the app's chrome, not the chrome itself: the tab bar stays reachable.
  const [isEmbeddedBackRouteOpen, setIsEmbeddedBackRouteOpen] = useState(false);
  // Whether the SDK called back during the run that is on screen. Reset by every Run, so the
  // Result panel describes this trial rather than an earlier one.
  const [hasEmbeddedBackFired, setHasEmbeddedBackFired] = useState(false);

  // The success sentence reports what the run did, not what to do next: it is only legible once
  // the route has closed, i.e. once tapping the icon is no longer possible. The live instruction
  // is on the band inside the route, and the verdict is in `embeddedBackInfo` below.
  const onRunEmbeddedBack = useCallback(
    () =>
      runEmbeddedBack(async () => {
        setHasEmbeddedBackFired(false);
        setIsEmbeddedBackRouteOpen(true);
      }, 'Host route opened with the selected leading icon'),
    [runEmbeddedBack]
  );

  /**
   * The prop under test. Popping the host route here is the visible effect QA reads: the
   * scenario detail comes back on screen, and the Result panel says the callback fired.
   */
  const onEmbeddedBackRequested = useCallback(() => {
    setHasEmbeddedBackFired(true);
    setIsEmbeddedBackRouteOpen(false);
    debugLog.event(
      'onBackRequested',
      'embedded root back tap — host route popped'
    );
  }, []);

  /** The band's own way out, used when the SDK's icon does NOT bring the tester back. */
  const onCloseEmbeddedBackRoute = useCallback(
    () => setIsEmbeddedBackRouteOpen(false),
    []
  );

  // `info` renders in the idle state too, so the pre-run sentence must not read as a verdict on
  // a run that has not happened yet.
  const embeddedBackInfo = hasEmbeddedBackFired
    ? 'onBackRequested fired — the SDK’s leading icon popped the host route.'
    : embeddedBackRunState.status === 'idle'
      ? 'Run to open the host route, then tap the leading icon on the SDK’s root screen.'
      : 'onBackRequested: not fired since the last run.';

  // --- reactions --------------------------------------------------------------------------
  const hasDemoPostId = octopusDemoPostId !== '';
  const [reactionsRunState, runReaction] = useScenarioRun('reactions');

  const runReactionPreset = useCallback(
    (reaction: OctopusReactionKind | null, successMessage: string) =>
      runReaction(async () => {
        try {
          await setReaction(octopusDemoPostId, reaction);
        } catch (e) {
          const message = isSetReactionError(e)
            ? `${e.code}: ${e.message}`
            : e instanceof Error
              ? e.message
              : String(e);
          throw new Error(message);
        }
      }, successMessage),
    [runReaction]
  );

  const [reactionSelection, setReactionSelection] = useState('heart');
  const onRunReaction = useCallback(
    () =>
      runReactionPreset(
        reactionSelection === 'none'
          ? null
          : (reactionSelection as OctopusReactionKind),
        reactionSelection === 'none'
          ? 'Reaction removed'
          : `Reacted ${REACTION_LABELS[reactionSelection]}`
      ),
    [runReactionPreset, reactionSelection]
  );

  const reactionsInfo = !hasDemoPostId
    ? 'Set OCTOPUS_DEMO_POST_ID in .env to run these presets — see the example README'
    : undefined;

  // --- profileFieldsLock ----------------------------------------------------------------------
  const [profileFieldsLockRunState, runProfileFieldsLock] =
    useScenarioRun('profileFieldsLock');

  const runProfileFieldsLockPreset = useCallback(
    (lock: ProfileFieldsLock | null, successMessage: string) =>
      runProfileFieldsLock(
        () => debugOverrideProfileFieldsLock(lock),
        successMessage
      ),
    [runProfileFieldsLock]
  );
  type FieldLockMode = 'editable' | 'readOnly' | 'disabled';
  const [nicknameLock, setNicknameLock] = useState<FieldLockMode>('editable');
  const [avatarLock, setAvatarLock] = useState<FieldLockMode>('editable');
  const [bioLock, setBioLock] = useState<FieldLockMode>('editable');
  const [clearProfileFieldsLock, setClearProfileFieldsLock] = useState<
    ReadonlySet<'clear'>
  >(new Set());
  const toggleClearProfileFieldsLock = useCallback(
    () =>
      setClearProfileFieldsLock((prev) =>
        prev.has('clear') ? new Set() : new Set(['clear'])
      ),
    []
  );
  const onRunProfileFieldsLock = useCallback(() => {
    if (clearProfileFieldsLock.has('clear')) {
      return runProfileFieldsLockPreset(null, 'Override cleared');
    }
    return runProfileFieldsLockPreset(
      { nickname: nicknameLock, avatar: avatarLock, bio: bioLock },
      'Override applied'
    );
  }, [
    clearProfileFieldsLock,
    nicknameLock,
    avatarLock,
    bioLock,
    runProfileFieldsLockPreset,
  ]);
  // The clear toggle carries its own preset id (on its chip); the three named combinations of
  // per-field locks carry theirs on the Run button. An unlisted combination falls back to the
  // scenario's generic run id.
  const profileFieldsLockPresetTestID =
    nicknameLock === 'editable' &&
    avatarLock === 'editable' &&
    bioLock === 'editable'
      ? 'qa-preset-profileFieldsLock-1'
      : nicknameLock === 'readOnly' &&
          avatarLock === 'readOnly' &&
          bioLock === 'disabled'
        ? 'qa-preset-profileFieldsLock-2'
        : nicknameLock === 'disabled' &&
            avatarLock === 'disabled' &&
            bioLock === 'editable'
          ? 'qa-preset-profileFieldsLock-3'
          : 'qa-run-profileFieldsLock';

  // --- contentOptions -------------------------------------------------------------------------
  const [contentOptionsRunState, runContentOptions] =
    useScenarioRun('contentOptions');

  const runContentOptionsPreset = useCallback(
    (options: ContentOptions | null, successMessage: string) =>
      runContentOptions(
        () => debugOverrideContentOptions(options),
        successMessage
      ),
    [runContentOptions]
  );
  const [postDisabled, setPostDisabled] = useState<
    ReadonlySet<'pictures' | 'polls'>
  >(new Set());
  const [commentDisabled, setCommentDisabled] = useState<
    ReadonlySet<'pictures'>
  >(new Set());
  const [replyDisabled, setReplyDisabled] = useState<ReadonlySet<'pictures'>>(
    new Set()
  );
  const [clearContentOptions, setClearContentOptions] = useState<
    ReadonlySet<'clear'>
  >(new Set());
  const toggleContentOptionsFlag =
    <T extends string>(setter: Dispatch<SetStateAction<ReadonlySet<T>>>) =>
    (key: string) =>
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(key as T)) {
          next.delete(key as T);
        } else {
          next.add(key as T);
        }
        return next;
      });
  const toggleClearContentOptions = useCallback(
    () =>
      setClearContentOptions((prev) =>
        prev.has('clear') ? new Set() : new Set(['clear'])
      ),
    []
  );
  const onRunContentOptions = useCallback(() => {
    if (clearContentOptions.has('clear')) {
      return runContentOptionsPreset(null, 'Override cleared');
    }
    return runContentOptionsPreset(
      {
        post: {
          enablePictures: !postDisabled.has('pictures'),
          enablePolls: !postDisabled.has('polls'),
        },
        comment: { enablePictures: !commentDisabled.has('pictures') },
        reply: { enablePictures: !replyDisabled.has('pictures') },
      },
      'Override applied'
    );
  }, [
    clearContentOptions,
    postDisabled,
    commentDisabled,
    replyDisabled,
    runContentOptionsPreset,
  ]);
  // The clear toggle carries its own preset id (on its chip); the six named disabled-flag
  // combinations carry theirs on the Run button. An unlisted combination (or clear toggled
  // together with other flags) falls back to the scenario's generic run id.
  const contentOptionsPresetTestID = (() => {
    if (clearContentOptions.has('clear')) return 'qa-run-contentOptions';
    const postPictures = postDisabled.has('pictures');
    const postPolls = postDisabled.has('polls');
    const commentPictures = commentDisabled.has('pictures');
    const replyPictures = replyDisabled.has('pictures');
    if (!postPictures && !postPolls && !commentPictures && !replyPictures) {
      return 'qa-preset-contentOptions-1';
    }
    if (postPictures && !postPolls && !commentPictures && !replyPictures) {
      return 'qa-preset-contentOptions-2';
    }
    if (!postPictures && postPolls && !commentPictures && !replyPictures) {
      return 'qa-preset-contentOptions-3';
    }
    if (postPictures && postPolls && !commentPictures && !replyPictures) {
      return 'qa-preset-contentOptions-4';
    }
    if (!postPictures && !postPolls && commentPictures && !replyPictures) {
      return 'qa-preset-contentOptions-5';
    }
    if (!postPictures && !postPolls && !commentPictures && replyPictures) {
      return 'qa-preset-contentOptions-6';
    }
    return 'qa-run-contentOptions';
  })();

  // --- termsAcceptance ------------------------------------------------------------------------
  const [termsAcceptanceRunState, runTermsAcceptance] =
    useScenarioRun('termsAcceptance');

  const runTermsAcceptancePreset = useCallback(
    (mode: TermsAcceptanceMode | null, successMessage: string) =>
      runTermsAcceptance(
        () => debugOverrideTermsAcceptanceMode(mode),
        successMessage
      ),
    [runTermsAcceptance]
  );
  const [termsAcceptanceMode, setTermsAcceptanceMode] =
    useState<TermsAcceptanceMode>('implicit');
  const [clearTermsAcceptance, setClearTermsAcceptance] = useState<
    ReadonlySet<'clear'>
  >(new Set());
  const toggleClearTermsAcceptance = useCallback(
    () =>
      setClearTermsAcceptance((prev) =>
        prev.has('clear') ? new Set() : new Set(['clear'])
      ),
    []
  );
  const onRunTermsAcceptance = useCallback(() => {
    if (clearTermsAcceptance.has('clear')) {
      return runTermsAcceptancePreset(null, 'Override cleared');
    }
    return runTermsAcceptancePreset(
      termsAcceptanceMode,
      `Override applied: ${termsAcceptanceMode}`
    );
  }, [clearTermsAcceptance, termsAcceptanceMode, runTermsAcceptancePreset]);

  // --- communityData --------------------------------------------------------------------------
  const [communityDataRunState, runCommunityData] =
    useScenarioRun('communityData');
  const [lastProfileId, setLastProfileId] = useState<string | null>(null);
  const [isObserving, setIsObserving] = useState(false);
  const [observedCommunityData, setObservedCommunityData] =
    useState<OctopusCommunityData | null>(null);
  const [hasObservedUpdate, setHasObservedUpdate] = useState(false);
  const [query, setQuery] = useState('');
  // Seeded from the module-level record so the collapse state survives leaving the tab; the
  // state itself only exists to re-render on a toggle.
  const [sectionOpen, setSectionOpen] =
    useState<Record<string, boolean>>(expandedSections);
  const toggleSection = useCallback((sectionId: string) => {
    expandedSections[sectionId] = expandedSections[sectionId] === false;
    setSectionOpen({ ...expandedSections });
  }, []);
  const [clientProfileView, setClientProfileView] =
    useState<ClientProfileView>(null);

  useEffect(() => {
    const subscription = addCommunityDataListener((data) => {
      setObservedCommunityData(data);
      setHasObservedUpdate(true);
    });
    return () => subscription.remove();
  }, []);

  // Preset 1: fetch by clientUserId. The connected SSO test user's own id doubles as a
  // guaranteed-to-exist clientUserId fixture for this preset, so no extra env var is needed
  // beyond the ones the "Connection" card already requires.
  const onFetchByClientUserIdPreset = useCallback(
    () =>
      runCommunityData(
        () => fetchCommunityData({ clientUserId }),
        (data) => {
          if (data) {
            setLastProfileId(data.profileId);
            return `Found — profileId=${data.profileId}, messageCount=${data.messageCount ?? '—'}`;
          }
          return 'No community data for this clientUserId (unknown member)';
        }
      ),
    [runCommunityData, clientUserId]
  );

  // Preset 2: fetch by profileId, reusing the id resolved by the last successful lookup.
  const onFetchByProfileIdPreset = useCallback(() => {
    if (!lastProfileId) return undefined;
    return runCommunityData(
      () => fetchCommunityData({ profileId: lastProfileId }),
      (data) =>
        data
          ? `Found — profileId=${data.profileId}, messageCount=${data.messageCount ?? '—'}`
          : 'No community data for this profileId (unknown member)'
    );
  }, [runCommunityData, lastProfileId]);

  // Preset 3: start observing by clientUserId. Updates surface through the listener wired
  // above (observedCommunityData / hasObservedUpdate).
  const onStartObservingPreset = useCallback(() => {
    setHasObservedUpdate(false);
    return runCommunityData(async () => {
      await startObservingCommunityData({ clientUserId });
      setIsObserving(true);
    }, 'Observation started');
  }, [runCommunityData, clientUserId]);

  // Preset 4: stop observing.
  const onStopObservingPreset = useCallback(
    () =>
      runCommunityData(async () => {
        await stopObservingCommunityData();
        setIsObserving(false);
      }, 'Observation stopped'),
    [runCommunityData]
  );

  // Preset 5: contract check — neither id set must throw synchronously, before any native
  // call, rather than reject a promise. Still routed through `runCommunityData` so it gets the
  // same Idle/Running/Result treatment; the "error" here is the expected, successful outcome.
  const onContractViolationPreset = useCallback(
    () =>
      runCommunityData(
        async () => {
          try {
            // `{}` type-checks fine (both ids are optional) but deliberately violates the
            // "exactly one id" contract enforced at runtime by requireExactlyOneMemberId.
            fetchCommunityData({});
            throw new Error(
              'Expected a synchronous throw, but none was raised'
            );
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            return message;
          }
        },
        (message) => `Threw as expected — ${message}`
      ),
    [runCommunityData]
  );

  // Preset 6: open a small host-rendered "client profile" page. This is the one preset that
  // leaves the scenario screen — see the ClientProfileView type above.
  const onOpenClientProfilePreset = useCallback(async () => {
    const memberId = lastProfileId
      ? { profileId: lastProfileId }
      : isSsoAuth
        ? { clientUserId }
        : null;
    if (!memberId) return;
    await runCommunityData(
      async () => {
        try {
          const data = await fetchCommunityData(memberId);
          setClientProfileView(
            data ? { status: 'data', data } : { status: 'unknown' }
          );
          return data;
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          setClientProfileView({ status: 'error', message });
          throw e;
        }
      },
      (data) =>
        data
          ? `Client profile page — profileId=${data.profileId}`
          : 'Client profile page — member unknown'
    );
  }, [lastProfileId, isSsoAuth, clientUserId, runCommunityData]);

  const onCloseClientProfilePreset = useCallback(
    () => setClientProfileView(null),
    []
  );

  type CommunityDataAction =
    | 'fetchByClientUserId'
    | 'fetchByProfileId'
    | 'startObserving'
    | 'stopObserving'
    | 'contractViolation'
    | 'openClientProfile';
  const [communityDataAction, setCommunityDataAction] =
    useState<CommunityDataAction>('fetchByClientUserId');
  const onRunCommunityData = useCallback(() => {
    switch (communityDataAction) {
      case 'fetchByClientUserId':
        return onFetchByClientUserIdPreset();
      case 'fetchByProfileId':
        return onFetchByProfileIdPreset();
      case 'startObserving':
        return onStartObservingPreset();
      case 'stopObserving':
        return onStopObservingPreset();
      case 'contractViolation':
        return onContractViolationPreset();
      case 'openClientProfile':
        return onOpenClientProfilePreset();
    }
  }, [
    communityDataAction,
    onFetchByClientUserIdPreset,
    onFetchByProfileIdPreset,
    onStartObservingPreset,
    onStopObservingPreset,
    onContractViolationPreset,
    onOpenClientProfilePreset,
  ]);

  const communityDataInfo = [
    isSsoAuth
      ? null
      : 'The SDK runs in octopus mode — it owns the user, so there is no clientUserId to look up',
    lastProfileId ? `Last looked-up profileId: ${lastProfileId}` : null,
    isObserving
      ? `Observing… ${
          hasObservedUpdate
            ? observedCommunityData
              ? `messageCount=${observedCommunityData.messageCount ?? '—'}`
              : 'member unknown'
            : '(waiting for first update)'
        }`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  // --- syncFollowGroups -------------------------------------------------------------------
  const [followedByGroupId, setFollowedByGroupId] = useState<
    Record<string, boolean>
  >(() => Object.fromEntries(SAMPLE_GROUP_IDS.map((id) => [id, false])));
  const [syncFollowGroupsRunState, runSyncFollowGroups] =
    useScenarioRun('syncFollowGroups');

  const runSyncFollowGroupsPreset = useCallback(
    (followedFor: (groupId: string) => boolean) => {
      const actions = SAMPLE_GROUP_IDS.map((groupId) => ({
        groupId,
        followed: followedFor(groupId),
        actionDate: new Date(),
      }));
      return runSyncFollowGroups(
        async () => {
          const results = await syncFollowGroups(actions);
          // No live groups list to read back (fetchGroups isn't bridged on RN), so this
          // screen's own last-requested value IS its notion of "currently followed" —
          // that is what the next "Invert all" tap flips, not a server-confirmed state.
          setFollowedByGroupId((prev) => {
            const next = { ...prev };
            for (const action of actions)
              next[action.groupId] = action.followed;
            return next;
          });
          return results;
        },
        (results) => {
          const summary = results
            .map((r) => `${r.groupId} → ${r.status}`)
            .join(', ');
          return `Synced ${actions.length} group(s): ${summary}`;
        }
      );
    },
    [runSyncFollowGroups]
  );

  const onInvertAllGroupsPreset = useCallback(
    () => runSyncFollowGroupsPreset((groupId) => !followedByGroupId[groupId]),
    [runSyncFollowGroupsPreset, followedByGroupId]
  );
  const onFollowAllGroupsPreset = useCallback(
    () => runSyncFollowGroupsPreset(() => true),
    [runSyncFollowGroupsPreset]
  );
  const onUnfollowAllGroupsPreset = useCallback(
    () => runSyncFollowGroupsPreset(() => false),
    [runSyncFollowGroupsPreset]
  );

  type SyncFollowGroupsAction = 'invertAll' | 'followAll' | 'unfollowAll';
  const [syncFollowGroupsAction, setSyncFollowGroupsAction] =
    useState<SyncFollowGroupsAction>('invertAll');
  const onRunSyncFollowGroups = useCallback(() => {
    switch (syncFollowGroupsAction) {
      case 'invertAll':
        return onInvertAllGroupsPreset();
      case 'followAll':
        return onFollowAllGroupsPreset();
      case 'unfollowAll':
        return onUnfollowAllGroupsPreset();
    }
  }, [
    syncFollowGroupsAction,
    onInvertAllGroupsPreset,
    onFollowAllGroupsPreset,
    onUnfollowAllGroupsPreset,
  ]);

  const syncFollowGroupsInfo = `Sample groups: ${SAMPLE_GROUP_IDS.map(
    (id) => `${id}=${followedByGroupId[id] ? 'followed' : 'unfollowed'}`
  ).join(', ')}`;

  // --- lifecycle ------------------------------------------------------------------------------
  const [lifecycleRunState, runLifecycle] = useScenarioRun('switchCommunity');
  // One option per key set the build injected — the scenario enumerates NOTHING itself, so a
  // key added to the launcher's `OCTOPUS_NAMED_API_KEYS` table shows up here with no edit to
  // this file, and a build carrying none falls back to the free-text field below.
  const hasNamedApiKeys = injectedApiKeys.length > 0;
  // Injected key sets alone are not enough: a build declaring one, on the community that key
  // opens, has nothing to switch TO. The chips would then offer a single disabled option and
  // the scenario would be dead, so that build gets the free-text field instead. The resolution
  // itself — which slot is selectable, which one the picker should show as selected, and what
  // target a Run would actually use right now — lives in the pure, unit-tested
  // `resolveSwitchTarget` (`config/demoConfig.ts`) rather than inline here.
  const [switchTargetId, setSwitchTargetId] = useState<string>(
    () =>
      resolveSwitchTarget(injectedApiKeys, activeApiKeyId, undefined, '')
        .resolvedSelectedId
  );
  const [switchCustomKey, setSwitchCustomKey] = useState('');

  useEffect(() => {
    // The slot that was just switched to is now the one the SDK is on, and its chip is
    // therefore disabled: move the selection along so the scenario stays runnable instead of
    // pointing at the only option it refuses. Only `resolvedSelectedId` is read here, and it
    // does not depend on the pasted key — hence the empty string for that argument.
    setSwitchTargetId(
      (current) =>
        resolveSwitchTarget(injectedApiKeys, activeApiKeyId, current, '')
          .resolvedSelectedId
    );
  }, [activeApiKeyId]);

  const { hasSwitchableSlot, resolvedSelectedId, switchTarget } =
    resolveSwitchTarget(
      injectedApiKeys,
      activeApiKeyId,
      switchTargetId,
      switchCustomKey,
      activeCustomApiKey
    );

  const onRunSwitchCommunity = () => {
    if (switchTarget === null) return;
    // Cleared only once the switch has actually landed, and only on the custom-key path —
    // a slot-picked switch has no field to clear. Chained inside the action itself (rather
    // than after `runLifecycle` settles) so a failed switch leaves the pasted key in place.
    const isCustomTarget = switchTarget.id === null;
    // Labels only, never the key — a community is named here the same way Home names it.
    return runLifecycle(async () => {
      await onSwitchCommunity(switchTarget);
      if (isCustomTarget) setSwitchCustomKey('');
    }, `Switched to ${switchTarget.label}`);
  };

  const lifecycleInfo = `Active community: ${activeCommunityLabel}${
    hasSwitchableSlot
      ? ''
      : hasNamedApiKeys
        ? ' · the only key set this build injects is the one in force — paste a key to switch to'
        : ' · no named key sets injected — paste a key to switch to'
  }`;

  // Every hook this screen owns is declared above: the early return below is a conditional
  // one, so anything after it would be skipped on the `embeddedBack` route.
  // The `embeddedBack` host route. Mounted fresh on every Run — which is also what makes the
  // leading-icon choice take effect on iOS, where the embedded view reads its props on mount
  // only. The band above the view is deliberately the sample's own chrome, so a tester can
  // always tell the host's way back from the SDK's: only the icon inside the Octopus top app
  // bar proves the callback.
  if (isEmbeddedBackRouteOpen) {
    return (
      <View style={[styles.container, { backgroundColor: chrome.background }]}>
        <View
          style={[
            styles.embeddedBackBand,
            { backgroundColor: cardBg, borderBottomColor: borderColor },
          ]}
        >
          <Text
            style={[styles.embeddedBackBandText, { color: secondaryColor }]}
          >
            Host route — the SDK’s leading icon should bring you back here.
          </Text>
          <PresetButton
            testID="embeddedBack-host-back"
            label="Back to scenario"
            onPress={onCloseEmbeddedBackRoute}
            primaryColor={primaryColor}
          />
        </View>
        <View style={styles.embeddedBackHost}>
          <Octopus.OctopusUIView
            interceptUrls={interceptUrls}
            interceptProfileTaps={interceptProfileTaps}
            showBackButton={embeddedBackPreset.showBackButton}
            navBarLeadingAction={embeddedBackPreset.navBarLeadingAction}
            onBackRequested={onEmbeddedBackRequested}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>
    );
  }

  if (clientProfileView) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: chrome.background }]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Client Profile (host-rendered)
          </Text>
          {clientProfileView.status === 'data' && (
            <Text testID="clientProfile-data" style={{ color: textColor }}>
              {`profileId: ${clientProfileView.data.profileId}\nmessageCount: ${clientProfileView.data.messageCount ?? '—'}\ngamification: ${
                clientProfileView.data.gamification
                  ? `level ${clientProfileView.data.gamification.level}`
                  : '—'
              }`}
            </Text>
          )}
          {clientProfileView.status === 'unknown' && (
            <Text testID="clientProfile-unknown" style={{ color: textColor }}>
              Unknown member — no community data available.
            </Text>
          )}
          {clientProfileView.status === 'error' && (
            <Text testID="clientProfile-error" style={{ color: textColor }}>
              {clientProfileView.message}
            </Text>
          )}
          <View style={styles.presetRow}>
            <PresetButton
              testID="client-profile-back"
              label="Back to scenarios"
              onPress={onCloseClientProfilePreset}
              primaryColor={primaryColor}
            />
          </View>
        </View>
      </ScrollView>
    );
  }

  // The list route: the searchable index of scenarios. `selected` being null IS the list, so
  // there is no separate flag to keep in sync with it.
  if (selected === null) {
    const isSearching = query.trim() !== '';
    const sections = SCENARIO_SECTIONS.map((section) => ({
      section,
      matches: section.scenarios.filter((id) => matchesQuery(id, query)),
    })).filter(({ matches }) => matches.length > 0);
    const total = sections.reduce((n, { matches }) => n + matches.length, 0);
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: chrome.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          testID="scenarios-search-input"
          style={[
            styles.searchInput,
            { backgroundColor: cardBg, borderColor, color: textColor },
          ]}
          value={query}
          onChangeText={setQuery}
          placeholder="Search scenarios"
          placeholderTextColor={chrome.textPlaceholder}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        {total === 0 ? (
          <Text style={[styles.emptyState, { color: secondaryColor }]}>
            No scenario matches “{query.trim()}”.
          </Text>
        ) : (
          sections.map(({ section, matches }) => {
            // A search opens whatever it matched: a hit hidden inside a collapsed section
            // would read as "no result" to the person who typed the query.
            const open = isSearching || sectionOpen[section.id] !== false;
            return (
              <View key={section.id} style={styles.section}>
                <TouchableOpacity
                  testID={`scenarios-section-${section.id}`}
                  style={styles.sectionHeader}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  onPress={() => toggleSection(section.id)}
                  disabled={isSearching}
                >
                  <Text style={[styles.sectionTitle, { color: textColor }]}>
                    {section.title}
                  </Text>
                  <View style={styles.sectionCountRow}>
                    <Text
                      style={[styles.sectionCount, { color: secondaryColor }]}
                    >
                      {matches.length}
                    </Text>
                    {!isSearching && (
                      <MaterialIcons
                        name={open ? 'expand-less' : 'expand-more'}
                        size={18}
                        color={secondaryColor}
                      />
                    )}
                  </View>
                </TouchableOpacity>
                {open &&
                  matches.map((id) => (
                    <ScenarioRow
                      key={id}
                      id={id}
                      onOpen={setSelected}
                      cardBg={cardBg}
                      chrome={chrome}
                      borderColor={borderColor}
                      textColor={textColor}
                      secondaryColor={secondaryColor}
                    />
                  ))}
              </View>
            );
          })
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  }

  // The detail route: one scenario, opened from the list. Every `ScenarioCard` below renders
  // only when it is the open one, so the JSX stays a flat catalog of scenarios.
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: chrome.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity
        testID="scenarios-back-button"
        style={styles.backRow}
        onPress={() => setSelected(null)}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        <MaterialIcons name="arrow-back" size={20} color={primaryColor} />
        <Text style={[styles.backLabel, { color: primaryColor }]}>
          Scenarios
        </Text>
      </TouchableOpacity>
      <ScenarioCard
        id="connection"
        title={SCENARIO_TITLES.connection}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        {!isSsoAuth && (
          <Text style={[styles.hint, { color: secondaryColor }]}>
            The SDK was started in octopus mode: it owns the login, so the host
            has no user to connect. Restart from Config in SSO mode to run these
            presets.
          </Text>
        )}
        {isSsoAuth && missingEntitlementVariants.length > 0 && (
          <Text style={[styles.hint, { color: secondaryColor }]}>
            {`No token injected for ${missingEntitlementVariants
              .map(
                (variant) =>
                  `${ENTITLEMENT_LABELS[variant]} (${USER_TOKEN_ENV_VARS[variant]})`
              )
              .join(
                ', '
              )}. The sample signs nothing itself — each entitlement combination is a pre-baked token the build injects, so a preset without one stays disabled.`}
          </Text>
        )}
        <TextParamField
          testID="qa-param-connection-userId"
          label="User id"
          value={connectionUserId}
          onChangeText={setConnectionUserId}
          isDark={isDark}
          editable={isSsoAuth && !isMockUserConnected}
        />
        <TextParamField
          testID="qa-param-connection-nickname"
          label="Nickname"
          value={connectionNickname}
          onChangeText={setConnectionNickname}
          isDark={isDark}
          editable={isSsoAuth && !isMockUserConnected}
        />
        <SetParamField
          testID="qa-param-connection-entitlements"
          label="Entitlements"
          isDark={isDark}
          selected={connectionEntitlements}
          onToggle={toggleConnectionEntitlement}
          options={[
            {
              key: 'premium',
              label: ENTITLEMENT_LABELS.premium,
              disabled:
                !isSsoAuth || !hasUserToken('premium') || isMockUserConnected,
            },
            {
              key: 'moderator',
              label: ENTITLEMENT_LABELS.moderator,
              disabled:
                !isSsoAuth || !hasUserToken('moderator') || isMockUserConnected,
            },
          ]}
        />
        <ScenarioResultPanel
          testID="connection-result"
          isDark={isDark}
          state={connectionRunState}
          info={connectionResultText}
        />
        <VerifyInCommunityButton
          id="connection"
          isDark={isDark}
          onPress={onVerifyInCommunity}
        />
        <ScenarioRunButton
          testID={connectionPresetTestID}
          state={connectionRunState}
          isDark={isDark}
          onPress={onRunConnection}
          idleLabel={isMockUserConnected ? 'Disconnect' : 'Connect'}
          disabled={
            !isSsoAuth ||
            (isMockUserConnected ? false : !hasUserToken(connectionVariant))
          }
        />
      </ScenarioCard>

      <ScenarioCard
        id="communityAccess"
        title={SCENARIO_TITLES.communityAccess}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        <EnumParamField
          testID="qa-param-communityAccess-action"
          label="Action"
          typeName="CommunityAccessAction"
          isDark={isDark}
          value={communityAccessAction}
          onChange={(key) =>
            setCommunityAccessAction(key as CommunityAccessAction)
          }
          options={[
            {
              key: 'grant',
              label: 'Override · grant',
              testID: 'qa-preset-communityAccess-1',
            },
            {
              key: 'deny',
              label: 'Override · deny',
              testID: 'qa-preset-communityAccess-2',
            },
            {
              key: 'track',
              label: 'Track · has access',
              testID: 'qa-preset-communityAccess-3',
            },
            {
              key: 'trackNone',
              label: 'Track · no access',
            },
          ]}
        />
        <ScenarioResultPanel
          testID="communityAccess-result"
          isDark={isDark}
          state={communityAccessRunState}
          info={communityAccessInfo}
        />
        <VerifyInCommunityButton
          id="communityAccess"
          isDark={isDark}
          onPress={onVerifyInCommunity}
        />
        <ScenarioRunButton
          testID="qa-run-communityAccess"
          state={communityAccessRunState}
          isDark={isDark}
          onPress={onRunCommunityAccess}
        />
      </ScenarioCard>

      <ScenarioCard
        id="notSeenNotifications"
        title={SCENARIO_TITLES.notSeenNotifications}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        <EnumParamField
          testID="qa-param-notSeenNotifications-action"
          label="Action"
          typeName="NotSeenNotificationsAction"
          isDark={isDark}
          value={notSeenNotificationsAction}
          onChange={(key) =>
            setNotSeenNotificationsAction(key as NotSeenNotificationsAction)
          }
          options={[
            {
              key: 'refresh',
              label: 'Refresh not-seen count',
              testID: 'qa-preset-notSeenNotifications-2',
            },
            {
              key: 'open',
              label: 'Open Octopus (full-page route)',
              testID: 'qa-preset-notSeenNotifications-1',
            },
          ]}
        />
        <ScenarioResultPanel
          testID="notSeenNotifications-result"
          isDark={isDark}
          state={notSeenNotificationsRunState}
          isPresentation
          info={notSeenNotificationsInfo}
        />
        <ScenarioRunButton
          testID="qa-run-notSeenNotifications"
          state={notSeenNotificationsRunState}
          isDark={isDark}
          onPress={onRunNotSeenNotifications}
        />
      </ScenarioCard>

      <ScenarioCard
        id="pushNotifications"
        title={SCENARIO_TITLES.pushNotifications}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        <Text style={[styles.hint, { color: secondaryColor }]}>
          Replays a bundled sample payload through the same
          isOctopusNotification → getOctopusNotification → openNotification path
          a real push tap takes.
        </Text>
        <ScenarioResultPanel
          testID="pushNotifications-result"
          isDark={isDark}
          state={pushNotificationsRunState}
          isPresentation
          info={`Push token: ${pushToken ?? '— (empty until permission is granted; physical device only)'}`}
        />
        <ScenarioRunButton
          testID="qa-preset-pushNotifications-1"
          state={pushNotificationsRunState}
          isDark={isDark}
          onPress={onReplaySampleNotificationPreset}
          idleLabel="Open sample notification (deep link)"
        />
      </ScenarioCard>

      <ScenarioCard
        id="customEvents"
        title={SCENARIO_TITLES.customEvents}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        <SetParamField
          testID="qa-param-customEvents-properties"
          label="Properties"
          isDark={isDark}
          selected={customEventIncludeProps}
          onToggle={toggleCustomEventIncludeProps}
          options={[{ key: 'properties', label: 'source, preset' }]}
        />
        <CustomEventPanel
          isDark={isDark}
          primaryColor={primaryColor}
          onSend={onSendCustomEvent}
        />
        <ScenarioResultPanel
          testID="customEvents-result"
          isDark={isDark}
          state={customEventsRunState}
        />
        <ScenarioRunButton
          testID={customEventsPresetTestID}
          state={customEventsRunState}
          isDark={isDark}
          onPress={onRunCustomEvent}
          idleLabel="Track sample_event"
        />
      </ScenarioCard>

      <ScenarioCard
        id="locale"
        title={SCENARIO_TITLES.locale}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        <EnumParamField
          testID="qa-param-locale-override"
          label="Community locale override"
          typeName="CommunityLocaleOverride"
          isDark={isDark}
          value={localeSelection}
          onChange={(key) => setLocaleSelection(key as CommunityLocaleOverride)}
          options={[
            { key: 'fr', label: 'fr', testID: 'qa-preset-locale-1' },
            { key: 'en', label: 'en', testID: 'qa-preset-locale-2' },
            {
              key: 'system',
              label: 'System default',
              testID: 'qa-preset-locale-3',
            },
          ]}
        />
        <ScenarioResultPanel
          testID="locale-result"
          isDark={isDark}
          state={localeRunState}
          info={localeResultText}
        />
        <VerifyInCommunityButton
          id="locale"
          isDark={isDark}
          onPress={onVerifyInCommunity}
        />
        <ScenarioRunButton
          testID="qa-run-locale"
          state={localeRunState}
          isDark={isDark}
          onPress={onRunLocale}
          disabled={communityLocaleOverride === localeSelection}
        />
      </ScenarioCard>

      <ScenarioCard
        id="theme"
        title={SCENARIO_TITLES.theme}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        <Text style={[styles.hint, { color: secondaryColor }]}>
          Applies the chosen theme locally to the setters below — no SDK
          re-initialization, no server round-trip.
        </Text>
        <EnumParamField
          testID="qa-param-theme-preset"
          label="Preset"
          typeName="ThemePreset"
          isDark={isDark}
          value={themeSelection}
          onChange={(key) => setThemeSelection(key as 'default' | 'custom')}
          options={[
            { key: 'default', label: 'Default theme' },
            { key: 'custom', label: 'Custom (brand colors + logo)' },
          ]}
        />
        <ThemePanel
          themeMode={themeMode}
          onThemeModeChange={onThemeModeChange}
          themeSet={themeSet}
          onThemeSetChange={onThemeSetChange}
          fontType={fontType}
          onFontTypeChange={onFontTypeChange}
          logoMode={logoMode}
          onLogoModeChange={onLogoModeChange}
          fontSizeMode={fontSizeMode}
          onFontSizeModeChange={onFontSizeModeChange}
          bottomInsetPreset={bottomInsetPreset}
          onBottomInsetPresetChange={onBottomInsetPresetChange}
          linkBackgroundMode={linkBackgroundMode}
          onLinkBackgroundModeChange={onLinkBackgroundModeChange}
          fontOverrideMode={fontOverrideMode}
          onFontOverrideModeChange={onFontOverrideModeChange}
          isDark={isDark}
          primaryColor={primaryColor}
          onPrimaryColor={onPrimaryColor}
        />
        <ScenarioResultPanel
          testID="theme-result"
          isDark={isDark}
          state={themeRunState}
          info={themeResultText}
        />
        <VerifyInCommunityButton
          id="theme"
          isDark={isDark}
          onPress={onVerifyInCommunity}
        />
        <ScenarioRunButton
          testID="qa-run-theme"
          state={themeRunState}
          isDark={isDark}
          onPress={onRunTheme}
        />
      </ScenarioCard>

      <ScenarioCard
        id="createPost"
        title={SCENARIO_TITLES.createPost}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        <TextParamField
          testID="qa-param-createPost-text"
          label="Text"
          type="String?"
          value={createPostText}
          onChangeText={setCreatePostText}
          placeholder="null — image-only post"
          isDark={isDark}
        />
        <SetParamField
          testID="qa-param-createPost-attachments"
          label="Attachments"
          isDark={isDark}
          selected={createPostAttachments}
          onToggle={toggleCreatePostAttachment}
          options={[
            { key: 'cta', label: 'CTA' },
            { key: 'image', label: 'Bundled image' },
          ]}
        />
        <ScenarioResultPanel
          testID="createPost-result"
          isDark={isDark}
          state={createPostRunState}
          isPresentation
        />
        <VerifyInCommunityButton
          id="createPost"
          isDark={isDark}
          onPress={onVerifyInCommunity}
        />
        <ScenarioRunButton
          testID={createPostPresetTestID}
          state={createPostRunState}
          isDark={isDark}
          onPress={onRunCreatePost}
        />
      </ScenarioCard>

      <ScenarioCard
        id="initialScreen"
        title={SCENARIO_TITLES.initialScreen}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        {!hasDemoPostId && (
          <Text style={[styles.hint, { color: secondaryColor }]}>
            Set OCTOPUS_DEMO_POST_ID in .env to run the post preset — see the
            example README.
          </Text>
        )}
        {!isSsoAuth && (
          <Text style={[styles.hint, { color: secondaryColor }]}>
            The member presets need the SSO auth mode — pick it on the Config
            screen, with OCTOPUS_SSO_USER_ID / OCTOPUS_SSO_USER_TOKEN set in
            .env (see the example README).
          </Text>
        )}
        <EnumParamField
          testID="qa-param-initialScreen-target"
          label="Target"
          typeName="OctopusInitialScreen"
          isDark={isDark}
          value={initialScreenSelection}
          onChange={(key) =>
            setInitialScreenSelection(key as InitialScreenSelection)
          }
          options={[
            { key: 'mainFeed', label: 'Main feed' },
            { key: 'post', label: 'Demo post', disabled: !hasDemoPostId },
            { key: 'group', label: 'Sample group' },
            {
              key: 'activityByClientUserId',
              label: 'Member posts (by clientUserId)',
              disabled: !isSsoAuth || clientUserId === '',
            },
            {
              key: 'activityByProfileId',
              label: 'Member posts (by profileId)',
              disabled: !isSsoAuth || clientUserId === '',
            },
            {
              key: 'profileByClientUserId',
              label: 'Member profile (by clientUserId)',
              disabled: !isSsoAuth || clientUserId === '',
            },
            { key: 'ownProfile', label: 'Own profile' },
          ]}
        />
        <Text
          style={[
            styles.hint,
            styles.embeddedPreviewHint,
            { color: secondaryColor },
          ]}
        >
          Embedded preview — same `initialScreen` values, live in an embedded
          `OctopusUIView` rather than opened fullscreen.
        </Text>
        <View style={styles.presetRow}>
          {EMBEDDED_INITIAL_SCREENS.map((preset) => {
            const active = preset.key === embeddedScreenKey;
            return (
              <TouchableOpacity
                key={preset.key}
                testID={`qa-embedded-initialScreen-${preset.key}`}
                style={[
                  styles.embeddedChip,
                  { borderColor },
                  active && { backgroundColor: primaryColor },
                  !preset.enabled && styles.embeddedChipDisabled,
                ]}
                disabled={!preset.enabled}
                onPress={() => setEmbeddedScreenKey(preset.key)}
              >
                <Text
                  style={[
                    styles.embeddedChipText,
                    { color: active ? onPrimaryColor : textColor },
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <ScenarioResultPanel
          testID="initialScreen-result"
          isDark={isDark}
          state={initialScreenRunState}
          isPresentation
        />
        {initialScreenRunState.status !== 'idle' && (
          // Spec 09: for a presentation scenario the result IS the screen that opened — the
          // embedded live view only earns its place on screen once a Run has actually
          // happened, never as a permanent fixture below the fold.
          <View style={styles.embeddedPreviewHost}>
            {/*
              `initialScreen` is consumed when the native view is built, so the key
              is what actually re-mounts it on a new screen — and on a new community,
              which `switchCommunity` requires for the same reason.
            */}
            <Octopus.OctopusUIView
              key={`${embeddedScreenKey}-${communitySessionNonce}`}
              interceptUrls={interceptUrls}
              interceptProfileTaps={interceptProfileTaps}
              initialScreen={
                EMBEDDED_INITIAL_SCREENS.find(
                  (preset) => preset.key === embeddedScreenKey
                )?.screen
              }
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}
        <ScenarioRunButton
          testID="qa-run-initialScreen"
          state={initialScreenRunState}
          isDark={isDark}
          onPress={onRunInitialScreen}
        />
      </ScenarioCard>

      <ScenarioCard
        id="embeddedBack"
        title={SCENARIO_TITLES.embeddedBack}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        <Text style={[styles.hint, { color: secondaryColor }]}>
          Run opens a host route holding nothing but an embedded
          `OctopusUIView`. On the SDK’s ROOT screen the top app bar’s leading
          icon fires `onBackRequested`, and this sample answers it by popping
          that route. Open a post or a profile first and the same icon pops the
          SDK’s own stack instead — no callback, the route stays.
        </Text>
        <EnumParamField
          testID="qa-param-embeddedBack-leading"
          label="Leading icon"
          typeName="LeadingIconPreset"
          isDark={isDark}
          value={embeddedBackPresetKey}
          onChange={setEmbeddedBackPresetKey}
          options={EMBEDDED_BACK_PRESETS.map((preset) => ({
            key: preset.key,
            label: preset.label,
            testID: preset.testID,
          }))}
        />
        <ScenarioResultPanel
          testID="embeddedBack-result"
          isDark={isDark}
          state={embeddedBackRunState}
          isPresentation
          info={embeddedBackInfo}
        />
        <ScenarioRunButton
          testID="qa-run-embeddedBack"
          state={embeddedBackRunState}
          isDark={isDark}
          onPress={onRunEmbeddedBack}
        />
      </ScenarioCard>

      <ScenarioCard
        id="reactions"
        title={SCENARIO_TITLES.reactions}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        {!hasDemoPostId && (
          <Text style={[styles.hint, { color: secondaryColor }]}>
            Set OCTOPUS_DEMO_POST_ID in .env to run these presets — see the
            example README.
          </Text>
        )}
        <EnumParamField
          testID="qa-param-reactions-kind"
          label="Reaction"
          typeName="OctopusReactionKind?"
          isDark={isDark}
          value={reactionSelection}
          onChange={setReactionSelection}
          options={(
            [
              ['heart', 'qa-preset-reactions-1'],
              ['joy', 'qa-preset-reactions-2'],
              ['mouthOpen', 'qa-preset-reactions-4'],
              ['clap', 'qa-preset-reactions-5'],
              ['cry', 'qa-preset-reactions-6'],
              ['rage', 'qa-preset-reactions-7'],
              ['none', 'qa-preset-reactions-3'],
            ] as const
          ).map(([key, presetTestID]) => ({
            key,
            label: REACTION_LABELS[key] as string,
            disabled: !hasDemoPostId,
            testID: presetTestID,
          }))}
        />
        <ScenarioResultPanel
          testID="reactions-result"
          isDark={isDark}
          state={reactionsRunState}
          info={reactionsInfo}
        />
        <VerifyInCommunityButton
          id="reactions"
          isDark={isDark}
          onPress={onVerifyInCommunity}
        />
        <ScenarioRunButton
          testID="qa-run-reactions"
          state={reactionsRunState}
          isDark={isDark}
          onPress={onRunReaction}
          disabled={!hasDemoPostId}
        />
      </ScenarioCard>

      <ScenarioCard
        id="profileFieldsLock"
        title={SCENARIO_TITLES.profileFieldsLock}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        <EnumParamField
          testID="qa-param-profileFieldsLock-nickname"
          label="Nickname"
          typeName="FieldLock"
          isDark={isDark}
          value={nicknameLock}
          onChange={(key) => setNicknameLock(key as FieldLockMode)}
          options={[
            { key: 'editable', label: 'Editable' },
            { key: 'readOnly', label: 'Read-only' },
            { key: 'disabled', label: 'Hidden' },
          ]}
        />
        <EnumParamField
          testID="qa-param-profileFieldsLock-avatar"
          label="Avatar"
          typeName="FieldLock"
          isDark={isDark}
          value={avatarLock}
          onChange={(key) => setAvatarLock(key as FieldLockMode)}
          options={[
            { key: 'editable', label: 'Editable' },
            { key: 'readOnly', label: 'Read-only' },
            { key: 'disabled', label: 'Hidden' },
          ]}
        />
        <EnumParamField
          testID="qa-param-profileFieldsLock-bio"
          label="Bio"
          typeName="FieldLock"
          isDark={isDark}
          value={bioLock}
          onChange={(key) => setBioLock(key as FieldLockMode)}
          options={[
            { key: 'editable', label: 'Editable' },
            { key: 'readOnly', label: 'Read-only' },
            { key: 'disabled', label: 'Hidden' },
          ]}
        />
        <SetParamField
          testID="qa-param-profileFieldsLock-clear"
          label="Clear override"
          isDark={isDark}
          selected={clearProfileFieldsLock}
          onToggle={toggleClearProfileFieldsLock}
          options={[
            {
              key: 'clear',
              label: 'Reset to backend default',
              testID: 'qa-preset-profileFieldsLock-clear',
            },
          ]}
        />
        <ScenarioResultPanel
          testID="profileFieldsLock-result"
          isDark={isDark}
          state={profileFieldsLockRunState}
        />
        <VerifyInCommunityButton
          id="profileFieldsLock"
          isDark={isDark}
          onPress={onVerifyInCommunity}
        />
        <ScenarioRunButton
          testID={profileFieldsLockPresetTestID}
          state={profileFieldsLockRunState}
          isDark={isDark}
          onPress={onRunProfileFieldsLock}
        />
      </ScenarioCard>

      <ScenarioCard
        id="contentOptions"
        title={SCENARIO_TITLES.contentOptions}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        <SetParamField
          testID="qa-param-contentOptions-post"
          label="Post: disabled"
          isDark={isDark}
          selected={postDisabled}
          onToggle={toggleContentOptionsFlag(setPostDisabled)}
          options={[
            { key: 'pictures', label: 'Pictures' },
            { key: 'polls', label: 'Polls' },
          ]}
        />
        <SetParamField
          testID="qa-param-contentOptions-comment"
          label="Comment: disabled"
          isDark={isDark}
          selected={commentDisabled}
          onToggle={toggleContentOptionsFlag(setCommentDisabled)}
          options={[{ key: 'pictures', label: 'Pictures' }]}
        />
        <SetParamField
          testID="qa-param-contentOptions-reply"
          label="Reply: disabled"
          isDark={isDark}
          selected={replyDisabled}
          onToggle={toggleContentOptionsFlag(setReplyDisabled)}
          options={[{ key: 'pictures', label: 'Pictures' }]}
        />
        <SetParamField
          testID="qa-param-contentOptions-clear"
          label="Clear override"
          isDark={isDark}
          selected={clearContentOptions}
          onToggle={toggleClearContentOptions}
          options={[
            {
              key: 'clear',
              label: 'Reset to backend default',
              testID: 'qa-preset-contentOptions-clear',
            },
          ]}
        />
        <ScenarioResultPanel
          testID="contentOptions-result"
          isDark={isDark}
          state={contentOptionsRunState}
        />
        <VerifyInCommunityButton
          id="contentOptions"
          isDark={isDark}
          onPress={onVerifyInCommunity}
        />
        <ScenarioRunButton
          testID={contentOptionsPresetTestID}
          state={contentOptionsRunState}
          isDark={isDark}
          onPress={onRunContentOptions}
        />
      </ScenarioCard>

      <ScenarioCard
        id="termsAcceptance"
        title={SCENARIO_TITLES.termsAcceptance}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        <EnumParamField
          testID="qa-param-termsAcceptance-mode"
          label="Mode"
          typeName="TermsAcceptanceMode"
          options={[
            {
              key: 'implicit',
              label: 'Implicit (default / no-op)',
              testID: 'qa-preset-termsAcceptance-1',
            },
            {
              key: 'explicitMultiCheckbox',
              label: 'Explicit — multi checkbox',
              testID: 'qa-preset-termsAcceptance-2',
            },
            {
              key: 'explicitSingleCheckbox',
              label: 'Explicit — single checkbox',
              testID: 'qa-preset-termsAcceptance-3',
            },
          ]}
          value={termsAcceptanceMode}
          onChange={(key) => setTermsAcceptanceMode(key as TermsAcceptanceMode)}
          isDark={isDark}
        />
        <SetParamField
          testID="qa-param-termsAcceptance-clear"
          label="Clear override"
          options={[
            {
              key: 'clear',
              label: 'Clear (backend default)',
              testID: 'qa-preset-termsAcceptance-clear',
            },
          ]}
          selected={clearTermsAcceptance}
          onToggle={toggleClearTermsAcceptance}
          isDark={isDark}
        />
        <ScenarioResultPanel
          testID="termsAcceptance-result"
          isDark={isDark}
          state={termsAcceptanceRunState}
        />
        <VerifyInCommunityButton
          id="termsAcceptance"
          isDark={isDark}
          onPress={onVerifyInCommunity}
        />
        <ScenarioRunButton
          testID="qa-run-termsAcceptance"
          state={termsAcceptanceRunState}
          isDark={isDark}
          onPress={onRunTermsAcceptance}
        />
      </ScenarioCard>

      <ScenarioCard
        id="communityData"
        title={SCENARIO_TITLES.communityData}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        <EnumParamField
          testID="qa-param-communityData-action"
          label="Action"
          typeName="CommunityDataAction"
          options={[
            {
              key: 'fetchByClientUserId',
              label: 'Fetch by clientUserId',
              disabled: !isSsoAuth,
              testID: 'qa-preset-communityData-1',
            },
            {
              key: 'fetchByProfileId',
              label: 'Fetch by profileId (from the last lookup)',
              disabled: !lastProfileId,
              testID: 'qa-preset-communityData-2',
            },
            {
              key: 'startObserving',
              label: 'Observe by clientUserId (start)',
              disabled: !isSsoAuth,
              testID: 'qa-preset-communityData-3',
            },
            {
              key: 'stopObserving',
              label: 'Stop observing',
              disabled: !isObserving,
              testID: 'qa-preset-communityData-4',
            },
            {
              key: 'contractViolation',
              label: 'Contract: both / neither id throws',
              testID: 'qa-preset-communityData-5',
            },
            {
              key: 'openClientProfile',
              label: 'Open the host-rendered profile page',
              disabled: !lastProfileId && !isSsoAuth,
              testID: 'qa-preset-communityData-6',
            },
          ]}
          value={communityDataAction}
          onChange={(key) => setCommunityDataAction(key as CommunityDataAction)}
          isDark={isDark}
        />
        <ScenarioResultPanel
          testID="communityData-result"
          isDark={isDark}
          state={communityDataRunState}
          info={communityDataInfo}
        />
        <ScenarioRunButton
          testID="qa-run-communityData"
          state={communityDataRunState}
          isDark={isDark}
          onPress={onRunCommunityData}
        />
      </ScenarioCard>

      <ScenarioCard
        id="syncFollowGroups"
        title={SCENARIO_TITLES.syncFollowGroups}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        <Text style={[styles.hint, { color: secondaryColor }]}>
          Batches follow/unfollow across a bundled set of sample group ids (RN
          has no fetchGroups binding yet). "Invert all" flips whatever this
          screen last requested for each id, not a server-confirmed state.
        </Text>
        <EnumParamField
          testID="qa-param-syncFollowGroups-action"
          label="Action"
          typeName="SyncFollowGroupsAction"
          options={[
            {
              key: 'invertAll',
              label: 'Invert all',
              testID: 'qa-preset-syncFollowGroups-1',
            },
            {
              key: 'followAll',
              label: 'FOLLOW all',
              testID: 'qa-preset-syncFollowGroups-2',
            },
            {
              key: 'unfollowAll',
              label: 'UNFOLLOW all',
              testID: 'qa-preset-syncFollowGroups-3',
            },
          ]}
          value={syncFollowGroupsAction}
          onChange={(key) =>
            setSyncFollowGroupsAction(key as SyncFollowGroupsAction)
          }
          isDark={isDark}
        />
        <SyncFollowGroupsPanel isDark={isDark} primaryColor={primaryColor} />
        <ScenarioResultPanel
          testID="syncFollowGroups-result"
          isDark={isDark}
          state={syncFollowGroupsRunState}
          info={syncFollowGroupsInfo}
        />
        <VerifyInCommunityButton
          id="syncFollowGroups"
          isDark={isDark}
          onPress={onVerifyInCommunity}
        />
        <ScenarioRunButton
          testID="qa-run-syncFollowGroups"
          state={syncFollowGroupsRunState}
          isDark={isDark}
          onPress={onRunSyncFollowGroups}
        />
      </ScenarioCard>

      <ScenarioCard
        id="lifecycle"
        title={SCENARIO_TITLES.lifecycle}
        selected={selected}
        cardBg={cardBg}
        chrome={chrome}
        borderColor={borderColor}
        textColor={textColor}
      >
        <Text style={[styles.hint, { color: secondaryColor }]}>
          Natively a reset followed by an initialize: the connected user, the
          cached content and the not-seen count all belong to the community
          being left, so the switch drops them and the embedded views are
          remounted on the new one.
        </Text>
        {hasSwitchableSlot ? (
          <EnumParamField
            testID="qa-param-lifecycle-target"
            label="Target community"
            typeName="InjectedApiKey"
            isDark={isDark}
            // The resolved id, not the raw state: the effect above corrects the selection one
            // render late, and in that render the highlighted chip would otherwise name a
            // different community than the one the Run button would switch to.
            value={resolvedSelectedId}
            onChange={setSwitchTargetId}
            // One option per injected key set, in the order the build declares them. The
            // catalog has a single `qa-preset-lifecycle-1` for this scenario and the target
            // list is build-defined, so the catalog id rides the Run button below while each
            // chip carries the per-slot id the cross-platform samples share.
            options={injectedApiKeys.map((slot) => ({
              key: slot.id,
              label: slot.label,
              testID: `qa-preset-lifecycle-${slot.id}`,
              disabled: slot.id === activeApiKeyId,
            }))}
          />
        ) : (
          <TextParamField
            testID="qa-param-lifecycle-apiKey"
            label="Target API key"
            value={switchCustomKey}
            onChangeText={setSwitchCustomKey}
            placeholder="Paste the API key of another community"
            isDark={isDark}
          />
        )}
        <ScenarioResultPanel
          testID="lifecycle-result"
          isDark={isDark}
          state={lifecycleRunState}
          info={lifecycleInfo}
        />
        <VerifyInCommunityButton
          id="lifecycle"
          isDark={isDark}
          onPress={onVerifyInCommunity}
        />
        <ScenarioRunButton
          testID="qa-preset-lifecycle-1"
          state={lifecycleRunState}
          isDark={isDark}
          onPress={onRunSwitchCommunity}
          idleLabel="Switch community"
          disabled={switchTarget === null}
        />
      </ScenarioCard>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
    minHeight: 44,
  },
  emptyState: {
    fontSize: 13,
    marginBottom: 16,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  apiChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  apiChip: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  apiChipText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  verifyButton: {
    marginTop: 4,
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  embeddedPreviewHint: {
    marginTop: 12,
  },
  embeddedChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  embeddedChipDisabled: {
    opacity: 0.4,
  },
  embeddedChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  embeddedPreviewHost: {
    height: 360,
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  embeddedBackBand: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  embeddedBackBandText: {
    fontSize: 12,
    lineHeight: 16,
  },
  embeddedBackHost: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 8,
    minHeight: 48,
  },
  rowTextColumn: {
    flex: 1,
  },
  rowSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  rowChevron: {
    fontSize: 22,
    lineHeight: 24,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  backLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 24,
  },
});
