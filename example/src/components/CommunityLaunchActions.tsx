import { sampleSpacing, sampleTypography } from '../theme/tokens';
import { StyleSheet, View, Text } from 'react-native';
import { PillButton } from './PillButton';
import { chromeColors } from '../theme/branding';
import { ScenarioBlock } from './SampleRecipes';

/** Existing Home launch controls, moved above the Scenarios index. */
export function CommunityLaunchActions({
  isDark,
  onFullscreen,
  onEmbedded,
  onModal,
  onSheet,
}: {
  isDark: boolean;
  onFullscreen: () => void;
  onEmbedded: () => void;
  onModal: () => void;
  onSheet: () => void;
}) {
  const chrome = chromeColors(isDark);
  return (
    <ScenarioBlock title="Open the community" icon="forum" isDark={isDark}>
      <Text style={[sampleTypography.caption, { color: chrome.textSecondary }]}>
        The same community, in the container your app gives it.
      </Text>
      <View style={styles.row}>
        <PillButton
          testID="home-open-embedded-button"
          label="Tab"
          variant="primary"
          isDark={isDark}
          onPress={onEmbedded}
          style={styles.mode}
        />
        <PillButton
          testID="home-open-modal-button"
          label="Modal"
          variant="secondary"
          isDark={isDark}
          onPress={onModal}
          style={styles.mode}
        />
      </View>
      <View style={styles.row}>
        <PillButton
          testID="home-open-sheet-button"
          label="Sheet"
          variant="secondary"
          isDark={isDark}
          onPress={onSheet}
          style={styles.mode}
        />
        <PillButton
          testID="home-open-community-button"
          label="Full screen"
          variant="secondary"
          isDark={isDark}
          style={styles.mode}
          onPress={onFullscreen}
        />
      </View>
    </ScenarioBlock>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: sampleSpacing.sm },
  mode: { flexGrow: 1, flexBasis: '40%' },
});
