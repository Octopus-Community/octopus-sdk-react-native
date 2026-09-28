import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import * as Octopus from '@octopus-community/react-native';

import { PillButton } from './PillButton';
import { chromeColors } from '../theme/branding';
import {
  EXPOSE_OVERRIDE_CHOICES,
  UNIFIED_PROFILE_INTRO,
  UNIFIED_PROFILE_TITLE,
  describeExposeClientUserId,
} from '../scenarios/unifiedProfile';
import type { ExposeClientUserIdOverride } from '../scenarios/unifiedProfile';

/**
 * Open state, remembered across visits to the Scenarios tab like the section open state
 * next to it. Collapsed by default, as on Android.
 */
let isUnifiedProfileExpanded = false;

export interface UnifiedProfileSectionProps {
  isDark: boolean;
  override: ExposeClientUserIdOverride;
  /** Applies the override to the live SDK; resolves once the native side has it. */
  onOverrideChange: (next: ExposeClientUserIdOverride) => Promise<void>;
}

/**
 * The Unified Profile override, nested inside Scenarios › Sign-in & user after that
 * section's scenario cards — the Android sample's placement, labels and test ids. The
 * choice applies live: no Apply, no SDK restart, so the connected SSO user survives it.
 */
export function UnifiedProfileSection({
  isDark,
  override,
  onOverrideChange,
}: UnifiedProfileSectionProps) {
  const chrome = chromeColors(isDark);
  const [expanded, setExpanded] = useState(isUnifiedProfileExpanded);
  // undefined = not read (or unreadable), null = no config fetched yet.
  const [config, setConfig] = useState<
    { exposeClientUserId: boolean } | null | undefined
  >(undefined);

  const refresh = useCallback(async () => {
    try {
      setConfig(await Octopus.debugGetCommunityConfig());
    } catch {
      setConfig(undefined);
    }
  }, []);

  useEffect(() => {
    if (expanded) refresh();
  }, [expanded, refresh]);

  const toggle = () => {
    isUnifiedProfileExpanded = !expanded;
    setExpanded(!expanded);
  };

  const choose = async (next: ExposeClientUserIdOverride) => {
    try {
      await onOverrideChange(next);
    } finally {
      await refresh();
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        testID="scenarios-unified-profile"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={toggle}
        style={styles.header}
      >
        <Text style={[styles.title, { color: chrome.text }]}>
          {UNIFIED_PROFILE_TITLE}
        </Text>
        <MaterialIcons
          name={expanded ? 'expand-less' : 'expand-more'}
          size={20}
          color={chrome.textSecondary}
        />
      </Pressable>
      {expanded && (
        <View style={styles.body}>
          <Text style={[styles.intro, { color: chrome.textSecondary }]}>
            {UNIFIED_PROFILE_INTRO}
          </Text>
          <View testID="unified-profile-live-value" style={styles.liveRow}>
            <Text style={[styles.liveLabel, { color: chrome.text }]}>
              {UNIFIED_PROFILE_TITLE}
            </Text>
            <Text style={[styles.liveValue, { color: chrome.text }]}>
              {describeExposeClientUserId(config)}
            </Text>
          </View>
          {EXPOSE_OVERRIDE_CHOICES.map((choice) => (
            <PillButton
              key={choice.testID}
              testID={choice.testID}
              label={choice.label}
              variant={override === choice.value ? 'primary' : 'secondary'}
              fullWidth
              isDark={isDark}
              onPress={() => choose(choice.value)}
              style={styles.choice}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 12,
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    paddingBottom: 4,
  },
  intro: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  liveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  liveLabel: {
    flex: 1,
    fontSize: 13,
  },
  liveValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  choice: {
    marginBottom: 8,
  },
});
