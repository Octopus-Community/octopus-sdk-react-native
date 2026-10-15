import type { KeyValueRow } from '../components/KeyValueCard';

/** One card of the Debug info snapshot. */
export interface DebugInfoCard {
  title: string;
  rows: KeyValueRow[];
}

/** What the Debug info snapshot is built from — every value is already resolved by App. */
export interface DebugInfoInput {
  sampleVersionLabel: string;
  sdkVersion: string;
  build: string | null;
  serverLabel: string;
  host: string;
  community: string;
  apiKeySource: string;
  /** The configured SSO user id. */
  userId: string;
  displayMode: 'embed' | 'fullscreen';
  urlOpeningMode: 'defaultBrowser' | 'inAppWebView' | 'sampleRule';
  entitlements?: string[];
  theme?: string;
  language?: string;
  maskedApiKey?: string;
  editEnabled?: boolean;
  loginEnabled?: boolean;
  profileTapMode: 'sdkScreens' | 'appScreens';
}

/**
 * The read-only cards of Developer tools › Debug info: what this build is and which
 * configuration is in force. The Events log is the live console; this is the page a tester
 * copies into a bug report, so it carries no key material — the key's provenance only.
 */
export function buildDebugInfoCards(input: DebugInfoInput): DebugInfoCard[] {
  return [
    {
      title: 'Build',
      rows: [
        { label: 'Sample version', value: input.sampleVersionLabel },
        { label: 'SDK version', value: input.sdkVersion },
        { label: 'Build', value: input.build ?? '—' },
        { label: 'Flavor', value: 'React Native' },
        { label: 'Server', value: `${input.serverLabel} — ${input.host}` },
      ],
    },
    {
      title: 'Feature toggles',
      rows: [
        {
          label: 'Force login',
          value: 'Not reported by the bridge · set in Scenarios',
        },
        {
          label: 'Push registration',
          value: 'on · tokens registered when available',
        },
      ],
    },
    {
      title: 'Configuration',
      rows: [
        { label: 'Server environment', value: input.serverLabel },
        { label: 'Host', value: input.host },
        { label: 'Community', value: input.community },
        { label: 'API key source', value: input.apiKeySource },
        {
          label: 'Auth mode',
          value: 'SSO',
        },
        {
          label: 'SSO user',
          value: input.userId.trim() !== '' ? input.userId : '—',
        },
        {
          label: 'Entitlements',
          value: input.entitlements?.join(', ') || 'None',
        },
        { label: 'Theme', value: input.theme ?? '—' },
        { label: 'Language', value: input.language ?? 'Follow system' },
        { label: 'API key', value: input.maskedApiKey ?? '—' },
        {
          label: 'Display mode',
          value: input.displayMode === 'embed' ? 'Embedded' : 'Full screen',
        },
        {
          label: 'Links',
          value:
            input.urlOpeningMode === 'inAppWebView'
              ? 'In-app WebView'
              : input.urlOpeningMode === 'sampleRule'
                ? 'Sample rule (default)'
                : 'Always let Octopus open',
        },
        {
          label: 'Profile taps',
          value:
            input.profileTapMode === 'appScreens'
              ? 'App screens'
              : 'SDK screens',
        },
      ],
    },
    {
      title: 'Host app integration',
      rows: [
        {
          label: 'Route profile taps to your own profile screen',
          value: input.profileTapMode === 'appScreens' ? 'Wired' : 'Not wired',
        },
        {
          label: 'App profile editor',
          value: input.editEnabled === false ? 'Not wired' : 'Wired',
        },
        {
          label: 'Open your sign-in screen',
          value: input.loginEnabled === false ? 'Not wired' : 'Wired',
        },
        {
          label: 'Handle taps on the content button',
          value: 'Not exposed by the bridge',
        },
        {
          label: 'Gate access to locked groups',
          value: 'Not exposed by the bridge',
        },
        {
          label: 'Intercept URL openings',
          value:
            input.urlOpeningMode === 'sampleRule'
              ? 'Sample rule (default)'
              : input.urlOpeningMode === 'inAppWebView'
                ? 'Always open in the app'
                : 'Always let Octopus open',
        },
      ],
    },
  ];
}
