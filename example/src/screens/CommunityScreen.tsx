import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Octopus from '@octopus-community/react-native';
import type { OctopusInitialScreen } from '@octopus-community/react-native';
import type { DisplayMode } from './SetupScreen';

/**
 * Embedded-view initialScreen presets. `initialScreen` is read on mount only,
 * so switching preset has to remount the native view — see the `key` below.
 *
 * `enabled` is resolved from a *static* `process.env.X`: react-native-dotenv
 * inlines those at build time, so a computed lookup would read undefined.
 */
const EMBEDDED_INITIAL_SCREENS: {
  key: string;
  label: string;
  screen?: OctopusInitialScreen;
  enabled: boolean;
}[] = [
  { key: 'mainFeed', label: 'Main feed', enabled: true },
  {
    key: 'post',
    label: 'Post',
    screen: {
      type: 'post',
      postId: process.env.OCTOPUS_DEMO_POST_ID as string,
    },
    enabled: !!process.env.OCTOPUS_DEMO_POST_ID,
  },
  {
    key: 'activity',
    label: 'Member posts',
    screen: {
      type: 'activity',
      member: { clientUserId: process.env.OCTOPUS_SSO_USER_ID as string },
    },
    enabled: !!process.env.OCTOPUS_SSO_USER_ID,
  },
  {
    key: 'ownProfile',
    label: 'Own profile',
    screen: { type: 'profile' },
    enabled: true,
  },
  {
    key: 'createPost',
    label: 'Post editor',
    screen: { type: 'createPost' },
    enabled: true,
  },
];

export interface CommunityScreenProps {
  displayMode: DisplayMode;
  notSeenNotificationsCount: number;
  interceptUrls: boolean;
  interceptProfileTaps: boolean;
  onOpenFullscreen: () => void;
  isDark: boolean;
  primaryColor: string;
  onPrimaryColor: string;
}

/**
 * Community tab: embedded OctopusUIView (when displayMode is embed) or
 * a tap target to open fullscreen (when displayMode is fullscreen).
 * Shows notSeenNotificationsCount badge; tapping opens the SDK view in the chosen mode.
 */
export function CommunityScreen({
  displayMode,
  notSeenNotificationsCount,
  interceptUrls,
  interceptProfileTaps,
  onOpenFullscreen,
  isDark,
  primaryColor,
  onPrimaryColor,
}: CommunityScreenProps) {
  // Embedded-view initial screen. Held here rather than in App.tsx: it only
  // configures this screen's embedded view.
  const [embeddedScreenKey, setEmbeddedScreenKey] = useState('mainFeed');
  const textColor = isDark ? '#ffffff' : '#000000';
  const secondaryColor = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#2a2a2a' : '#f5f5f5';
  const borderColor = isDark ? '#444444' : '#e8e8e8';

  if (displayMode === 'embed') {
    const selected = EMBEDDED_INITIAL_SCREENS.find(
      (preset) => preset.key === embeddedScreenKey
    );
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <View style={[styles.presetBar, { borderColor }]}>
          {EMBEDDED_INITIAL_SCREENS.map((preset) => {
            const active = preset.key === embeddedScreenKey;
            return (
              <TouchableOpacity
                key={preset.key}
                testID={`qa-embedded-initialScreen-${preset.key}`}
                style={[
                  styles.presetChip,
                  { borderColor },
                  active && { backgroundColor: primaryColor },
                  !preset.enabled && styles.presetChipDisabled,
                ]}
                disabled={!preset.enabled}
                onPress={() => setEmbeddedScreenKey(preset.key)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    { color: active ? onPrimaryColor : textColor },
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.embedHost}>
          {/*
            `initialScreen` is consumed when the native view is built, so the key
            is what actually re-mounts it on a new screen.
          */}
          <Octopus.OctopusUIView
            key={embeddedScreenKey}
            interceptUrls={interceptUrls}
            interceptProfileTaps={interceptProfileTaps}
            initialScreen={selected?.screen}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <TouchableOpacity
        style={[styles.openCard, { backgroundColor: cardBg, borderColor }]}
        onPress={onOpenFullscreen}
        activeOpacity={0.8}
      >
        <View style={styles.openCardContent}>
          <View style={[styles.badgeLarge, { backgroundColor: primaryColor }]}>
            <Text style={[styles.badgeLargeText, { color: onPrimaryColor }]}>
              {notSeenNotificationsCount > 99
                ? '99+'
                : notSeenNotificationsCount}
            </Text>
          </View>
          <Text style={[styles.openCardTitle, { color: textColor }]}>
            Tap to open community
          </Text>
          <Text style={[styles.openCardHint, { color: secondaryColor }]}>
            Opens the Octopus UI in fullscreen
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  presetBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  presetChipDisabled: {
    opacity: 0.4,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  embedHost: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 16,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    zIndex: 1,
  },
  badgeDark: {
    borderColor: '#1a1a1a',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  openCard: {
    margin: 20,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxHeight: 280,
  },
  openCardContent: {
    alignItems: 'center',
    gap: 12,
  },
  badgeLarge: {
    borderRadius: 24,
    minWidth: 48,
    height: 48,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLargeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  openCardTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  openCardHint: {
    fontSize: 13,
  },
});
