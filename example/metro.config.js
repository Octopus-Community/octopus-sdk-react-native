const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
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

// babel.config.js's internal-feedback plugin injects both native SDK pins into index.js
// when OCTOPUS_INTERNAL_FEEDBACK=true and the local feedback bootstrap exists. Metro does
// not hash the files it reads, so a pin bump could leave that transform cached with the
// previous pins. Hash both files whole here to invalidate it on a change; the plugin parses
// them with regexes, while scripts/nativePins.ts owns the native SDK version-pin extraction
// and coherence checks used by the scripts and their tests.
const nativePinsKey = crypto
  .createHash('sha1')
  .update(fs.readFileSync(path.join(root, 'android/gradle.properties')))
  .update(fs.readFileSync(path.join(root, 'OctopusReactNativeSdk.podspec')))
  .digest('hex')
  .slice(0, 8);

module.exports = {
  ...config,
  cacheVersion: `${config.cacheVersion ?? ''}|internal-feedback:${internalFeedbackKey}|native-pins:${nativePinsKey}`,
};
