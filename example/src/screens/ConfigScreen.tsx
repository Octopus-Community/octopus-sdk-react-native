import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { chromeColors } from '../theme/branding';
import { sampleRadius, sampleTypography } from '../theme/tokens';
import { SettingsRadio } from '../components/SettingsRadio';
import { SegmentControl } from '../components/SegmentControl';
import {
  APPEARANCE_OPTIONS,
  THEME_PRESETS,
} from '../config/settingsPreferences';
import { maskApiKey } from '../config/apiKeyMask';
import {
  buildServerEnv,
  communityLabel,
  hasInjectedApiKey,
  injectedApiKeys,
  octopusUserId,
  resolveApiKey,
  DEMO_HOST,
  PRODUCTION_HOST,
} from '../config/demoConfig';
import {
  resolveConfigServer,
  resolveSettingsServer,
} from '../config/settingsServer';
import type {
  DemoConfig,
  AppThemeChoice,
  ApiKeySource,
} from '../config/demoConfig';
import type { ThemeSet } from '../types/theme';
import type {
  DisplayMode,
  ProfileTapMode,
  UrlOpeningMode,
} from './SettingsScreen';
import type { ConfigSection, NavRequest } from '../navigation/anchors';
import { useAnchorScroll } from '../navigation/useAnchorScroll';
export type ConfigScreenMode = 'onboarding' | 'revisit';
export interface ConfigScreenProps {
  isDark: boolean;
  applying?: boolean;
  unifiedProfileEnabled?: boolean;
  onOpenUnifiedProfile?: () => void;
  primaryColor: string;
  onPrimaryColor: string;
  mode: ConfigScreenMode;
  /**
   * The choices to seed the form with — the persisted config restored at
   * launch, or the one in use before "Back to Config". `null` on a genuine
   * first launch, where every field falls back to its build-time default.
   *
   * Never carries a key value: none is persisted (see `config/configStorage`),
   * so a restored `custom` source still lands here with an empty key field.
   */
  initialConfig?: DemoConfig | null;
  onStart: (config: DemoConfig, preset: ThemeSet) => void;
  /** SDK colour preset. Lives outside {@link DemoConfig} because scenarios also drive it. */
  themeSet: ThemeSet;
  urlOpeningMode: UrlOpeningMode;
  onUrlOpeningModeChange: (next: UrlOpeningMode) => void;
  profileTapMode: ProfileTapMode;
  onProfileTapModeChange: (next: ProfileTapMode) => void;
  displayMode: DisplayMode;
  onDisplayModeChange: (next: DisplayMode) => void;
  /** Host callbacks (Config §5) — the ones with a real, individually-disableable binding listener. */
  isAuthRequiredCallbackEnabled: boolean;
  onAuthRequiredCallbackEnabledChange: (next: boolean) => void;
  isUnreadCountCallbackEnabled: boolean;
  onUnreadCountCallbackEnabledChange: (next: boolean) => void;
  isEventCallbackEnabled: boolean;
  onEventCallbackEnabledChange: (next: boolean) => void;
  /**
   * The section a link asked for (`config/<section>`): the screen opens scrolled to it, so a
   * link that names one setting lands on that setting rather than on the top of the form.
   * Absent or null, the screen opens at the top.
   */
  sectionRequest?: NavRequest<ConfigSection> | null;
}

