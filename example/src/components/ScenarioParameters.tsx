import { StyleSheet, Text, View } from 'react-native';
import type { ScenarioId } from '../scenarios/catalog';
import { chromeColors } from '../theme/branding';
import { sampleTypography } from '../theme/tokens';
import { ParametersPanel, TypePill } from './SampleRecipes';

const PARAMETERS: Partial<Record<ScenarioId, [string, string, string][]>> = {
  connection: [
    ['user', 'ConnectUserConfig', 'the SSO user stored on the Account screen'],
  ],
  communityData: [
    [
      'profileId',
      'String',
      "the connected profile's id, or the id typed below",
    ],
  ],
  syncFollowGroups: [
    [
      'actions',
      'SyncFollowGroupAction[]',
      'one action per followable group, dated now',
    ],
  ],
  communityAccess: [['hasAccess', 'boolean', 'true to grant, false to deny']],
  forceOctopusABTests: [
    ['hasAccess', 'boolean', 'true to grant, false to deny'],
  ],
  trackABTests: [['hasAccess', 'boolean', 'true to grant, false to deny']],
  customEvents: [
    ['name', 'String', 'the event name'],
    ['properties', 'Record<string, string>', 'the properties attached below'],
  ],
  locale: [['locale', 'String | null', 'a language code, or null to reset']],
};

export function ScenarioParameters({
  id,
  isDark,
}: {
  id: ScenarioId;
  isDark: boolean;
}) {
  const params = PARAMETERS[id];
  const chrome = chromeColors(isDark);
  if (!params) return null;
  return (
    <ParametersPanel isDark={isDark}>
      <Text style={[sampleTypography.label, { color: chrome.text }]}>
        Parameters
      </Text>
      {params.map(([name, type, value]) => (
        <View key={name}>
          <View style={styles.header}>
            <Text
              style={[
                sampleTypography.mono,
                styles.name,
                { color: chrome.text },
              ]}
            >
              {name}
            </Text>
            <TypePill value={type} isDark={isDark} />
          </View>
          <Text
            style={[sampleTypography.caption, { color: chrome.textSecondary }]}
          >
            {value}
          </Text>
        </View>
      ))}
    </ParametersPanel>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  name: { fontWeight: '600' },
});
