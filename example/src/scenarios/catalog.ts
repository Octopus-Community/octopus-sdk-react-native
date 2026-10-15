// Outcome wording from the Android sample; API names are the RN bridge exports.
export const SCENARIO_TITLES = {
  unifiedProfile: 'Unified Profile',
  connection: 'Sign in and out as the demo user',
  groups: "Browse the community's groups",
  syncFollowGroups: 'Follow or unfollow every group at once',
  notSeenNotifications: 'Refresh the unread notification count',
  pushNotifications: 'Open a post from a push notification',
  communityAccess: 'Grant or deny access to the community',
  customEvents: 'Send a custom analytics event',
  locale: "Switch the community's language",
  lifecycle: 'Restart or stop the SDK',
  bridge: 'Open the post attached to a product',
  createPost: 'Start a post from the host app',
  reactions: 'React to a post from the host app',
  theme: "Apply the host's brand to the community",
  communityData: "Read a member's community profile",
  profileFieldsLock: 'Lock the profile fields the host owns',
  contentOptions: 'Change what members are allowed to post',
  termsAcceptance: 'Change how members accept the terms',
  forceNicknameChoice: 'Choose a nickname before the first contribution',
  consentTexts: 'Customize the community consent wordings',
  events: 'Watch what the SDK reports',
  refreshEntitlements: "Re-issue the demo user's entitlements",
  groupAccessDenied: 'Handle a member reaching a closed group',
  initialScreen: 'Open the community on a chosen screen',
  fullscreen: 'Open the community full screen',
  modal: 'Open the community as a modal',
  sheet: 'Open the community as a bottom sheet',
  trackABTests: 'Report which cohort the member is in',
  forceOctopusABTests: "Force Octopus's own A/B decision",
  embeddedBack: 'Try the embedded back button',
} as const;

export const SCENARIO_SUBTITLES = {
  unifiedProfile: 'Open member profiles in the host app or in the community.',
  connection:
    'The community shows the demo user as signed in: they can post, react and be notified.',
  groups:
    'Every group the community offers, with whether the demo user follows it.',
  syncFollowGroups:
    'The follow state of every group flips in one call, and the community reflects it.',
  notSeenNotifications:
    'The notification badge reflects the latest count fetched from the community.',
  pushNotifications:
    'A simulated push is recognised as an Octopus one and opens the post it points at.',
  communityAccess:
    'The community either opens normally, or shows its no-access state.',
  customEvents:
    'The event shows up in the Events log, with the properties you attached.',
  locale: "The community's own labels switch to the language you picked.",
  lifecycle:
    'The session ends and the community goes back to its not-connected state.',
  bridge:
    'A post tied to a host object opens — created on the spot the first time you ask for it.',
  createPost:
    'The composer opens pre-filled with the text, image or link the host handed over.',
  reactions: 'The reaction you picked shows on that post in the community.',
  theme:
    "The community adopts the host's colours, fonts and logo — or drops back to the SDK's own look.",
  communityData:
    "The member's community profile comes back, and keeps updating while you watch it.",
  profileFieldsLock:
    "The locked fields turn read-only in the community's profile editor.",
  contentOptions:
    'The composer offers only the kinds of content the community allows.',
  termsAcceptance:
    'The community asks for consent the way you picked, or stops asking altogether.',
  forceNicknameChoice:
    'Start the nickname field empty or prefilled with the generated nickname.',
  consentTexts:
    'Show community markdown notices and checkbox labels, with native fallback for blank or mismatched texts.',
  events: 'Every event the SDK emits, live, as the community is used.',
  refreshEntitlements:
    'The community picks up the entitlements you edited, without signing out.',
  groupAccessDenied:
    'The host is told a group was refused, instead of the community handling it alone.',
  initialScreen:
    'The community opens directly on the member, profile or feed you picked.',
  fullscreen: 'The community takes the whole screen, outside the tab bar.',
  modal:
    'The community covers the screen in a host-owned modal that you close yourself.',
  sheet: 'The community slides over this screen; swipe down to come back.',
  trackABTests: 'The host cohort is reported to Octopus analytics.',
  forceOctopusABTests:
    "The community's own access rule is overridden — granted or denied.",
  embeddedBack:
    'The host handles the back or close control on an embedded community.',
} as const;