export function ConfigScreen(props: ConfigScreenProps) {
  const { isDark, initialConfig, mode, onStart, sectionRequest } = props;
  const chrome = chromeColors(isDark);
  const [apiKeySource, setApiKeySource] = useState<ApiKeySource>(
    initialConfig?.apiKeySource ?? 'demo'
  );
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(
    initialConfig?.selectedKeyId ?? injectedApiKeys[0]?.id ?? null
  );
  const [customApiKey, setCustomApiKey] = useState(
    initialConfig?.customApiKey ?? ''
  );
  const [userId, setUserId] = useState(initialConfig?.userId ?? octopusUserId);
  const [theme, setTheme] = useState<AppThemeChoice>(
    initialConfig?.theme ?? 'system'
  );
  const [themeSet, setThemeSet] = useState(props.themeSet);
  const seedServer = resolveConfigServer(initialConfig);
  const seedHost = seedServer.host;
  const [server, setServer] = useState<'demo' | 'prod' | 'custom'>(
    seedServer.port !== undefined
      ? 'custom'
      : seedHost === DEMO_HOST
        ? 'demo'
        : seedHost === PRODUCTION_HOST
          ? 'prod'
          : 'custom'
  );
  const [host, setHost] = useState(
    seedHost + (seedServer.port !== undefined ? `:${seedServer.port}` : '')
  );
  const [open, setOpen] = useState<Record<string, boolean>>(
    sectionRequest ? { [sectionRequest.target]: true } : {}
  );
  const { scrollRef, onSectionLayout } = useAnchorScroll(sectionRequest);
  const apiServer = resolveSettingsServer(server, host);
  const draft: DemoConfig = {
    apiKeySource,
    selectedKeyId: apiKeySource === 'demo' ? selectedKeyId : null,
    customApiKey,
    userId: userId.trim() || octopusUserId,
    theme,
    serverEnv: buildServerEnv,
    ...(apiServer && { apiServer }),
  };
  const resolvedApiKey = resolveApiKey(draft);
  const keyMissing = resolvedApiKey === '';
  function section(
    id: ConfigSection,
    title: string,
    children: React.ReactNode
  ) {
    return (
      <View
        key={id}
        testID={`config-section-${id}`}
        onLayout={onSectionLayout(id)}
        style={[styles.section, { borderColor: chrome.border }]}
      >
        <TouchableOpacity
          testID={`config-toggle-${id}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: !!open[id] }}
          accessibilityLabel={`${open[id] ? 'Collapse' : 'Expand'} ${title}`}
          onPress={() =>
            setOpen((previous) => ({ ...previous, [id]: !previous[id] }))
          }
          style={styles.header}
        >
          <Text style={[styles.title, { color: chrome.accentText }]}>
            {title}
          </Text>
          <MaterialIcons
            name={open[id] ? 'expand-less' : 'expand-more'}
            size={24}
            color={chrome.textSecondary}
          />
        </TouchableOpacity>
        {open[id] && <View style={styles.body}>{children}</View>}
      </View>
    );
  }
  const hint = (text: string) => (
    <Text style={[styles.hint, { color: chrome.textSecondary }]}>{text}</Text>
  );
  const inputStyle = [
    styles.input,
    {
      color: chrome.text,
      borderColor: chrome.outline,
      backgroundColor: chrome.surface,
    },
  ];
  return (
    <View style={[styles.container, { backgroundColor: chrome.screen }]}>
      <ScrollView
        ref={scrollRef}
        testID="config-screen"
        contentContainerStyle={styles.content}
      >
        {section(
          'server',
          'Server environment',
          <>
            {hint(
              'Keep the demo server unless a ticket says otherwise. Prod and custom hosts are for internal testing — never publish test content on a client community.'
            )}
            <SettingsRadio
              rowMin={48}
              testID="config-serverEnv-select"
              isDark={isDark}
              value={server}
              onChange={setServer}
              options={[
                { value: 'demo', label: 'Demo server (default)' },
                { value: 'prod', label: 'Prod (api.8pus.io)' },
                { value: 'custom', label: 'Custom host' },
              ]}
            />
            {server === 'custom' && (
              <TextInput
                testID="config-host-input"
                accessibilityLabel="Custom host"
                value={host}
                onChangeText={setHost}
                placeholder="Host or HTTPS URL"
                placeholderTextColor={chrome.textPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
                style={inputStyle}
              />
            )}
            {!apiServer &&
              hint('Enter a valid host and an optional port from 1 to 65535.')}
          </>
        )}
        {section(
          'community',
          'Community',
          <>
            {hint(
              'Pick the community to open. The preselected one fits most tests.'
            )}
            <SettingsRadio
              rowMin={48}
              testID="config-apiKeySource-select"
              isDark={isDark}
              value={
                apiKeySource === 'custom' ? 'custom' : (selectedKeyId ?? 'demo')
              }
              onChange={(value) => {
                setApiKeySource(value === 'custom' ? 'custom' : 'demo');
                setSelectedKeyId(
                  value === 'custom' || value === 'demo' ? null : value
                );
              }}
              options={[
                ...(injectedApiKeys.length
                  ? injectedApiKeys.map((k) => ({
                      value: k.id,
                      label: k.label,
                    }))
                  : [{ value: 'demo', label: 'Demo community' }]),
                { value: 'custom', label: 'Custom… (paste any API key)' },
              ]}
            />
            {apiKeySource === 'custom' && (
              <TextInput
                testID="config-customApiKey-input"
                accessibilityLabel="Custom API key"
                value={customApiKey}
                onChangeText={setCustomApiKey}
                secureTextEntry
                importantForAutofill="no"
                autoComplete="off"
                textContentType="none"
                autoCapitalize="none"
                autoCorrect={false}
                style={inputStyle}
              />
            )}
            {hint(`Resolved key: ${maskApiKey(resolvedApiKey)}`)}
            {keyMissing &&
              hint(
                hasInjectedApiKey
                  ? 'Paste a demo API key to apply.'
                  : 'No demo key injected. Supply a demo key in your build or paste one for this session.'
              )}
          </>
        )}
        {section(
          'auth',
          'Connect your users (SSO)',
          <>
            <SettingsRadio
              rowMin={48}
              testID="config-userId-select"
              isDark={isDark}
              value={userId}
              onChange={setUserId}
              options={[
                ...new Set([
                  octopusUserId,
                  'qa-tester-ios',
                  'qa-tester-android',
                ]),
              ].map((value) => ({ value, label: value }))}
            />
            <TextInput
              testID="config-userId-input"
              accessibilityLabel="SSO user"
              value={userId}
              onChangeText={setUserId}
              autoCapitalize="none"
              autoCorrect={false}
              style={inputStyle}
            />
            {hint(
              'These users require matching demo tokens injected by the build.'
            )}
            {hint(
              `Unified profile: ${props.unifiedProfileEnabled ? 'On — host app profiles' : 'Off — native Octopus profiles'}`
            )}
            {props.onOpenUnifiedProfile && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={props.onOpenUnifiedProfile}
                style={styles.header}
              >
                <Text style={[styles.title, { color: chrome.accentText }]}>
                  Open Unified Profile scenario
                </Text>
              </TouchableOpacity>
            )}
            {hint(
              `Key: “${communityLabel(draft)}”. The Unified Profile scenario wires profile navigation and forces the flag while on.`
            )}
          </>
        )}
        {section(
          'theme',
          'Theme',
          <>
            <SegmentControl
              testID="config-theme-select"
              options={APPEARANCE_OPTIONS}
              value={theme}
              onChange={setTheme}
              isDark={isDark}
            />
            <SegmentControl
              testID="config-themePreset-select"
              options={THEME_PRESETS}
              value={themeSet}
              onChange={setThemeSet}
              isDark={isDark}
            />
            {hint(
              '"SDK default" hands the SDK no theme — what a fresh integration looks like.'
            )}
          </>
        )}
        <View style={[styles.section, { borderColor: chrome.border }]}>
          <Text style={[styles.title, { color: chrome.accentText }]}>
            Host app integration
          </Text>
          {hint('Profile, sign-in, links: now in Settings › Developer tools')}
        </View>
      </ScrollView>
      <View
        style={[
          styles.dock,
          { backgroundColor: chrome.surface, borderColor: chrome.hairline },
        ]}
      >
        <Pressable
          testID="config-start-button"
          accessibilityRole="button"
          disabled={keyMissing || !apiServer || props.applying}
          accessibilityState={{
            disabled: keyMissing || !apiServer || props.applying,
          }}
          onPress={() => {
            onStart(draft, themeSet);
          }}
          style={({ pressed }) => [
            styles.startButton,
            {
              backgroundColor: pressed ? chrome.accentPressed : chrome.accent,
              opacity: keyMissing || !apiServer || props.applying ? 0.45 : 1,
            },
          ]}
        >
          <Text style={[styles.startButtonText, { color: chrome.onAccent }]}>
            {props.applying
              ? 'Applying…'
              : mode === 'onboarding'
                ? 'Start SDK'
                : 'Apply'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, gap: 4, paddingBottom: 32 },
  dock: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  section: {
    borderTopWidth: 1,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    minHeight: 48,
  },
  title: { ...sampleTypography.label, flex: 1 },
  body: { gap: 8 },
  hint: { ...sampleTypography.caption },
  input: {
    ...sampleTypography.body,
    borderWidth: 1,
    borderRadius: sampleRadius.md,
    padding: 12,
    minHeight: 48,
  },
  startButton: {
    borderRadius: sampleRadius.pill,
    minHeight: 56,
    paddingHorizontal: 24,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: { ...sampleTypography.buttonLabel },
});
