import * as Octopus from '@octopus-community/react-native';
import {
  Text,
  View,
  StyleSheet,
  Button,
  ActivityIndicator,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useUserTokenProvider } from '../../src/useUserTokenProvider';

export default function App() {
  const [isInitializationTriggered, setIsInitializationTriggered] =
    useState(false);
  const [isConnectingUser, setIsConnectingUser] = useState(false);

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
  }, []);

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
