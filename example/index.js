import { AppRegistry, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from './src/App';
import { name as appName } from './app.json';

// Android delivers Octopus pushes as DATA-ONLY FCM messages, so the app must
// display the notification itself (Notifee) when received in the background/quit
// state, and deep-link on tap. Registered at module scope here so it is active
// before the app starts. iOS uses native APNs (Firebase/Notifee excluded from
// the iOS build), so this must stay Android-only — never import them on iOS.
if (Platform.OS === 'android') {
  require('./src/push').registerOctopusFcmBackground();
}

AppRegistry.registerComponent(appName, () => () => (
  <SafeAreaProvider>
    <App />
  </SafeAreaProvider>
));
