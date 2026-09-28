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
  authMode: 'sso' | 'octopus';
  /** The configured SSO user id; ignored in `octopus` mode, where there is no host user. */
  userId: string;
  displayMode: 'embed' | 'fullscreen';
  urlOpeningMode: 'defaultBrowser' | 'inAppWebView';
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
        { label: 'Server', value: `${input.serverLabel} — ${input.host}` },
      ],
    },
    {
      title: 'Configuration',
      rows: [
        { label: 'Community', value: input.community },
        { label: 'API key source', value: input.apiKeySource },
        {
          label: 'Authentication',
          value: input.authMode === 'sso' ? 'SSO' : 'Octopus',
        },
        {
          label: 'SSO user id',
          value:
            input.authMode === 'sso' && input.userId.trim() !== ''
              ? input.userId
              : '—',
        },
        {
          label: 'Display mode',
          value: input.displayMode === 'embed' ? 'Embedded' : 'Full screen',
        },
        {
          label: 'Links',
          value:
            input.urlOpeningMode === 'inAppWebView'
              ? 'In-app WebView'
              : 'Default browser',
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
  ];
}
