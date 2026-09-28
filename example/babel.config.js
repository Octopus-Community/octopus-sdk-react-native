const path = require('path');
const fs = require('fs');
const { getConfig } = require('react-native-builder-bob/babel-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

module.exports = getConfig(
  {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      // Opt-in bootstrap; *.local.* is already excluded from the public mirror.
      // Public/store bundles have no import of the internal feedback implementation.
      function internalFeedback({ types: t }) {
        return {
          visitor: {
            Program(program, state) {
              if (
                process.env.OCTOPUS_INTERNAL_FEEDBACK !== 'true' ||
                state.filename !== path.join(__dirname, 'index.js')
              )
                return;
              const entry = path.join(
                __dirname,
                'src/debug/internal/sendFeedback.local.tsx'
              );
              if (!fs.existsSync(entry)) return;
              const android = fs
                .readFileSync(
                  path.join(root, 'android/gradle.properties'),
                  'utf8'
                )
                .match(
                  /^OctopusReactNativeSdk_octopusCommunityVersion=(.+)$/m
                )?.[1]
                ?.trim();
              const ios = fs
                .readFileSync(
                  path.join(root, 'OctopusReactNativeSdk.podspec'),
                  'utf8'
                )
                .match(/octopus_version\s*=\s*['"]([^'"]+)['"]/)?.[1];
              if (!android || !ios)
                throw new Error('Cannot read native SDK pins for feedback');
              program.pushContainer(
                'body',
                t.expressionStatement(
                  t.callExpression(
                    t.memberExpression(
                      t.callExpression(t.identifier('require'), [
                        t.stringLiteral(
                          './src/debug/internal/sendFeedback.local'
                        ),
                      ]),
                      t.identifier('installFeedback')
                    ),
                    [
                      t.objectExpression([
                        t.objectProperty(
                          t.identifier('android'),
                          t.stringLiteral(android)
                        ),
                        t.objectProperty(
                          t.identifier('ios'),
                          t.stringLiteral(ios)
                        ),
                      ]),
                    ]
                  )
                )
              );
            },
          },
        };
      },
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
            'OCTOPUS_QA_REACTION_POST_ID',
            'OCTOPUS_QA_COMMENT_ID',
            'OCTOPUS_QA_USER_ID',
            'OCTOPUS_QA_TOPIC_ID',

            // The backend this build talks to, handed to `initialize()` as
            // `apiServer` — which does reroute the published natives (#190).
            // Unset resolves to the demo backend, so only an explicit
            // `api.8pus.io` reaches production, banner included.
            'OCTOPUS_API_HOST',
            // Marks this build as an Octopus-internal one, which is the other
            // half of the production banner's condition. Never set on a store
            // build or on a client's clone of the public mirror.
            'OCTOPUS_INTERNAL',
            'OCTOPUS_FEEDBACK_REPO',
            'OCTOPUS_DESIGN_REFERENCE_URL',
            'OCTOPUS_BRIDGE_SHARE_TOKEN',
          ],
        },
      ],
    ],
  },
  { root, pkg }
);
