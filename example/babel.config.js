const path = require('path');
const { getConfig } = require('react-native-builder-bob/babel-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

module.exports = getConfig(
  {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          path: path.resolve(__dirname, '.env'),
          allowlist: [
            'OCTOPUS_COMMUNITY_API_KEY',
            // Named key sets, `id~label~key` entries separated by `;` — parsed
            // by example/src/config/demoConfig.ts. Absent on a public clone.
            'OCTOPUS_NAMED_API_KEYS',
            'OCTOPUS_SSO_USER_ID',
            'OCTOPUS_SSO_USER_TOKEN',
            // One pre-baked JWT per entitlement combination the Connection
            // scenario walks; the sample signs nothing itself.
            'OCTOPUS_SSO_USER_TOKEN_PREMIUM',
            'OCTOPUS_SSO_USER_TOKEN_MODERATOR',
            'OCTOPUS_SSO_USER_TOKEN_PREMIUM_MODERATOR',
            'OCTOPUS_DEMO_POST_ID',
            // The backend this build talks to, handed to `initialize()` as
            // `apiServer` — which does reroute the published natives (#190).
            // Unset resolves to the demo backend, so only an explicit
            // `api.8pus.io` reaches production, banner included.
            'OCTOPUS_API_HOST',
            // Marks this build as an Octopus-internal one, which is the other
            // half of the production banner's condition. Never set on a store
            // build or on a client's clone of the public mirror.
            'OCTOPUS_INTERNAL',
            'OCTOPUS_BRIDGE_SHARE_TOKEN',
          ],
        },
      ],
    ],
  },
  { root, pkg }
);
