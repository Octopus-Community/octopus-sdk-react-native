const path = require('path');
const fs = require('fs');
const { getDefaultConfig } = require('@react-native/metro-config');
const { getConfig } = require('react-native-builder-bob/metro-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getConfig(getDefaultConfig(__dirname), {
  root,
  pkg,
  project: __dirname,
});

// babel.config.js injects the internal feedback bootstrap from these two inputs; Metro does
// not hash them, so they are folded into the transform cache key — toggling the flag either
// way invalidates the cached index.js without a manual --reset-cache.
const internalFeedbackKey = [
  process.env.OCTOPUS_INTERNAL_FEEDBACK === 'true',
  fs.existsSync(
    path.join(__dirname, 'src/debug/internal/sendFeedback.local.tsx')
  ),
].join(':');

module.exports = {
  ...config,
  cacheVersion: `${config.cacheVersion ?? ''}|internal-feedback:${internalFeedbackKey}`,
};
