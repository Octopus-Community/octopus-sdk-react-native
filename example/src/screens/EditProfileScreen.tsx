import { sampleRadius, sampleTypography } from '../theme/tokens';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { UserProfileField } from '@octopus-community/react-native';
import type { HostProfile, HostUser } from '../auth/hostUser';
import { PillButton } from '../components/PillButton';
import { chromeColors } from '../theme/branding';
import { ProfileHeader } from '../components/SampleRecipes';

export function EditProfileScreen({
  isDark,
  user,
  appManagedFields,
  fieldToEdit,
  canSave,
  busy,
  error,
  onSave,
}: {
  isDark: boolean;
  user: HostUser | null;
  appManagedFields: UserProfileField[];
  fieldToEdit: UserProfileField | null;
  canSave: boolean;
  busy: boolean;
  error: string | null;
  onSave: (profile: HostProfile) => void;
}) {
  const chrome = chromeColors(isDark);
  const [profile, setProfile] = useState<HostProfile>({
    username: user?.profile?.username ?? '',
    biography: user?.profile?.biography ?? '',
    profilePicture: user?.profile?.profilePicture ?? '',
  });
  const fields = [
    { field: 'username', label: 'Nickname', id: 'nickname' },
    { field: 'biography', label: 'Bio', id: 'bio' },
    { field: 'profilePicture', label: 'Avatar URL', id: 'avatar' },
  ] as const;
  const visibleFields = fields.filter(
    ({ field }) => fieldToEdit === null || fieldToEdit === field
  );
  const editableFields = visibleFields.filter(({ field }) =>
    appManagedFields.includes(field)
  );
  const validProfile = editableFields.every(({ field }) => {
    const value = (profile[field] ?? '').trim();
    if (field === 'username') return value !== '';
    if (field === 'profilePicture') return /^https?:\/\/\S+$/i.test(value);
    return true;
  });
  const saveProfile = () => {
    if (!canSave || busy || !validProfile || editableFields.length === 0)
      return;
    const update: HostProfile = {};
    for (const { field } of editableFields) {
      update[field] = (profile[field] ?? '').trim();
    }
    onSave(update);
  };
  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        testID="host-edit-profile-screen"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <ProfileHeader title="Edit profile" isDark={isDark} />
        <Text style={{ color: chrome.text }}>
          User id: {user?.userId ?? 'No host user connected'}
        </Text>
        <Text style={{ color: chrome.textSecondary }}>
          Last values supplied by this host. The SDK does not expose the current
          display name, avatar or bio to the sample.
        </Text>
        {visibleFields.map(({ field, label, id }) => (
          <View key={field} style={styles.field}>
            <Text style={{ color: chrome.text }}>
              {label} · managed by the{' '}
              {appManagedFields.includes(field) ? 'host' : 'community'}
            </Text>
            {appManagedFields.includes(field) ? (
              <TextInput
                testID={`host-edit-profile-${id}`}
                accessibilityLabel={label}
                value={profile[field]}
                onChangeText={(value) =>
                  setProfile((current) => ({ ...current, [field]: value }))
                }
                editable={canSave && !busy}
                autoFocus={fieldToEdit === field && canSave}
                autoCapitalize={
                  field === 'profilePicture' ? 'none' : 'sentences'
                }
                autoCorrect={field !== 'profilePicture'}
                keyboardType={field === 'profilePicture' ? 'url' : 'default'}
                multiline={field === 'biography'}
                style={[
                  styles.input,
                  {
                    color: chrome.text,
                    borderColor: chrome.border,
                    backgroundColor: chrome.surface,
                  },
                ]}
              />
            ) : (
              <>
                <Text
                  testID={`host-edit-profile-${id}-readonly`}
                  style={{ color: chrome.text }}
                >
                  {user?.profile?.[field] || 'Not supplied'}
                </Text>
                <Text style={{ color: chrome.textSecondary }}>
                  {label} is managed by the community. Edit it in the community;
                  this screen cannot save it.
                </Text>
              </>
            )}
            {field === 'username' && appManagedFields.includes(field) && (
              <Text style={{ color: chrome.textSecondary }}>
                Enter a non-empty nickname.
              </Text>
            )}
            {field === 'profilePicture' && appManagedFields.includes(field) && (
              <Text style={{ color: chrome.textSecondary }}>
                Enter an HTTP or HTTPS image URL. Removing the avatar is not
                supported by this form.
              </Text>
            )}
          </View>
        ))}
        {!canSave && (
          <Text style={{ color: chrome.textSecondary }}>
            Saving requires a connected host SSO user and a configured demo
            token.
          </Text>
        )}
        {error !== null && (
          <Text
            testID="host-edit-profile-error"
            accessibilityRole="alert"
            style={{ color: chrome.danger }}
          >
            {error}
          </Text>
        )}
        <PillButton
          testID="host-edit-profile-save"
          label="Save profile"
          fullWidth
          minHeight={52}
          isDark={isDark}
          disabled={!canSave || !validProfile || editableFields.length === 0}
          loading={busy}
          onPress={saveProfile}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 24, gap: 20 },
  field: { gap: 12 },
  input: {
    borderWidth: 1,
    borderRadius: sampleRadius.lg,
    padding: 14,
    ...sampleTypography.body,
  },
});
