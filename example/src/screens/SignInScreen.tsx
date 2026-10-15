import { sampleTypography } from '../theme/tokens';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { PillButton } from '../components/PillButton';
import { chromeColors } from '../theme/branding';

export function SignInScreen({
  isDark,
  userId,
  hasSsoUser,
  busy,
  error,
  onConnect,
}: {
  isDark: boolean;
  userId: string;
  hasSsoUser: boolean;
  busy: boolean;
  error: string | null;
  onConnect: () => void;
}) {
  const chrome = chromeColors(isDark);
  return (
    <ScrollView
      testID="host-sign-in-screen"
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: chrome.text }]}>
        Sign in to continue
      </Text>
      <Text style={{ color: chrome.textSecondary }}>User id: {userId}</Text>
      <Text style={{ color: chrome.textSecondary }}>
        {!hasSsoUser
          ? 'No demo SSO token is configured in this build. Host sign-in is unavailable.'
          : 'Connect the demo SSO user, then return to the community. This sample uses the same preconfigured account as Settings.'}
      </Text>
      {error !== null && (
        <Text
          testID="host-sign-in-error"
          accessibilityRole="alert"
          style={{ color: chrome.danger }}
        >
          {error}
        </Text>
      )}
      <PillButton
        testID="host-sign-in-connect"
        label="Connect SSO user"
        fullWidth
        minHeight={52}
        icon="login"
        isDark={isDark}
        disabled={!hasSsoUser}
        loading={busy}
        onPress={onConnect}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 20 },
  title: { ...sampleTypography.title1 },
});
