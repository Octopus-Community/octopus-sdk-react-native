const path = require('path');
const pkg = require('../package.json');

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    },
  },
  dependencies: {
    [pkg.name]: {
      root: path.join(__dirname, '..'),
      platforms: {
        // Codegen script incorrectly fails without this
        // So we explicitly specify the platforms with empty object
        ios: {},
        android: {},
      },
    },
    // iOS uses native APNs (see ios/OctopusPushModule.swift), not Firebase.
    // Exclude Firebase from iOS autolinking; Android still uses it.
    '@react-native-firebase/app': {
      platforms: { ios: null },
    },
    '@react-native-firebase/messaging': {
      platforms: { ios: null },
    },
    // Notifee renders the local notification from data-only FCM messages on
    // Android (see src/push.ts). iOS displays APNs notifications natively, so
    // Notifee is never imported there — exclude it from iOS autolinking.
    '@notifee/react-native': {
      platforms: { ios: null },
    },
  },
};
