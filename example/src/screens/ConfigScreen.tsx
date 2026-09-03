import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';

import { SegmentControl } from '../components/SegmentControl';
import { chromeColors } from '../theme/branding';
import type { ThemeSet } from '../types/theme';
import type {
  AppThemeChoice,
  ApiKeySource,
  AuthMode,
  DemoConfig,
} from '../config/demoConfig';
import {
  buildServerEnv,
  hasInjectedApiKey,
  injectedApiKeys,
  octopusHostLabel,
  octopusServerLabel,
  octopusUserId,
} from '../config/demoConfig';
import type {
  DisplayMode,
  ProfileTapMode,
  UrlOpeningMode,
} from './SettingsScreen';

/**
 * Which of the screen's two accesses this is.
 *
 * The screen itself is the same either way — same sections, same order, same controls. Only
 * the final button changes, because only the consequence does: on `onboarding` it starts an
 * SDK that is not running yet, on `revisit` it re-applies a configuration to one that is.
 */
export type ConfigScreenMode = 'onboarding' | 'revisit';

/**
 * User ids the SSO section offers as one-tap chips. Deduplicated because the
 * injected {@link octopusUserId} may itself be one of the QA tester ids, and a
 * repeated chip reads as a rendering bug.
 */
const USER_ID_PRESETS = [
  ...new Set([octopusUserId, 'qa-tester-ios', 'qa-tester-android']),
];

export interface ConfigScreenProps {
  isDark: boolean;
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
  onStart: (config: DemoConfig) => void;
  /** SDK colour preset. Lives outside {@link DemoConfig} because scenarios also drive it. */
  themeSet: ThemeSet;
  onThemeSetChange: (next: ThemeSet) => void;
  urlOpeningMode: UrlOpeningMode;
  onUrlOpeningModeChange: (next: UrlOpeningMode) => void;
  profileTapMode: ProfileTapMode;
  onProfileTapModeChange: (next: ProfileTapMode) => void;
  /**
   * Debug-only: forces the `exposeClientUserId` community flag (Unified Profile
   * activation) via `debugOverrideExposeClientUserId`, so profile-tap routing is
   * testable before the backend serves the flag.
   */
  isExposeClientUserIdForced: boolean;
  onExposeClientUserIdForcedChange: (next: boolean) => void;
  displayMode: DisplayMode;
  onDisplayModeChange: (next: DisplayMode) => void;
  /** Host callbacks (Config §5) — the ones with a real, individually-disableable binding listener. */
  isAuthRequiredCallbackEnabled: boolean;
  onAuthRequiredCallbackEnabledChange: (next: boolean) => void;
  isUnreadCountCallbackEnabled: boolean;
  onUnreadCountCallbackEnabledChange: (next: boolean) => void;
  isEventCallbackEnabled: boolean;
  onEventCallbackEnabledChange: (next: boolean) => void;
}

/**
 * The sample's one configuration screen, reached two ways: before the shell on first launch,
 * and from Settings → Server & community afterwards.
 *
 * Deliberately not two screens. A tester who configures the sample at launch and a tester who
 * re-points it at another community are answering the same questions in the same order; two
 * screens would mean two places for those answers to drift apart, and the second one would
 * inevitably grow only the subset someone remembered to add.
 *
 * **The answers are persisted, the key is not.** Start writes every choice to
 * device storage (`config/configStorage`) so the next launch restores them —
 * except the pasted key, which is deliberately never written, so a `custom`
 * config comes back with every other field filled and this one blank.
 *
 * **Start is gated on a resolvable key.** `initialize()` would accept an empty
 * one — the Android bridge only rejects `null` and neither native SDK validates
 * the value — so a keyless start resolves and every later call fails instead.
 * This screen is the only place that knows the key is missing, so it is where
 * the refusal belongs.
 *
 * **API key picking.** When the build carries named key sets
 * (`OCTOPUS_NAMED_API_KEYS`, filled by a private launcher), they are listed as a
 * single-choice picker with one "Custom…" fallback for pasting an arbitrary key.
 * On keyless / public builds the list is empty and the screen falls back to the
 * plain Demo / Custom selector over `OCTOPUS_COMMUNITY_API_KEY`.
 */
