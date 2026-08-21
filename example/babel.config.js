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
            'OCTOPUS_SSO_USER_ID',
            'OCTOPUS_SSO_USER_TOKEN',
            'OCTOPUS_DEMO_POST_ID',
            'OCTOPUS_BRIDGE_SHARE_TOKEN',
          ],
        },
      ],
    ],
  },
  { root, pkg }
);