export const SCENARIO_OUTCOMES = {
  unifiedProfile:
    'with the switch on, a member with an app id opens Client profile and the home profile button opens Activity; with it off, both open native profiles.',
  connection:
    'the Community tab greets the demo user, and the composer unlocks.',
  groups: 'the group list, with a follow state on each row.',
  syncFollowGroups:
    "every group's follow state matching what you just applied.",
  notSeenNotifications:
    'the latest unread count after a refresh or an incoming update.',
  pushNotifications:
    'the community opening on the post the notification named.',
  communityAccess: 'the community opening, or its no-access screen.',
  customEvents: 'the event at the top of the Events log.',
  locale: "the community's buttons and labels in the language you picked.",
  lifecycle: 'the community back in its not-connected state.',
  bridge: 'the post for that object.',
  createPost: 'the composer, pre-filled with what the host passed.',
  reactions: 'your reaction on the post you named.',
  theme: "the community in the host's colours, or in the SDK's default look.",
  communityData: "the member's nickname and ids, refreshing as they change.",
  profileFieldsLock: 'the locked fields greyed out in the profile editor.',
  contentOptions: 'the composer offering only the allowed content types.',
  termsAcceptance:
    'the consent step in the form you chose, or no consent step at all.',
  forceNicknameChoice:
    'the nickname screen before the first post, comment or reply, with an empty or prefilled field.',
  consentTexts:
    'the consent notice or sheet showing the community texts, or the SDK wording for blank fields and a mismatched mode.',
  events: 'the event stream filling up as you use the community.',
  refreshEntitlements: 'the abilities you granted, available in the community.',
  groupAccessDenied:
    "the host's own access-denied screen instead of the SDK's.",
  initialScreen: 'the community already on the screen you asked for.',
  fullscreen:
    'the community covering the screen; the back gesture returns here.',
  modal:
    "the community in a modal, closed by the X that leads the community's header.",
  sheet:
    'the community at sheet height, its own navigation staying inside the sheet.',
  trackABTests: 'the host cohort recorded without changing SDK access.',
  forceOctopusABTests:
    'the community following your forced value, not its own.',
  embeddedBack: 'the chosen control returning to this screen.',
} as const;

export type ScenarioId = keyof typeof SCENARIO_TITLES;

export const SCENARIO_APIS: Record<ScenarioId, string[]> = {
  unifiedProfile: ['addNavigateToProfileListener'],
  connection: ['connectUser'],
  groups: ['fetchGroups'],
  syncFollowGroups: ['syncFollowGroups'],
  notSeenNotifications: ['updateNotSeenNotificationsCount'],
  pushNotifications: ['getOctopusNotification'],
  communityAccess: ['overrideCommunityAccess'],
  customEvents: ['trackCustomEvent'],
  locale: ['overrideDefaultLocale'],
  lifecycle: ['reset', 'stop', 'switchCommunity'],
  bridge: ['fetchOrCreateClientObjectRelatedPost'],
  createPost: ['navigateToOctopusCreatePost'],
  reactions: ['setReaction'],
  theme: ['initialize', 'setThemeMode'],
  communityData: ['fetchCommunityData'],
  profileFieldsLock: ['debugOverrideProfileFieldsLock'],
  contentOptions: ['debugOverrideContentOptions'],
  termsAcceptance: ['debugOverrideTermsAcceptanceMode'],
  forceNicknameChoice: ['debugOverrideForceNicknameChoice'],
  consentTexts: [
    'debugOverrideConsentTexts',
    'debugOverrideTermsAcceptanceMode',
  ],
  events: ['addSDKEventListener'],
  refreshEntitlements: ['refreshEntitlements'],
  groupAccessDenied: ['setGroupAccessDeniedCallback'],
  initialScreen: ['openUI'],
  fullscreen: ['host: Community route'],
  modal: ['host: Modal'],
  sheet: ['host: Modal + drag handle'],
  trackABTests: ['trackCommunityAccess'],
  forceOctopusABTests: ['overrideCommunityAccess'],
  embeddedBack: ['OctopusUIView', 'openUI'],
};

import type { ScenarioSectionId } from '../navigation/anchors';
export const SCENARIO_SECTIONS: {
  id: ScenarioSectionId;
  title: string;
  scenarios: ScenarioId[];
}[] = [
  {
    id: 'sso',
    title: 'Sign-in & user',
    scenarios: [
      'unifiedProfile',
      'connection',
      'communityData',
      'profileFieldsLock',
      'termsAcceptance',
      'forceNicknameChoice',
      'consentTexts',
      'refreshEntitlements',
    ],
  },
  {
    id: 'presentation',
    title: 'Presentation modes',
    scenarios: [
      'initialScreen',
      'fullscreen',
      'modal',
      'sheet',
      'embeddedBack',
    ],
  },
  {
    id: 'community',
    title: 'Community & groups',
    scenarios: [
      'groups',
      'syncFollowGroups',
      'communityAccess',
      'bridge',
      'createPost',
      'reactions',
      'contentOptions',
      'groupAccessDenied',
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    scenarios: ['notSeenNotifications', 'pushNotifications'],
  },
  {
    id: 'appearance',
    title: 'Theme & language',
    scenarios: ['locale', 'theme'],
  },
  {
    id: 'host',
    title: 'Host callbacks & events',
    scenarios: [
      'customEvents',
      'lifecycle',
      'events',
      'trackABTests',
      'forceOctopusABTests',
    ],
  },
];

export function matchesQuery(id: ScenarioId, query: string): boolean {
  return [SCENARIO_TITLES[id], SCENARIO_SUBTITLES[id], ...SCENARIO_APIS[id]]
    .join(' ')
    .toLowerCase()
    .includes(query.trim().toLowerCase());
}
