import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
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
  ProfileFieldsLock,
  ContentOptions,
  TermsAcceptanceMode,
} from '@octopus-community/react-native';
import { PresetButton } from '../components/PresetButton';
import { ScenarioResultPanel } from '../components/ScenarioResultPanel';
import type { CommunityLocaleOverride } from './SetupScreen';
import type {
  ThemeSet,
  FontType,
  LogoMode,
  FontSizeMode,
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

type Feedback = { type: 'success' | 'error'; message: string } | null;

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

export interface ScenariosScreenProps {
  isDark: boolean;
  primaryColor: string;

  // connection
  hasSsoEnvVars: boolean;
  isMockUserConnected: boolean;
  isConnectingUser: boolean;
  onConnectUser: () => void;
  onDisconnectUser: () => void;
  /** Outcome of the last connectUser attempt made from this screen, if it failed. */
  connectionError: string | null;

  // communityAccess
  hasAccessToCommunity: boolean | null;

  // notSeenNotifications
  notSeenNotificationsCount: number;
  onRefreshNotifications: () => void;
  isUpdatingNotifications: boolean;
  /** Outcome of the last "refresh not-seen count" call. */
  notificationsRefreshFeedback: Feedback;

  // locale
  communityLocaleOverride: CommunityLocaleOverride;
  onCommunityLocaleOverrideChange: (mode: CommunityLocaleOverride) => void;
  /** Outcome of the last locale override change, if it failed. */
  localeOverrideError: string | null;

  // theme
  themeSet: ThemeSet;
  onThemeSetChange: (value: ThemeSet) => void;
  fontType: FontType;
  onFontTypeChange: (value: FontType) => void;
  logoMode: LogoMode;
  onLogoModeChange: (value: LogoMode) => void;
  fontSizeMode: FontSizeMode;
  onFontSizeModeChange: (value: FontSizeMode) => void;
}

/**
 * Scenarios tab: single-tap QA presets for capabilities already wired elsewhere in the
 * example (Setup, Theme, SDK Data). Each card mirrors one entry of the shared scenarios
 * catalog (`pm-tools/shared/config/scenarios-catalog.yaml`) — its preset `testID`s and
 * result panel `testID` are copied verbatim from there for the cross-platform QA gate.
 */
export function ScenariosScreen({
  isDark,
  primaryColor,
  hasSsoEnvVars,
  isMockUserConnected,
  isConnectingUser,
  onConnectUser,
  onDisconnectUser,
  connectionError,
  hasAccessToCommunity,
  notSeenNotificationsCount,
  onRefreshNotifications,
  isUpdatingNotifications,
  notificationsRefreshFeedback,
  communityLocaleOverride,
  onCommunityLocaleOverrideChange,
  localeOverrideError,
  themeSet,
  onThemeSetChange,
  fontType,
  onFontTypeChange,
  logoMode,
  onLogoModeChange,
  fontSizeMode,
  onFontSizeModeChange,
}: ScenariosScreenProps) {
  const textColor = isDark ? '#ffffff' : '#000000';
  const secondaryColor = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#2a2a2a' : '#f5f5f5';
  const borderColor = isDark ? '#444444' : '#e8e8e8';

  // --- communityAccess ------------------------------------------------------------------
  const [isCommunityAccessBusy, setIsCommunityAccessBusy] = useState(false);
  const [communityAccessFeedback, setCommunityAccessFeedback] =
    useState<Feedback>(null);

  const runCommunityAccessPreset = useCallback(
    async (action: () => Promise<void>, successMessage: string) => {
      setIsCommunityAccessBusy(true);
      setCommunityAccessFeedback(null);
      try {
        await action();
        setCommunityAccessFeedback({
          type: 'success',
          message: successMessage,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setCommunityAccessFeedback({ type: 'error', message });
      } finally {
        setIsCommunityAccessBusy(false);
      }
    },
    []
  );

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

  const accessLabel =
    hasAccessToCommunity === null ? '—' : hasAccessToCommunity ? 'Yes' : 'No';
  const communityAccessResultText = [
    `Has access to community (Octopus-managed): ${accessLabel}`,
    communityAccessFeedback
      ? `${communityAccessFeedback.type === 'success' ? '✓' : '✕'} ${communityAccessFeedback.message}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  // --- notSeenNotifications --------------------------------------------------------------
  const [isOpeningOctopus, setIsOpeningOctopus] = useState(false);
  const [notSeenNotificationsFeedback, setNotSeenNotificationsFeedback] =
    useState<Feedback>(null);

  const onOpenOctopusPreset = useCallback(async () => {
    setIsOpeningOctopus(true);
    setNotSeenNotificationsFeedback(null);
    try {
      await openUI();
      setNotSeenNotificationsFeedback({
        type: 'success',
        message: 'Opened Octopus (full-page route)',
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setNotSeenNotificationsFeedback({ type: 'error', message });
    } finally {
      setIsOpeningOctopus(false);
    }
  }, []);

  const notSeenNotificationsResultText = [
    `Not-seen notifications count: ${notSeenNotificationsCount}`,
    notSeenNotificationsFeedback
      ? `${notSeenNotificationsFeedback.type === 'success' ? '✓' : '✕'} ${notSeenNotificationsFeedback.message}`
      : null,
    notificationsRefreshFeedback
      ? `${notificationsRefreshFeedback.type === 'success' ? '✓' : '✕'} ${notificationsRefreshFeedback.message}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  // --- pushNotifications ------------------------------------------------------------------
  const [pushNotificationFeedback, setPushNotificationFeedback] =
    useState<Feedback>(null);
  const [isReplayingNotification, setIsReplayingNotification] = useState(false);

  const onReplaySampleNotificationPreset = useCallback(async () => {
    setIsReplayingNotification(true);
    setPushNotificationFeedback(null);
    try {
      if (!isOctopusNotification(SAMPLE_NOTIFICATION_PAYLOAD)) {
        throw new Error(
          'Sample payload is not recognized as an Octopus notification'
        );
      }
      const notification = getOctopusNotification(SAMPLE_NOTIFICATION_PAYLOAD);
      if (!notification) {
        throw new Error(
          'Sample payload could not be parsed (missing link_path)'
        );
      }
      await openNotification(notification);
      setPushNotificationFeedback({
        type: 'success',
        message: `Opened deep link: ${notification.linkPath}`,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setPushNotificationFeedback({ type: 'error', message });
    } finally {
      setIsReplayingNotification(false);
    }
  }, []);

  const pushNotificationsResultText = pushNotificationFeedback
    ? `${pushNotificationFeedback.type === 'success' ? '✓' : '✕'} ${pushNotificationFeedback.message}`
    : 'No sample notification replayed yet';

  // --- customEvents -----------------------------------------------------------------------
  const [isSendingCustomEvent, setIsSendingCustomEvent] = useState(false);
  const [customEventFeedback, setCustomEventFeedback] =
    useState<Feedback>(null);

  const runCustomEventPreset = useCallback(
    async (
      properties: Record<string, string> | undefined,
      successMessage: string
    ) => {
      setIsSendingCustomEvent(true);
      setCustomEventFeedback(null);
      try {
        await trackCustomEvent('sample_event', properties);
        setCustomEventFeedback({ type: 'success', message: successMessage });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setCustomEventFeedback({ type: 'error', message });
      } finally {
        setIsSendingCustomEvent(false);
      }
    },
    []
  );

  const onTrackSampleEventPreset = useCallback(
    () => runCustomEventPreset(undefined, 'Tracked "sample_event" (no props)'),
    [runCustomEventPreset]
  );
  const onTrackSampleEventWithPropsPreset = useCallback(
    () =>
      runCustomEventPreset(
        SAMPLE_CUSTOM_EVENT_PROPERTIES,
        'Tracked "sample_event" (with props)'
      ),
    [runCustomEventPreset]
  );

  const customEventsResultText = customEventFeedback
    ? `${customEventFeedback.type === 'success' ? '✓' : '✕'} ${customEventFeedback.message}`
    : 'No custom event tracked yet';

  // --- locale -------------------------------------------------------------------------------
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
  const connectionResultText = !hasSsoEnvVars
    ? 'Missing OCTOPUS_SSO_USER_ID / OCTOPUS_SSO_USER_TOKEN — see the example README'
    : [
        isConnectingUser
          ? 'Connecting…'
          : isMockUserConnected
            ? 'Connected'
            : 'Disconnected',
        connectionError ? `✕ ${connectionError}` : null,
      ]
        .filter(Boolean)
        .join('\n');

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

  // --- createPost -----------------------------------------------------------------------------
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [createPostFeedback, setCreatePostFeedback] = useState<Feedback>(null);

  const runCreatePostPreset = useCallback(
    async (
      prefilledPost: Parameters<typeof navigateToOctopusCreatePost>[0]
    ) => {
      setIsCreatingPost(true);
      setCreatePostFeedback(null);
      try {
        await navigateToOctopusCreatePost(prefilledPost);
        setCreatePostFeedback({
          type: 'success',
          message: 'Opened the create-post editor',
        });
      } catch (e) {
        const message = isNavigateToOctopusCreatePostError(e)
          ? `${e.code}: ${e.message}`
          : e instanceof Error
            ? e.message
            : String(e);
        setCreatePostFeedback({ type: 'error', message });
      } finally {
        setIsCreatingPost(false);
      }
    },
    []
  );

  const onCreatePostTextOnlyPreset = useCallback(
    () => runCreatePostPreset({ text: 'QA scenario — text-only post' }),
    [runCreatePostPreset]
  );
  const onCreatePostTextCtaPreset = useCallback(
    () =>
      runCreatePostPreset({
        text: 'QA scenario — text + CTA post',
        cta: { url: 'https://example.com', label: 'Learn more' },
      }),
    [runCreatePostPreset]
  );
  const onCreatePostTextImagePreset = useCallback(
    () =>
      runCreatePostPreset({
        text: 'QA scenario — text + bundled image post',
        imageUri: BUNDLED_SAMPLE_IMAGE_NAME,
      }),
    [runCreatePostPreset]
  );
  const onCreatePostFullPreset = useCallback(
    () =>
      runCreatePostPreset({
        text: 'QA scenario — full post',
        imageUri: BUNDLED_SAMPLE_IMAGE_NAME,
        cta: { url: 'https://example.com', label: 'Learn more' },
      }),
    [runCreatePostPreset]
  );
  const onCreatePostImageOnlyPreset = useCallback(
    () => runCreatePostPreset({ imageUri: BUNDLED_SAMPLE_IMAGE_NAME }),
    [runCreatePostPreset]
  );

  const createPostResultText = createPostFeedback
    ? `${createPostFeedback.type === 'success' ? '✓' : '✕'} ${createPostFeedback.message}`
    : 'No preset run yet';

  // --- initialScreen --------------------------------------------------------------------------
  const [isOpeningInitialScreen, setIsOpeningInitialScreen] = useState(false);
  const [initialScreenFeedback, setInitialScreenFeedback] =
    useState<Feedback>(null);

  const runInitialScreenPreset = useCallback(
    async (screen: OctopusInitialScreen, successMessage: string) => {
      setIsOpeningInitialScreen(true);
      setInitialScreenFeedback(null);
      try {
        await openUI({ initialScreen: screen });
        setInitialScreenFeedback({ type: 'success', message: successMessage });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setInitialScreenFeedback({ type: 'error', message });
      } finally {
        setIsOpeningInitialScreen(false);
      }
    },
    []
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
          member: {
            clientUserId: process.env.OCTOPUS_SSO_USER_ID as string,
          },
        },
        "Opened the SSO member's posts (by clientUserId)"
      ),
    [runInitialScreenPreset]
  );
  // Resolves the SSO member's Octopus profile id first — the way a host holding only an
  // Octopus id (e.g. from fetchCommunityData) would open the activity screen.
  const onInitialScreenActivityByProfileIdPreset = useCallback(async () => {
    setIsOpeningInitialScreen(true);
    setInitialScreenFeedback(null);
    try {
      const clientUserId = process.env.OCTOPUS_SSO_USER_ID as string;
      const data = await fetchCommunityData({ clientUserId });
      if (!data) {
        setInitialScreenFeedback({
          type: 'error',
          message: 'No community data for the SSO member — connect first',
        });
        return;
      }
      await openUI({
        initialScreen: {
          type: 'activity',
          member: { profileId: data.profileId },
        },
      });
      setInitialScreenFeedback({
        type: 'success',
        message: `Opened the member's posts (by profileId ${data.profileId})`,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setInitialScreenFeedback({ type: 'error', message });
    } finally {
      setIsOpeningInitialScreen(false);
    }
  }, []);
  const onInitialScreenProfilePreset = useCallback(
    () =>
      runInitialScreenPreset(
        {
          type: 'profile',
          clientUserId: process.env.OCTOPUS_SSO_USER_ID as string,
        },
        "Opened the SSO member's profile"
      ),
    [runInitialScreenPreset]
  );
  const onInitialScreenOwnProfilePreset = useCallback(
    () =>
      runInitialScreenPreset(
        { type: 'profile' },
        "Opened the connected user's own profile"
      ),
    [runInitialScreenPreset]
  );

  const initialScreenResultText = initialScreenFeedback
    ? `${initialScreenFeedback.type === 'success' ? '✓' : '✕'} ${initialScreenFeedback.message}`
    : 'No preset run yet';

  // --- reactions --------------------------------------------------------------------------
  const hasDemoPostId = !!process.env.OCTOPUS_DEMO_POST_ID;
  const [isReactingBusy, setIsReactingBusy] = useState(false);
  const [reactionsFeedback, setReactionsFeedback] = useState<Feedback>(null);

  const runReactionPreset = useCallback(
    async (reaction: OctopusReactionKind | null, successMessage: string) => {
      setIsReactingBusy(true);
      setReactionsFeedback(null);
      try {
        const postId = process.env.OCTOPUS_DEMO_POST_ID as string;
        await setReaction(postId, reaction);
        setReactionsFeedback({ type: 'success', message: successMessage });
      } catch (e) {
        const message = isSetReactionError(e)
          ? `${e.code}: ${e.message}`
          : e instanceof Error
            ? e.message
            : String(e);
        setReactionsFeedback({ type: 'error', message });
      } finally {
        setIsReactingBusy(false);
      }
    },
    []
  );

  const reactionsResultText = !hasDemoPostId
    ? 'Set OCTOPUS_DEMO_POST_ID in .env to run these presets — see the example README'
    : reactionsFeedback
      ? `${reactionsFeedback.type === 'success' ? '✓' : '✕'} ${reactionsFeedback.message}`
      : 'No reaction applied yet';

  // --- profileFieldsLock ----------------------------------------------------------------------
  const [isProfileFieldsLockBusy, setIsProfileFieldsLockBusy] = useState(false);
  const [profileFieldsLockFeedback, setProfileFieldsLockFeedback] =
    useState<Feedback>(null);

  const runProfileFieldsLockPreset = useCallback(
    async (lock: ProfileFieldsLock | null, successMessage: string) => {
      setIsProfileFieldsLockBusy(true);
      setProfileFieldsLockFeedback(null);
      try {
        await debugOverrideProfileFieldsLock(lock);
        setProfileFieldsLockFeedback({
          type: 'success',
          message: successMessage,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setProfileFieldsLockFeedback({ type: 'error', message });
      } finally {
        setIsProfileFieldsLockBusy(false);
      }
    },
    []
  );

  const profileFieldsLockResultText = profileFieldsLockFeedback
    ? `${profileFieldsLockFeedback.type === 'success' ? '✓' : '✕'} ${profileFieldsLockFeedback.message}`
    : 'No override applied yet';

  // --- contentOptions -------------------------------------------------------------------------
  const [isContentOptionsBusy, setIsContentOptionsBusy] = useState(false);
  const [contentOptionsFeedback, setContentOptionsFeedback] =
    useState<Feedback>(null);

  const runContentOptionsPreset = useCallback(
    async (options: ContentOptions | null, successMessage: string) => {
      setIsContentOptionsBusy(true);
      setContentOptionsFeedback(null);
      try {
        await debugOverrideContentOptions(options);
        setContentOptionsFeedback({
          type: 'success',
          message: successMessage,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setContentOptionsFeedback({ type: 'error', message });
      } finally {
        setIsContentOptionsBusy(false);
      }
    },
    []
  );

  const contentOptionsResultText = contentOptionsFeedback
    ? `${contentOptionsFeedback.type === 'success' ? '✓' : '✕'} ${contentOptionsFeedback.message}`
    : 'No override applied yet';

  // --- termsAcceptance ------------------------------------------------------------------------
  const [isTermsAcceptanceBusy, setIsTermsAcceptanceBusy] = useState(false);
  const [termsAcceptanceFeedback, setTermsAcceptanceFeedback] =
    useState<Feedback>(null);

  const runTermsAcceptancePreset = useCallback(
    async (mode: TermsAcceptanceMode | null, successMessage: string) => {
      setIsTermsAcceptanceBusy(true);
      setTermsAcceptanceFeedback(null);
      try {
        await debugOverrideTermsAcceptanceMode(mode);
        setTermsAcceptanceFeedback({
          type: 'success',
          message: successMessage,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setTermsAcceptanceFeedback({ type: 'error', message });
      } finally {
        setIsTermsAcceptanceBusy(false);
      }
    },
    []
  );

  const termsAcceptanceResultText = termsAcceptanceFeedback
    ? `${termsAcceptanceFeedback.type === 'success' ? '✓' : '✕'} ${termsAcceptanceFeedback.message}`
    : 'No override applied yet';

  // --- communityData --------------------------------------------------------------------------
  const [isCommunityDataBusy, setIsCommunityDataBusy] = useState(false);
  const [communityDataFeedback, setCommunityDataFeedback] =
    useState<Feedback>(null);
  const [lastProfileId, setLastProfileId] = useState<string | null>(null);
  const [isObserving, setIsObserving] = useState(false);
  const [observedCommunityData, setObservedCommunityData] =
    useState<OctopusCommunityData | null>(null);
  const [hasObservedUpdate, setHasObservedUpdate] = useState(false);
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
  const onFetchByClientUserIdPreset = useCallback(async () => {
    setIsCommunityDataBusy(true);
    setCommunityDataFeedback(null);
    try {
      const clientUserId = process.env.OCTOPUS_SSO_USER_ID as string;
      const data = await fetchCommunityData({ clientUserId });
      if (data) {
        setLastProfileId(data.profileId);
        setCommunityDataFeedback({
          type: 'success',
          message: `Found — profileId=${data.profileId}, messageCount=${data.messageCount ?? '—'}`,
        });
      } else {
        setCommunityDataFeedback({
          type: 'success',
          message: 'No community data for this clientUserId (unknown member)',
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setCommunityDataFeedback({ type: 'error', message });
    } finally {
      setIsCommunityDataBusy(false);
    }
  }, []);

  // Preset 2: fetch by profileId, reusing the id resolved by the last successful lookup.
  const onFetchByProfileIdPreset = useCallback(async () => {
    if (!lastProfileId) return;
    setIsCommunityDataBusy(true);
    setCommunityDataFeedback(null);
    try {
      const data = await fetchCommunityData({ profileId: lastProfileId });
      setCommunityDataFeedback({
        type: 'success',
        message: data
          ? `Found — profileId=${data.profileId}, messageCount=${data.messageCount ?? '—'}`
          : 'No community data for this profileId (unknown member)',
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setCommunityDataFeedback({ type: 'error', message });
    } finally {
      setIsCommunityDataBusy(false);
    }
  }, [lastProfileId]);

  // Preset 3: start observing by clientUserId. Updates surface through the listener wired
  // above (observedCommunityData / hasObservedUpdate).
  const onStartObservingPreset = useCallback(async () => {
    setIsCommunityDataBusy(true);
    setCommunityDataFeedback(null);
    setHasObservedUpdate(false);
    try {
      const clientUserId = process.env.OCTOPUS_SSO_USER_ID as string;
      await startObservingCommunityData({ clientUserId });
      setIsObserving(true);
      setCommunityDataFeedback({
        type: 'success',
        message: 'Observation started',
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setCommunityDataFeedback({ type: 'error', message });
    } finally {
      setIsCommunityDataBusy(false);
    }
  }, []);

  // Preset 4: stop observing.
  const onStopObservingPreset = useCallback(async () => {
    setIsCommunityDataBusy(true);
    setCommunityDataFeedback(null);
    try {
      await stopObservingCommunityData();
      setIsObserving(false);
      setCommunityDataFeedback({
        type: 'success',
        message: 'Observation stopped',
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setCommunityDataFeedback({ type: 'error', message });
    } finally {
      setIsCommunityDataBusy(false);
    }
  }, []);

  // Preset 5: contract check — neither id set must throw synchronously, before any native
  // call, rather than reject a promise. Caught with a plain try/catch, not `.catch`, on
  // purpose: `fetchCommunityData` throws before it ever returns a promise in this case.
  const onContractViolationPreset = useCallback(() => {
    setCommunityDataFeedback(null);
    try {
      // `{}` type-checks fine (both ids are optional) but deliberately violates the
      // "exactly one id" contract enforced at runtime by requireExactlyOneMemberId.
      fetchCommunityData({});
      setCommunityDataFeedback({
        type: 'error',
        message: 'Expected a synchronous throw, but none was raised',
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setCommunityDataFeedback({
        type: 'success',
        message: `Threw as expected — ${message}`,
      });
    }
  }, []);

  // Preset 6: open a small host-rendered "client profile" page. This is the one preset that
  // leaves the scenario screen — see the ClientProfileView type above.
  const onOpenClientProfilePreset = useCallback(async () => {
    const memberId = lastProfileId
      ? { profileId: lastProfileId }
      : hasSsoEnvVars
        ? { clientUserId: process.env.OCTOPUS_SSO_USER_ID as string }
        : null;
    if (!memberId) return;
    try {
      const data = await fetchCommunityData(memberId);
      setClientProfileView(
        data ? { status: 'data', data } : { status: 'unknown' }
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setClientProfileView({ status: 'error', message });
    }
  }, [lastProfileId, hasSsoEnvVars]);

  const onCloseClientProfilePreset = useCallback(
    () => setClientProfileView(null),
    []
  );

  const communityDataResultText = [
    !hasSsoEnvVars
      ? 'Set OCTOPUS_SSO_USER_ID / OCTOPUS_SSO_USER_TOKEN in .env to run the clientUserId presets'
      : null,
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
    communityDataFeedback
      ? `${communityDataFeedback.type === 'success' ? '✓' : '✕'} ${communityDataFeedback.message}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  // --- syncFollowGroups -------------------------------------------------------------------
  const [isSyncingFollowGroups, setIsSyncingFollowGroups] = useState(false);
  const [followedByGroupId, setFollowedByGroupId] = useState<
    Record<string, boolean>
  >(() => Object.fromEntries(SAMPLE_GROUP_IDS.map((id) => [id, false])));
  const [syncFollowGroupsFeedback, setSyncFollowGroupsFeedback] =
    useState<Feedback>(null);

  const runSyncFollowGroupsPreset = useCallback(
    async (followedFor: (groupId: string) => boolean) => {
      setIsSyncingFollowGroups(true);
      setSyncFollowGroupsFeedback(null);
      const actions = SAMPLE_GROUP_IDS.map((groupId) => ({
        groupId,
        followed: followedFor(groupId),
        actionDate: new Date(),
      }));
      try {
        const results = await syncFollowGroups(actions);
        // No live groups list to read back (fetchGroups isn't bridged on RN), so this
        // screen's own last-requested value IS its notion of "currently followed" —
        // that is what the next "Invert all" tap flips, not a server-confirmed state.
        setFollowedByGroupId((prev) => {
          const next = { ...prev };
          for (const action of actions) next[action.groupId] = action.followed;
          return next;
        });
        const summary = results
          .map((r) => `${r.groupId} → ${r.status}`)
          .join(', ');
        setSyncFollowGroupsFeedback({
          type: 'success',
          message: `Synced ${actions.length} group(s): ${summary}`,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setSyncFollowGroupsFeedback({ type: 'error', message });
      } finally {
        setIsSyncingFollowGroups(false);
      }
    },
    []
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

  const syncFollowGroupsResultText = [
    `Sample groups: ${SAMPLE_GROUP_IDS.map(
      (id) => `${id}=${followedByGroupId[id] ? 'followed' : 'unfollowed'}`
    ).join(', ')}`,
    syncFollowGroupsFeedback
      ? `${syncFollowGroupsFeedback.type === 'success' ? '✓' : '✕'} ${syncFollowGroupsFeedback.message}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  if (clientProfileView) {
    return (
      <ScrollView
        style={[styles.container, isDark && styles.containerDark]}
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

  return (
    <ScrollView
      style={[styles.container, isDark && styles.containerDark]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator
    >
      {/* Connection */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Connection</Text>
        {!hasSsoEnvVars && (
          <Text style={[styles.hint, { color: secondaryColor }]}>
            Set OCTOPUS_SSO_USER_ID and OCTOPUS_SSO_USER_TOKEN in .env to run
            these presets — see the example README.
          </Text>
        )}
        <View style={styles.presetRow}>
          <PresetButton
            testID="qa-preset-connection-1"
            label="Preset 1 · Connect (SSO test user)"
            onPress={onConnectUser}
            primaryColor={primaryColor}
            disabled={!hasSsoEnvVars || isMockUserConnected}
            loading={isConnectingUser}
          />
          <PresetButton
            testID="qa-preset-connection-2"
            label="Preset 2 · Disconnect"
            onPress={onDisconnectUser}
            primaryColor={primaryColor}
            disabled={!hasSsoEnvVars || !isMockUserConnected}
          />
        </View>
        <ScenarioResultPanel
          testID="connection-result"
          isDark={isDark}
          text={connectionResultText}
        />
      </View>

      {/* Community Access */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          Community Access
        </Text>
        <View style={styles.presetRow}>
          <PresetButton
            testID="qa-preset-communityAccess-1"
            label="Preset 1 · Override · grant access"
            onPress={onGrantAccessPreset}
            primaryColor={primaryColor}
            loading={isCommunityAccessBusy}
          />
          <PresetButton
            testID="qa-preset-communityAccess-2"
            label="Preset 2 · Override · deny access"
            onPress={onDenyAccessPreset}
            primaryColor={primaryColor}
            loading={isCommunityAccessBusy}
          />
          <PresetButton
            testID="qa-preset-communityAccess-3"
            label="Preset 3 · Track · has access"
            onPress={onTrackHasAccessPreset}
            primaryColor={primaryColor}
            loading={isCommunityAccessBusy}
          />
        </View>
        <ScenarioResultPanel
          testID="communityAccess-result"
          isDark={isDark}
          text={communityAccessResultText}
        />
      </View>

      {/* Not-Seen Notifications */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          Not-Seen Notifications
        </Text>
        <View style={styles.presetRow}>
          <PresetButton
            testID="qa-preset-notSeenNotifications-1"
            label="Preset 1 · Open Octopus (full-page route)"
            onPress={onOpenOctopusPreset}
            primaryColor={primaryColor}
            loading={isOpeningOctopus}
          />
          <PresetButton
            testID="qa-preset-notSeenNotifications-2"
            label="Preset 2 · Refresh not-seen count"
            onPress={onRefreshNotifications}
            primaryColor={primaryColor}
            loading={isUpdatingNotifications}
          />
        </View>
        <ScenarioResultPanel
          testID="notSeenNotifications-result"
          isDark={isDark}
          text={notSeenNotificationsResultText}
        />
      </View>

      {/* Push Notifications */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          Push Notifications
        </Text>
        <Text style={[styles.hint, { color: secondaryColor }]}>
          Replays a bundled sample payload through the same
          isOctopusNotification → getOctopusNotification → openNotification path
          a real push tap takes.
        </Text>
        <View style={styles.presetRow}>
          <PresetButton
            testID="qa-preset-pushNotifications-1"
            label="Preset 1 · Open sample notification (deep link)"
            onPress={onReplaySampleNotificationPreset}
            primaryColor={primaryColor}
            loading={isReplayingNotification}
          />
        </View>
        <ScenarioResultPanel
          testID="pushNotifications-result"
          isDark={isDark}
          text={pushNotificationsResultText}
        />
      </View>

      {/* Custom Events */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          Custom Events
        </Text>
        <View style={styles.presetRow}>
          <PresetButton
            testID="qa-preset-customEvents-1"
            label="Preset 1 · Track sample event (no props)"
            onPress={onTrackSampleEventPreset}
            primaryColor={primaryColor}
            loading={isSendingCustomEvent}
          />
          <PresetButton
            testID="qa-preset-customEvents-2"
            label="Preset 2 · Track sample event (with props)"
            onPress={onTrackSampleEventWithPropsPreset}
            primaryColor={primaryColor}
            loading={isSendingCustomEvent}
          />
        </View>
        <ScenarioResultPanel
          testID="customEvents-result"
          isDark={isDark}
          text={customEventsResultText}
        />
      </View>

      {/* Locale */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Locale</Text>
        <View style={styles.presetRow}>
          <PresetButton
            testID="qa-preset-locale-1"
            label="Preset 1 · Force fr"
            onPress={() => onCommunityLocaleOverrideChange('fr')}
            primaryColor={primaryColor}
            disabled={communityLocaleOverride === 'fr'}
          />
          <PresetButton
            testID="qa-preset-locale-2"
            label="Preset 2 · Force en"
            onPress={() => onCommunityLocaleOverrideChange('en')}
            primaryColor={primaryColor}
            disabled={communityLocaleOverride === 'en'}
          />
          <PresetButton
            testID="qa-preset-locale-3"
            label="Preset 3 · Reset to system"
            onPress={() => onCommunityLocaleOverrideChange('system')}
            primaryColor={primaryColor}
            disabled={communityLocaleOverride === 'system'}
          />
        </View>
        <ScenarioResultPanel
          testID="locale-result"
          isDark={isDark}
          text={localeResultText}
        />
      </View>

      {/* Theme */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Theme</Text>
        <Text style={[styles.hint, { color: secondaryColor }]}>
          Re-initializes the SDK with the chosen theme, same as the Theme tab.
        </Text>
        <View style={styles.presetRow}>
          <PresetButton
            testID="qa-preset-theme-1"
            label="Preset 1 · Default theme"
            onPress={onDefaultThemePreset}
            primaryColor={primaryColor}
          />
          <PresetButton
            testID="qa-preset-theme-2"
            label="Preset 2 · Custom theme (brand colors + logo)"
            onPress={onCustomThemePreset}
            primaryColor={primaryColor}
          />
        </View>
        <ScenarioResultPanel
          testID="theme-result"
          isDark={isDark}
          text={themeResultText}
        />
      </View>

      {/* Create Post */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          Create Post
        </Text>
        <View style={styles.presetRow}>
          <PresetButton
            testID="qa-preset-createPost-1"
            label="Preset 1 · Text only"
            onPress={onCreatePostTextOnlyPreset}
            primaryColor={primaryColor}
            loading={isCreatingPost}
          />
          <PresetButton
            testID="qa-preset-createPost-2"
            label="Preset 2 · Text + CTA"
            onPress={onCreatePostTextCtaPreset}
            primaryColor={primaryColor}
            loading={isCreatingPost}
          />
          <PresetButton
            testID="qa-preset-createPost-3"
            label="Preset 3 · Text + bundled image"
            onPress={onCreatePostTextImagePreset}
            primaryColor={primaryColor}
            loading={isCreatingPost}
          />
          <PresetButton
            testID="qa-preset-createPost-4"
            label="Preset 4 · Full (text + CTA + bundled image)"
            onPress={onCreatePostFullPreset}
            primaryColor={primaryColor}
            loading={isCreatingPost}
          />
          <PresetButton
            testID="qa-preset-createPost-5"
            label="Preset 5 · Image only (bundled)"
            onPress={onCreatePostImageOnlyPreset}
            primaryColor={primaryColor}
            loading={isCreatingPost}
          />
        </View>
        <ScenarioResultPanel
          testID="createPost-result"
          isDark={isDark}
          text={createPostResultText}
        />
      </View>

      {/* Initial screen */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          Initial screen
        </Text>
        {!hasDemoPostId && (
          <Text style={[styles.hint, { color: secondaryColor }]}>
            Set OCTOPUS_DEMO_POST_ID in .env to run the post preset — see the
            example README.
          </Text>
        )}
        {!hasSsoEnvVars && (
          <Text style={[styles.hint, { color: secondaryColor }]}>
            Set OCTOPUS_SSO_USER_ID / OCTOPUS_SSO_USER_TOKEN in .env to run the
            member presets — see the example README.
          </Text>
        )}
        <View style={styles.presetRow}>
          <PresetButton
            testID="qa-preset-initialScreen-1"
            label="Preset 1 · Main feed"
            onPress={onInitialScreenMainFeedPreset}
            primaryColor={primaryColor}
            loading={isOpeningInitialScreen}
          />
          <PresetButton
            testID="qa-preset-initialScreen-2"
            label="Preset 2 · Demo post (bridge mode)"
            onPress={onInitialScreenPostPreset}
            primaryColor={primaryColor}
            disabled={!hasDemoPostId}
            loading={isOpeningInitialScreen}
          />
          <PresetButton
            testID="qa-preset-initialScreen-3"
            label="Preset 3 · Sample group (bridge mode)"
            onPress={onInitialScreenGroupPreset}
            primaryColor={primaryColor}
            loading={isOpeningInitialScreen}
          />
          <PresetButton
            testID="qa-preset-initialScreen-4"
            label="Preset 4 · Member posts (activity by clientUserId)"
            onPress={onInitialScreenActivityByClientUserIdPreset}
            primaryColor={primaryColor}
            disabled={!hasSsoEnvVars}
            loading={isOpeningInitialScreen}
          />
          <PresetButton
            testID="qa-preset-initialScreen-5"
            label="Preset 5 · Member posts (activity by profileId)"
            onPress={onInitialScreenActivityByProfileIdPreset}
            primaryColor={primaryColor}
            disabled={!hasSsoEnvVars}
            loading={isOpeningInitialScreen}
          />
          <PresetButton
            testID="qa-preset-initialScreen-6"
            label="Preset 6 · Member profile (by clientUserId)"
            onPress={onInitialScreenProfilePreset}
            primaryColor={primaryColor}
            disabled={!hasSsoEnvVars}
            loading={isOpeningInitialScreen}
          />
          <PresetButton
            testID="qa-preset-initialScreen-7"
            label="Preset 7 · Own profile (no id)"
            onPress={onInitialScreenOwnProfilePreset}
            primaryColor={primaryColor}
            loading={isOpeningInitialScreen}
          />
        </View>
        <ScenarioResultPanel
          testID="initialScreen-result"
          isDark={isDark}
          text={initialScreenResultText}
        />
      </View>

      {/* Reactions */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Reactions</Text>
        {!hasDemoPostId && (
          <Text style={[styles.hint, { color: secondaryColor }]}>
            Set OCTOPUS_DEMO_POST_ID in .env to run these presets — see the
            example README.
          </Text>
        )}
        <View style={styles.presetRow}>
          <PresetButton
            testID="qa-preset-reactions-1"
            label="Preset 1 · React heart ❤️"
            onPress={() => runReactionPreset('heart', 'Reacted heart ❤️')}
            primaryColor={primaryColor}
            disabled={!hasDemoPostId}
            loading={isReactingBusy}
          />
          <PresetButton
            testID="qa-preset-reactions-2"
            label="Preset 2 · Change reaction to joy 😂"
            onPress={() => runReactionPreset('joy', 'Reacted joy 😂')}
            primaryColor={primaryColor}
            disabled={!hasDemoPostId}
            loading={isReactingBusy}
          />
          <PresetButton
            testID="qa-preset-reactions-3"
            label="Preset 3 · Unreact (null)"
            onPress={() => runReactionPreset(null, 'Reaction removed')}
            primaryColor={primaryColor}
            disabled={!hasDemoPostId}
            loading={isReactingBusy}
          />
          <PresetButton
            testID="qa-preset-reactions-4"
            label="Preset 4 · React mouthOpen 😮"
            onPress={() =>
              runReactionPreset('mouthOpen', 'Reacted mouthOpen 😮')
            }
            primaryColor={primaryColor}
            disabled={!hasDemoPostId}
            loading={isReactingBusy}
          />
          <PresetButton
            testID="qa-preset-reactions-5"
            label="Preset 5 · React clap 👏"
            onPress={() => runReactionPreset('clap', 'Reacted clap 👏')}
            primaryColor={primaryColor}
            disabled={!hasDemoPostId}
            loading={isReactingBusy}
          />
          <PresetButton
            testID="qa-preset-reactions-6"
            label="Preset 6 · React cry 😢"
            onPress={() => runReactionPreset('cry', 'Reacted cry 😢')}
            primaryColor={primaryColor}
            disabled={!hasDemoPostId}
            loading={isReactingBusy}
          />
          <PresetButton
            testID="qa-preset-reactions-7"
            label="Preset 7 · React rage 😡"
            onPress={() => runReactionPreset('rage', 'Reacted rage 😡')}
            primaryColor={primaryColor}
            disabled={!hasDemoPostId}
            loading={isReactingBusy}
          />
        </View>
        <ScenarioResultPanel
          testID="reactions-result"
          isDark={isDark}
          text={reactionsResultText}
        />
      </View>

      {/* Profile Fields Lock */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          Profile Fields Lock
        </Text>
        <View style={styles.presetRow}>
          <PresetButton
            testID="qa-preset-profileFieldsLock-1"
            label="Preset 1 · All editable (default / no-op)"
            onPress={() =>
              runProfileFieldsLockPreset(
                { nickname: 'editable', avatar: 'editable', bio: 'editable' },
                'Override applied: all editable'
              )
            }
            primaryColor={primaryColor}
            loading={isProfileFieldsLockBusy}
          />
          <PresetButton
            testID="qa-preset-profileFieldsLock-2"
            label="Preset 2 · Pseudo + avatar read-only, bio hidden"
            onPress={() =>
              runProfileFieldsLockPreset(
                { nickname: 'readOnly', avatar: 'readOnly', bio: 'disabled' },
                'Override applied: pseudo/avatar read-only, bio hidden'
              )
            }
            primaryColor={primaryColor}
            loading={isProfileFieldsLockBusy}
          />
          <PresetButton
            testID="qa-preset-profileFieldsLock-3"
            label="Preset 3 · Bio-only editable"
            onPress={() =>
              runProfileFieldsLockPreset(
                { nickname: 'readOnly', avatar: 'readOnly', bio: 'editable' },
                'Override applied: bio-only editable'
              )
            }
            primaryColor={primaryColor}
            loading={isProfileFieldsLockBusy}
          />
          <PresetButton
            testID="qa-preset-profileFieldsLock-clear"
            label="Clear override (backend default)"
            onPress={() => runProfileFieldsLockPreset(null, 'Override cleared')}
            primaryColor={primaryColor}
            loading={isProfileFieldsLockBusy}
          />
        </View>
        <ScenarioResultPanel
          testID="profileFieldsLock-result"
          isDark={isDark}
          text={profileFieldsLockResultText}
        />
      </View>

      {/* Content Options */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          Content Options
        </Text>
        <View style={styles.presetRow}>
          <PresetButton
            testID="qa-preset-contentOptions-1"
            label="Preset 1 · All enabled (default / no-op)"
            onPress={() =>
              runContentOptionsPreset({}, 'Override applied: all enabled')
            }
            primaryColor={primaryColor}
            loading={isContentOptionsBusy}
          />
          <PresetButton
            testID="qa-preset-contentOptions-2"
            label="Preset 2 · Post: pictures off"
            onPress={() =>
              runContentOptionsPreset(
                { post: { enablePictures: false } },
                'Override applied: post pictures off'
              )
            }
            primaryColor={primaryColor}
            loading={isContentOptionsBusy}
          />
          <PresetButton
            testID="qa-preset-contentOptions-3"
            label="Preset 3 · Post: polls off"
            onPress={() =>
              runContentOptionsPreset(
                { post: { enablePolls: false } },
                'Override applied: post polls off'
              )
            }
            primaryColor={primaryColor}
            loading={isContentOptionsBusy}
          />
          <PresetButton
            testID="qa-preset-contentOptions-4"
            label="Preset 4 · Post: pictures + polls off"
            onPress={() =>
              runContentOptionsPreset(
                { post: { enablePictures: false, enablePolls: false } },
                'Override applied: post pictures + polls off'
              )
            }
            primaryColor={primaryColor}
            loading={isContentOptionsBusy}
          />
          <PresetButton
            testID="qa-preset-contentOptions-5"
            label="Preset 5 · Comment: pictures off"
            onPress={() =>
              runContentOptionsPreset(
                { comment: { enablePictures: false } },
                'Override applied: comment pictures off'
              )
            }
            primaryColor={primaryColor}
            loading={isContentOptionsBusy}
          />
          <PresetButton
            testID="qa-preset-contentOptions-6"
            label="Preset 6 · Reply: pictures off"
            onPress={() =>
              runContentOptionsPreset(
                { reply: { enablePictures: false } },
                'Override applied: reply pictures off'
              )
            }
            primaryColor={primaryColor}
            loading={isContentOptionsBusy}
          />
          <PresetButton
            testID="qa-preset-contentOptions-clear"
            label="Clear override (backend default)"
            onPress={() => runContentOptionsPreset(null, 'Override cleared')}
            primaryColor={primaryColor}
            loading={isContentOptionsBusy}
          />
        </View>
        <ScenarioResultPanel
          testID="contentOptions-result"
          isDark={isDark}
          text={contentOptionsResultText}
        />
      </View>

      {/* Terms Acceptance */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          Terms Acceptance
        </Text>
        <View style={styles.presetRow}>
          <PresetButton
            testID="qa-preset-termsAcceptance-1"
            label="Preset 1 · Implicit (default / no-op)"
            onPress={() =>
              runTermsAcceptancePreset('implicit', 'Override applied: implicit')
            }
            primaryColor={primaryColor}
            loading={isTermsAcceptanceBusy}
          />
          <PresetButton
            testID="qa-preset-termsAcceptance-2"
            label="Preset 2 · Explicit — multi checkbox"
            onPress={() =>
              runTermsAcceptancePreset(
                'explicitMultiCheckbox',
                'Override applied: explicit multi checkbox'
              )
            }
            primaryColor={primaryColor}
            loading={isTermsAcceptanceBusy}
          />
          <PresetButton
            testID="qa-preset-termsAcceptance-3"
            label="Preset 3 · Explicit — single checkbox"
            onPress={() =>
              runTermsAcceptancePreset(
                'explicitSingleCheckbox',
                'Override applied: explicit single checkbox'
              )
            }
            primaryColor={primaryColor}
            loading={isTermsAcceptanceBusy}
          />
          <PresetButton
            testID="qa-preset-termsAcceptance-clear"
            label="Clear override (backend default)"
            onPress={() => runTermsAcceptancePreset(null, 'Override cleared')}
            primaryColor={primaryColor}
            loading={isTermsAcceptanceBusy}
          />
        </View>
        <ScenarioResultPanel
          testID="termsAcceptance-result"
          isDark={isDark}
          text={termsAcceptanceResultText}
        />
      </View>

      {/* Community Data */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          Community Data
        </Text>
        <View style={styles.presetRow}>
          <PresetButton
            testID="qa-preset-communityData-1"
            label="Preset 1 · Fetch by clientUserId"
            onPress={onFetchByClientUserIdPreset}
            primaryColor={primaryColor}
            disabled={!hasSsoEnvVars}
            loading={isCommunityDataBusy}
          />
          <PresetButton
            testID="qa-preset-communityData-2"
            label="Preset 2 · Fetch by profileId (from the last lookup)"
            onPress={onFetchByProfileIdPreset}
            primaryColor={primaryColor}
            disabled={!lastProfileId}
            loading={isCommunityDataBusy}
          />
          <PresetButton
            testID="qa-preset-communityData-3"
            label="Preset 3 · Observe by clientUserId (start)"
            onPress={onStartObservingPreset}
            primaryColor={primaryColor}
            disabled={!hasSsoEnvVars}
            loading={isCommunityDataBusy}
          />
          <PresetButton
            testID="qa-preset-communityData-4"
            label="Preset 4 · Stop observing"
            onPress={onStopObservingPreset}
            primaryColor={primaryColor}
            disabled={!isObserving}
            loading={isCommunityDataBusy}
          />
          <PresetButton
            testID="qa-preset-communityData-5"
            label="Preset 5 · Contract: both / neither id throws"
            onPress={onContractViolationPreset}
            primaryColor={primaryColor}
          />
          <PresetButton
            testID="qa-preset-communityData-6"
            label="Preset 6 · Open the host-rendered profile page"
            onPress={onOpenClientProfilePreset}
            primaryColor={primaryColor}
            disabled={!lastProfileId && !hasSsoEnvVars}
          />
        </View>
        <ScenarioResultPanel
          testID="communityData-result"
          isDark={isDark}
          text={communityDataResultText}
        />
      </View>

      {/* Sync Followed Groups */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          Sync Followed Groups
        </Text>
        <Text style={[styles.hint, { color: secondaryColor }]}>
          Batches follow/unfollow across a bundled set of sample group ids (RN
          has no fetchGroups binding yet). "Invert all" flips whatever this
          screen last requested for each id, not a server-confirmed state.
        </Text>
        <View style={styles.presetRow}>
          <PresetButton
            testID="qa-preset-syncFollowGroups-1"
            label="Preset 1 · Invert all"
            onPress={onInvertAllGroupsPreset}
            primaryColor={primaryColor}
            loading={isSyncingFollowGroups}
          />
          <PresetButton
            testID="qa-preset-syncFollowGroups-2"
            label="Preset 2 · FOLLOW all"
            onPress={onFollowAllGroupsPreset}
            primaryColor={primaryColor}
            loading={isSyncingFollowGroups}
          />
          <PresetButton
            testID="qa-preset-syncFollowGroups-3"
            label="Preset 3 · UNFOLLOW all"
            onPress={onUnfollowAllGroupsPreset}
            primaryColor={primaryColor}
            loading={isSyncingFollowGroups}
          />
        </View>
        <ScenarioResultPanel
          testID="syncFollowGroups-result"
          isDark={isDark}
          text={syncFollowGroupsResultText}
        />
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
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
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 16,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bottomSpacer: {
    height: 24,
  },
});
