import * as Octopus from '@octopus-community/react-native';
import { useUserTokenProvider } from '@octopus-community/react-native';
import {
  Text,
  View,
  StyleSheet,
  Button,
  ActivityIndicator,
  Image,
  useColorScheme,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';

// Example: Import your logo as a local asset
// Use Image.resolveAssetSource() to get the actual asset information
const resolvedLogo = Image.resolveAssetSource(require('../assets/logo.png'));

// Define color sets for different themes
const lightThemeColors = {
  primary: '#3B82F6',
  primaryLowContrast: '#60A5FA',
  primaryHighContrast: '#1D4ED8',
  onPrimary: '#FFFFFF',
};

const darkThemeColors = {
  primary: '#60A5FA',
  primaryLowContrast: '#93C5FD',
  primaryHighContrast: '#3B82F6',
  onPrimary: '#000000',
};

export default function App() {
  const [isInitializationTriggered, setIsInitializationTriggered] =
    useState(false);
  const [isConnectingUser, setIsConnectingUser] = useState(false);
  const colorScheme = useColorScheme();

  useEffect(() => {
    const apiKey = process.env.OCTOPUS_COMMUNITY_API_KEY;
    if (!apiKey) {
      console.error(
        'Example app misconfigured, please add a .env file mimicking .env.dist'
      );
      return;
    }

    Octopus.initialize({
      apiKey,
      connectionMode: {
        type: 'sso',
        appManagedFields: ['profilePicture'],
      },
      theme: {
        colors: colorScheme === 'dark' ? darkThemeColors : lightThemeColors,
        // Logo customization using local image
        logo: {
          image: resolvedLogo,
        },
      },
    })
      .then(() => {
        setIsInitializationTriggered(true);
      })
      .catch((error) => {
        // send this error to your error monitoring
        console.error('Error when initializing', error);
      });

    const editUserSubscription = Octopus.addEditUserListener((params) => {
      console.log('edit user', params);
      Octopus.closeUI();
    });

    const loginRequiredSubscription = Octopus.addLoginRequiredListener(() => {
      console.log('loginRequired');
      Octopus.closeUI();
    });

    return () => {
      editUserSubscription.remove();
      loginRequiredSubscription.remove();
    };
  }, [colorScheme]);

  const [isMockUserConnected, setIsMockUserConnected] = useState(false);
  useUserTokenProvider(async () => {
    if (!isMockUserConnected) {
      throw new Error('No user connected');
    }

    await new Promise<void>((resolve) => {
      // fake refresh token API call
      setTimeout(resolve, 2000);
    });

    return process.env.OCTOPUS_SSO_USER_TOKEN as string;
  });

  const mockUserConnection = useCallback(() => {
    setIsMockUserConnected(true);
    setIsConnectingUser(true);
    return Octopus.connectUser({
      userId: 'test',
      profile: {
        username: 'Test',
        profilePicture: 'https://i.pravatar.cc/150',
        legalAgeReached: true,
      },
    }).finally(() => {
      setIsConnectingUser(false);
    });
  }, []);
  const mockUserDisconnection = useCallback(() => {
    setIsMockUserConnected(false);
    return Octopus.disconnectUser();
  }, []);

  return (
    <View style={styles.container}>
      <Text>Octopus Community</Text>

      {isInitializationTriggered && (
        <>
          <Button
            title="Open UI"
            onPress={() => {
              Octopus.openUI();
            }}
          />
          {isConnectingUser ? (
            <ActivityIndicator />
          ) : !isMockUserConnected ? (
            <Button title="Connect user" onPress={mockUserConnection} />
          ) : (
            <Button title="Disconnect user" onPress={mockUserDisconnection} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
