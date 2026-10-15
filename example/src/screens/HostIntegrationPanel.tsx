import { StyleSheet, Switch, Text, View } from 'react-native';
import { useState } from 'react';
import type { UserProfileField } from '@octopus-community/react-native';
import { SettingsRadio } from '../components/SettingsRadio';
import { SegmentControl } from '../components/SegmentControl';
import { GroupHeader, ListDivider } from '../components/SampleRecipes';
import { PillButton } from '../components/PillButton';
import { chromeColors } from '../theme/branding';
import { sampleTypography } from '../theme/tokens';
import type {
  DisplayMode,
  ProfileTapMode,
  UrlOpeningMode,
} from './SettingsScreen';

export interface HostIntegrationProps {
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  profileTapMode: ProfileTapMode;
  onProfileTapModeChange: (mode: ProfileTapMode) => void;
  editEnabled: boolean;
  onEditEnabledChange: (enabled: boolean) => void;
  loginEnabled: boolean;
  onLoginEnabledChange: (enabled: boolean) => void;
  urlOpeningMode: UrlOpeningMode;
  onUrlOpeningModeChange: (mode: UrlOpeningMode) => void;
  appManagedFields: UserProfileField[];
  busy: boolean;
  onRestart: (fields: UserProfileField[]) => void;
}
export function HostIntegrationPanel({
  isDark,
  ...p
}: HostIntegrationProps & { isDark: boolean }) {
  const chrome = chromeColors(isDark);
  const [managedFields, setManagedFields] = useState(p.appManagedFields);
  const heading = (label: string, count?: number) => (
    <GroupHeader title={label} count={count} isDark={isDark} />
  );
  const hint = (text: string) => (
    <Text style={[styles.hint, { color: chrome.textSecondary }]}>{text}</Text>
  );
  const toggle = (
    id: string,
    title: string,
    detail: string,
    value: boolean,
    onValueChange?: (enabled: boolean) => void
  ) => (
    <View style={styles.toggle}>
      <View style={styles.flexText}>
        <Text style={[styles.label, { color: chrome.text }]}>{title}</Text>
        {hint(detail)}
      </View>
      <Switch
        testID={`host-integration-${id}-switch`}
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: chrome.outline, true: '#1D88FE' }}
        thumbColor={value ? '#FFFFFF' : chrome.surfaceRaised}
        disabled={!onValueChange}
      />
    </View>
  );
  return (
    <View style={styles.content}>
      {hint(
        'What the sample app handles itself when the community asks. Switch one off to see what a host that skips it gets.'
      )}
      {heading('Community navigation')}
      {hint('Show tabs or use the whole screen.')}
      <SegmentControl
        testID="host-integration-navigation"
        options={[
          { value: 'embed', label: 'In tab' },
          { value: 'fullscreen', label: 'Full screen' },
        ]}
        value={p.displayMode}
        onChange={p.onDisplayModeChange}
        isDark={isDark}
      />
      {heading('Callbacks', 5)}
      <View style={[styles.listGroup, { backgroundColor: chrome.surface }]}>
        {toggle(
          'profile',
          'Route profile taps to your own profile screen',
          'Enable the Unified Profile scenario to wire this callback.',
          p.profileTapMode === 'appScreens',
          (next) => p.onProfileTapModeChange(next ? 'appScreens' : 'sdkScreens')
        )}
        <ListDivider isDark={isDark} />
        {toggle(
          'profile-edit',
          'App profile editor',
          'The host edits the profile fields selected below.',
          p.editEnabled,
          p.onEditEnabledChange
        )}
        <ListDivider isDark={isDark} />
        {toggle(
          'login',
          'Open your sign-in screen',
          'Required in SSO mode: the community does not open without it.',
          p.loginEnabled,
          p.onLoginEnabledChange
        )}
        <ListDivider isDark={isDark} />
        {toggle(
          'client-object',
          'Handle taps on the content button',
          'This callback is not exposed by the React Native bridge.',
          false
        )}
        <ListDivider isDark={isDark} />
        {toggle(
          'group-access-denied',
          'Gate access to locked groups',
          'This callback is not exposed by the React Native bridge.',
          false
        )}
      </View>
      {heading('Host-managed profile fields')}
      {hint(
        'SSO only. Select the fields your app edits. Field changes apply on Restart now; reconnect your host user afterwards. Unselected fields stay managed by the community.'
      )}
      {(
        [
          ['username', 'Nickname'],
          ['biography', 'Bio'],
          ['profilePicture', 'Avatar'],
        ] as const
      ).map(([field, label]) => (
        <View key={field}>
          {toggle(
            `managed-${field}`,
            `${label} (applies on Restart)`,
            managedFields.includes(field)
              ? 'Managed by the host'
              : 'Managed by the community',
            managedFields.includes(field),
            !p.busy
              ? (enabled) =>
                  setManagedFields((current) =>
                    enabled
                      ? [...current, field]
                      : current.filter((value) => value !== field)
                  )
              : undefined
          )}
        </View>
      ))}
      {heading('Intercept URL openings')}
      <SettingsRadio
        testID="host-integration-url"
        options={[
          { value: 'sampleRule', label: 'Sample rule (default)' },
          { value: 'inAppWebView', label: 'Always open in the app' },
          { value: 'defaultBrowser', label: 'Always let Octopus open' },
        ]}
        value={p.urlOpeningMode}
        onChange={p.onUrlOpeningModeChange}
        isDark={isDark}
      />
      {hint(
        p.urlOpeningMode === 'sampleRule'
          ? 'The app opens its own contact link, Octopus opens every other link.'
          : p.urlOpeningMode === 'inAppWebView'
            ? 'Every link returns HandledByApp; the app opens it.'
            : 'Every link returns HandledByOctopus; the SDK opens it.'
      )}
      {hint(
        'Callback and URL changes apply immediately in this session. Changing URL or profile interception remounts the community view so both platforms pick it up; a notification destination is kept.'
      )}
      <PillButton
        testID="host-integration-restart"
        label="Restart now"
        isDark={isDark}
        disabled={p.busy}
        onPress={() => p.onRestart(managedFields)}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  listGroup: { borderRadius: 8, overflow: 'hidden' },
  flexText: { flex: 1, gap: 2 },
  content: { gap: 12 },
  heading: { ...sampleTypography.body, marginTop: 12 },
  label: { ...sampleTypography.body },
  hint: { ...sampleTypography.callout },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 56,
  },
});
