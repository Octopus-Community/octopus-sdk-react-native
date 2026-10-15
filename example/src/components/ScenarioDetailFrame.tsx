import type { ReactNode } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { AppBar } from './AppBar';
import { chromeColors } from '../theme/branding';
import { sampleSpacing } from '../theme/tokens';
import { Banner } from './SampleRecipes';

export function ScenarioDetailFrame({
  title,
  isDark,
  onBack,
  onOpenDebug,
  children,
  forceLogin,
}: {
  title: string;
  isDark: boolean;
  onBack: () => void;
  onOpenDebug: () => void;
  children: ReactNode;
  forceLogin?: boolean;
}) {
  const chrome = chromeColors(isDark);
  return (
    <View style={styles.container}>
      <AppBar
        title={title}
        isDark={isDark}
        size="medium"
        showPlatformBadge={false}
        onBack={onBack}
        onOpenDebug={onOpenDebug}
        backTestID="scenarios-back-button"
      />
      <ScrollView
        style={[styles.container, { backgroundColor: chrome.screen }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {forceLogin !== undefined && (
          <Banner
            isDark={isDark}
            title="Force login"
            message={
              forceLogin
                ? 'Visitors must sign in before strong actions.'
                : 'Visitors can browse the community before signing in.'
            }
          />
        )}
        {children}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: sampleSpacing.gutter,
    paddingTop: sampleSpacing.xs,
    paddingBottom: sampleSpacing.group,
  },
});