export function ConfigScreen({
  isDark,
  primaryColor,
  onPrimaryColor,
  mode,
  initialConfig,
  onStart,
  themeSet,
  onThemeSetChange,
  urlOpeningMode,
  onUrlOpeningModeChange,
  profileTapMode,
  onProfileTapModeChange,
  isExposeClientUserIdForced,
  onExposeClientUserIdForcedChange,
  displayMode,
  onDisplayModeChange,
  isAuthRequiredCallbackEnabled,
  onAuthRequiredCallbackEnabledChange,
  isUnreadCountCallbackEnabled,
  onUnreadCountCallbackEnabledChange,
  isEventCallbackEnabled,
  onEventCallbackEnabledChange,
}: ConfigScreenProps) {
  const hasNamedKeys = injectedApiKeys.length > 0;
  const [apiKeySource, setApiKeySource] = useState<ApiKeySource>(
    initialConfig?.apiKeySource ?? 'demo'
  );
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(
    initialConfig?.selectedKeyId ?? injectedApiKeys[0]?.id ?? null
  );
  // Never seeded from `initialConfig`: no key value is persisted, so this field
  // is the one thing a restored config still has to be re-answered.
  const [customApiKey, setCustomApiKey] = useState('');
  const [userId, setUserId] = useState(initialConfig?.userId ?? octopusUserId);
  const [authMode, setAuthMode] = useState<AuthMode>(
    initialConfig?.authMode ?? 'sso'
  );
  const [theme, setTheme] = useState<AppThemeChoice>(
    initialConfig?.theme ?? 'system'
  );
  // Expanded by default (spec 01 §5): every section on this screen opens expanded.
  const [areCallbacksExpanded, setAreCallbacksExpanded] = useState(true);
  // These two have no individually-disableable listener in the RN binding — the sample
  // has nothing to gate, so the toggle is UI-only and says so in its subtitle.
  const [isPushTapCallbackEnabled, setIsPushTapCallbackEnabled] =
    useState(true);
  const [isErrorCallbackEnabled, setIsErrorCallbackEnabled] = useState(false);

  const chrome = chromeColors(isDark);
  const textColor = chrome.text;
  const secondaryColor = chrome.textSecondary;
  const cardBg = chrome.surface;
  const borderColor = chrome.border;

  const demoKeyMissing =
    apiKeySource === 'demo' && !hasNamedKeys && !hasInjectedApiKey;
  // A pasted key is never persisted, so the field starts empty on every launch
  // — including one that restored a `custom` config.
  const customKeyMissing =
    apiKeySource === 'custom' && customApiKey.trim() === '';
  // Both branches gate the final button identically: with no key there is nothing to start.
  const apiKeyMissing = demoKeyMissing || customKeyMissing;

  const effectiveUserId = userId.trim() === '' ? octopusUserId : userId.trim();

  return (
    <View testID="config-screen" style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { color: secondaryColor }]}>
          {mode === 'onboarding'
            ? 'Point the sample at a community, then start the SDK.'
            : 'Change what the sample is pointed at. Applying restarts the SDK.'}
        </Text>

        {/* 1 — Community */}
        <Section title="Community" isDark={isDark}>
          {hasNamedKeys ? (
            <View
              testID="config-apiKeySource-select"
              style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            >
              {injectedApiKeys.map((key) => {
                const selected =
                  apiKeySource === 'demo' && selectedKeyId === key.id;
                return (
                  <TouchableOpacity
                    key={key.id}
                    testID={`config-apiKey-option-${key.id}`}
                    style={styles.radioRow}
                    onPress={() => {
                      setApiKeySource('demo');
                      setSelectedKeyId(key.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <Radio
                      selected={selected}
                      primaryColor={primaryColor}
                      borderColor={borderColor}
                    />
                    <Text style={[styles.radioLabel, { color: textColor }]}>
                      {key.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                testID="config-apiKey-option-custom"
                style={styles.radioRow}
                onPress={() => setApiKeySource('custom')}
                activeOpacity={0.7}
              >
                <Radio
                  selected={apiKeySource === 'custom'}
                  primaryColor={primaryColor}
                  borderColor={borderColor}
                />
                <View style={styles.radioTextColumn}>
                  <Text style={[styles.radioLabel, { color: textColor }]}>
                    Custom…
                  </Text>
                  <Text style={[styles.helper, { color: secondaryColor }]}>
                    Paste any API key
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <SegmentControl<ApiKeySource>
              testID="config-apiKeySource-select"
              options={[
                { label: 'Demo', value: 'demo' },
                { label: 'Custom', value: 'custom' },
              ]}
              value={apiKeySource}
              onChange={setApiKeySource}
              isDark={isDark}
              primaryColor={primaryColor}
              onPrimaryColor={onPrimaryColor}
            />
          )}

          {apiKeySource === 'custom' && (
            <>
              <TextInput
                testID="config-customApiKey-input"
                style={[
                  styles.input,
                  { color: textColor, borderColor, backgroundColor: cardBg },
                ]}
                value={customApiKey}
                onChangeText={setCustomApiKey}
                placeholder="Custom API key"
                placeholderTextColor={chrome.textPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {customKeyMissing && (
                <Text style={[styles.helper, { color: secondaryColor }]}>
                  Paste an API key to start. It is kept for this session only —
                  never written to device storage, so it has to be re-entered on
                  the next launch.
                </Text>
              )}
            </>
          )}

          {demoKeyMissing && (
            <Text style={[styles.helper, { color: secondaryColor }]}>
              No demo key injected, so the SDK cannot be started. Copy
              `.env.dist` to `.env` and set OCTOPUS_COMMUNITY_API_KEY, or pick
              Custom and paste a key.
            </Text>
          )}

          <Text style={[styles.helper, { color: secondaryColor }]}>
            No customer API key is ever embedded in this sample. Demo keys come
            from your own .env at build time, and a pasted key lives in memory
            for this session only.
          </Text>
        </Section>

        {/* 2 — Server environment */}
        <Section title="Server environment" isDark={isDark}>
          {/* Driven by the *host*, not by the ServerEnv the build carries: that type
              only distinguishes prod from custom, so on the demo backend it read
              "Custom" directly above a legend saying "Demo". */}
          <SegmentControl
            testID="config-serverEnv-select"
            options={[
              { label: 'Production', value: 'Production' },
              { label: 'Demo', value: 'Demo' },
              { label: 'Custom', value: 'Custom' },
            ]}
            value={octopusServerLabel}
            onChange={() => {}}
            disabled
            isDark={isDark}
            primaryColor={primaryColor}
            onPrimaryColor={onPrimaryColor}
          />
          <Text style={[styles.helper, { color: secondaryColor }]}>
            {/* Phrased so it stays true of a checkout that declares nothing, which is
                the default case since the fallback became the demo backend: the earlier
                wording asserted the host "is declared by OCTOPUS_API_HOST" and then
                contradicted itself one sentence later. */}
            {`${octopusServerLabel} — ${octopusHostLabel}. Fixed by the build and applied on initialize(), so there is nothing to pick once the app is running. The host comes from OCTOPUS_API_HOST; a build that names none targets the demo backend.`}
          </Text>
        </Section>

        {/* 3 — Authentication */}
        <Section title="Authentication (SSO)" isDark={isDark}>
          <SegmentControl<AuthMode>
            testID="config-authMode-select"
            options={[
              { label: 'SSO', value: 'sso' },
              { label: 'Octopus', value: 'octopus' },
            ]}
            value={authMode}
            onChange={setAuthMode}
            isDark={isDark}
            primaryColor={primaryColor}
            onPrimaryColor={onPrimaryColor}
          />
          <Text style={[styles.helper, { color: secondaryColor }]}>
            {authMode === 'sso'
              ? 'The app owns the user and serves signed entitlements on demand — what the Connection scenario exercises.'
              : 'The SDK owns login. The host has no user to connect, so the Connection scenario and the Account screen’s Connect button are disabled in this mode.'}
          </Text>

          <TextInput
            testID="config-userId-input"
            style={[
              styles.input,
              { color: textColor, borderColor, backgroundColor: cardBg },
            ]}
            value={userId}
            onChangeText={setUserId}
            placeholder="User id (SSO `sub`)"
            placeholderTextColor={chrome.textPlaceholder}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.chips}>
            {USER_ID_PRESETS.map((preset) => {
              const selected = userId.trim() === preset;
              return (
                <TouchableOpacity
                  key={preset}
                  testID={`config-userId-preset-${preset}`}
                  activeOpacity={0.7}
                  onPress={() => setUserId(preset)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? chrome.tint : chrome.surface,
                      borderColor: selected ? chrome.accent : chrome.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? chrome.accent : chrome.text },
                    ]}
                  >
                    {preset}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.helper, { color: secondaryColor }]}>
            Used by the Connection scenario's presets (the entitlements token's
            `sub`). Running two instances of the sample side by side? Pick a
            different id on each so the backend sees two distinct users —
            required for push-notification end-to-end QA. The pre-baked tokens
            are signed for
            {` "${octopusUserId}"`}, so a different id only connects when your
            build injects a token for it.
            {authMode === 'octopus'
              ? ' Ignored in Octopus auth mode, where the SDK owns the login.'
              : ''}
          </Text>
        </Section>

        {/* 4 — Theme */}
        <Section title="Theme" isDark={isDark}>
          <Text style={[styles.fieldLabel, { color: secondaryColor }]}>
            Appearance
          </Text>
          <SegmentControl<AppThemeChoice>
            testID="config-theme-select"
            options={[
              { label: 'System', value: 'system' },
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
            ]}
            value={theme}
            onChange={setTheme}
            isDark={isDark}
            primaryColor={primaryColor}
            onPrimaryColor={onPrimaryColor}
          />
          <Text style={[styles.fieldLabel, { color: secondaryColor }]}>
            Preset
          </Text>
          {/* Two options, not the scenario's five: this is the "make it look like the host"
              choice. The arbitrary probe sets stay in the Theme scenario, which is where
              proving that the SDK repaints at all belongs. */}
          <SegmentControl<ThemeSet>
            testID="config-themePreset-select"
            options={[
              { label: 'Octopus navy', value: 'octopusNavy' },
              { label: 'SDK default', value: 'none' },
            ]}
            value={themeSet === 'octopusNavy' ? 'octopusNavy' : 'none'}
            onChange={onThemeSetChange}
            isDark={isDark}
            primaryColor={primaryColor}
            onPrimaryColor={onPrimaryColor}
          />
          {themeSet !== 'octopusNavy' && themeSet !== 'none' && (
            <Text style={[styles.helper, { color: secondaryColor }]}>
              The Theme scenario currently holds a probe colour set. Picking
              either preset here replaces it.
            </Text>
          )}
        </Section>

        {/* Display mode — not one of the 7 host callbacks (spec 01 §5), so it gets its
            own small section rather than living inside "Host callbacks". */}
        <Section title="Display mode" isDark={isDark}>
          <SegmentControl<DisplayMode>
            testID="config-displayMode-select"
            options={[
              { label: 'Embedded', value: 'embed' },
              { label: 'Fullscreen', value: 'fullscreen' },
            ]}
            value={displayMode}
            onChange={onDisplayModeChange}
            isDark={isDark}
            primaryColor={primaryColor}
            onPrimaryColor={onPrimaryColor}
          />
          <Text style={[styles.helper, { color: secondaryColor }]}>
            Whether the Community tab embeds the SDK in the app or presents it
            fullscreen.
          </Text>
        </Section>

        {/* 5 — Host callbacks (SDK -> app), expanded by default */}
        <View
          style={[
            styles.collapsible,
            { backgroundColor: cardBg, borderColor: chrome.border },
          ]}
        >
          <TouchableOpacity
            testID="config-hostCallbacks-toggle"
            accessibilityRole="button"
            activeOpacity={0.7}
            style={styles.collapsibleHeader}
            onPress={() => setAreCallbacksExpanded((open) => !open)}
          >
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Host callbacks
            </Text>
            <MaterialIcons
              name={areCallbacksExpanded ? 'expand-less' : 'expand-more'}
              size={22}
              color={secondaryColor}
            />
          </TouchableOpacity>
          {areCallbacksExpanded && (
            <View style={styles.collapsibleBody}>
              <Text style={[styles.helper, { color: secondaryColor }]}>
                What the SDK calls back into the host app. On means the sample
                provides the implementation; off means the callback isn't passed
                to the SDK, so you see its default behaviour instead.
              </Text>
              <ToggleRow
                testID="config-callback-onNavigateToProfile"
                title="onNavigateToProfile"
                subtitle="Opens the host's own profile screen"
                value={profileTapMode === 'appScreens'}
                onValueChange={(next) =>
                  onProfileTapModeChange(next ? 'appScreens' : 'sdkScreens')
                }
                isDark={isDark}
              />
              <ToggleRow
                testID="config-force-exposeClientUserId"
                title="Force exposeClientUserId"
                subtitle="Debug override: activates Unified Profile without the backend flag"
                value={isExposeClientUserIdForced}
                onValueChange={onExposeClientUserIdForcedChange}
                isDark={isDark}
              />
              <ToggleRow
                testID="config-callback-onNavigateToContent"
                title="onNavigateToContent"
                subtitle="Deep links to a piece of host content"
                value={urlOpeningMode === 'inAppWebView'}
                onValueChange={(next) =>
                  onUrlOpeningModeChange(
                    next ? 'inAppWebView' : 'defaultBrowser'
                  )
                }
                isDark={isDark}
              />
              <ToggleRow
                testID="config-callback-onAuthenticationRequired"
                title="onAuthenticationRequired"
                subtitle="The host must connect the user"
                value={isAuthRequiredCallbackEnabled}
                onValueChange={onAuthRequiredCallbackEnabledChange}
                isDark={isDark}
              />
              <ToggleRow
                testID="config-callback-onPushNotificationTapped"
                title="onPushNotificationTapped"
                subtitle="Not wired in the RN binding yet"
                value={isPushTapCallbackEnabled}
                onValueChange={setIsPushTapCallbackEnabled}
                isDark={isDark}
              />
              <ToggleRow
                testID="config-callback-onUnreadCountChanged"
                title="onUnreadCountChanged"
                subtitle="Feeds the host's unread badge"
                value={isUnreadCountCallbackEnabled}
                onValueChange={onUnreadCountCallbackEnabledChange}
                isDark={isDark}
              />
              <ToggleRow
                testID="config-callback-onEvent"
                title="onEvent"
                subtitle="Analytics: SDK events sent to the host"
                value={isEventCallbackEnabled}
                onValueChange={onEventCallbackEnabledChange}
                isDark={isDark}
              />
              <ToggleRow
                testID="config-callback-onError"
                title="onError"
                subtitle="Not wired in the RN binding yet"
                value={isErrorCallbackEnabled}
                onValueChange={setIsErrorCallbackEnabled}
                isDark={isDark}
                last
              />
            </View>
          )}
        </View>

        {/* The one filled CTA of the sample, so the one place the brand's pressed
            tone is visible — hence a Pressable rather than a fading Touchable. */}
        <Pressable
          testID="config-start-button"
          style={({ pressed }) => [
            styles.startButton,
            { backgroundColor: pressed ? chrome.accentPressed : chrome.accent },
            apiKeyMissing && styles.startButtonDisabled,
          ]}
          disabled={apiKeyMissing}
          onPress={() =>
            onStart({
              apiKeySource,
              customApiKey: customApiKey.trim(),
              selectedKeyId: apiKeySource === 'demo' ? selectedKeyId : null,
              userId: effectiveUserId,
              authMode,
              theme,
              serverEnv: buildServerEnv,
            })
          }
        >
          <Text style={[styles.startButtonText, { color: onPrimaryColor }]}>
            {mode === 'onboarding' ? 'Start SDK' : 'Apply'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

/** A titled group of controls — the screen's only structural element. */
function Section({
  title,
  isDark,
  children,
}: {
  title: string;
  isDark: boolean;
  children: React.ReactNode;
}) {
  const chrome = chromeColors(isDark);
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: chrome.text }]}>{title}</Text>
      {children}
    </View>
  );
}

/** One row of the "Host callbacks" section — bold title, small subtitle, a switch. */
function ToggleRow({
  testID,
  title,
  subtitle,
  value,
  onValueChange,
  isDark,
  last = false,
}: {
  testID: string;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  isDark: boolean;
  last?: boolean;
}) {
  const chrome = chromeColors(isDark);
  return (
    <View
      style={[
        styles.toggleRow,
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: chrome.border,
        },
      ]}
    >
      <View style={styles.toggleTexts}>
        <Text style={[styles.toggleTitle, { color: chrome.text }]}>
          {title}
        </Text>
        <Text style={[styles.toggleSubtitle, { color: chrome.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
      <Switch
        testID={testID}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: chrome.track, true: chrome.control }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function Radio({
  selected,
  primaryColor,
  borderColor,
}: {
  selected: boolean;
  primaryColor: string;
  borderColor: string;
}) {
  return (
    <View
      style={[
        styles.radioOuter,
        { borderColor: selected ? primaryColor : borderColor },
      ]}
    >
      {selected && (
        <View style={[styles.radioInner, { backgroundColor: primaryColor }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 8,
  },
  intro: {
    fontSize: 14,
    marginBottom: 4,
  },
  section: {
    gap: 8,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  radioTextColumn: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 14,
    flexShrink: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  helper: {
    fontSize: 12,
    lineHeight: 17,
  },
  collapsible: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  collapsibleBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  startButton: {
    marginTop: 24,
    borderRadius: 99,
    paddingVertical: 15,
    alignItems: 'center',
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  toggleTexts: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  toggleSubtitle: {
    fontSize: 10,
  },
});
