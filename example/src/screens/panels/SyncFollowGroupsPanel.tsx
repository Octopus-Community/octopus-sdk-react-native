/* eslint-disable react-native/no-inline-styles */
import {
  syncFollowGroups,
  SyncFollowGroupStatus,
  type SyncFollowGroupResult,
} from '@octopus-community/react-native';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import { debugLog } from '../../debug/debugLog';
import { panelColors, panelStyles } from './panelStyles';

/**
 * Free-text `syncFollowGroups` form, folded into the Sync Followed Groups scenario.
 *
 * Was the example's Groups tab. The scenario's presets sync a fixed set of ids for the QA
 * pipeline; this form is what proves an arbitrary group id round-trips, and it is the only place
 * that shows the per-group `status` the SDK answers with.
 */
export function SyncFollowGroupsPanel({
  isDark,
  primaryColor,
}: {
  isDark: boolean;
  primaryColor: string;
}) {
  const c = panelColors(isDark);
  const [groupId, setGroupId] = useState('');
  const [results, setResults] = useState<SyncFollowGroupResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(followed: boolean) {
    setError(null);
    setBusy(true);
    try {
      const res = await syncFollowGroups([
        { groupId: groupId.trim(), followed, actionDate: new Date() },
      ]);
      setResults(res);
      debugLog.apiCall(
        'syncFollowGroups',
        `✓ ${res.map((r) => `${r.groupId} → ${r.status}`).join(', ')}`
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      debugLog.apiCall('syncFollowGroups', `✕ ${message}`);
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || groupId.trim() === '';

  return (
    <View style={panelStyles.block}>
      <Text style={[panelStyles.title, { color: c.text }]}>
        Sync one group by id
      </Text>
      <TextInput
        style={[
          panelStyles.input,
          { backgroundColor: c.inputBg, borderColor: c.border, color: c.text },
        ]}
        value={groupId}
        onChangeText={setGroupId}
        placeholder="Group id (e.g. group-123)"
        placeholderTextColor={c.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
      />
      <View style={panelStyles.buttonRow}>
        <TouchableOpacity
          style={[
            panelStyles.button,
            { borderColor: primaryColor },
            disabled && panelStyles.buttonDisabled,
          ]}
          onPress={() => run(true)}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <Text style={[panelStyles.buttonText, { color: primaryColor }]}>
            Follow
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            panelStyles.button,
            { borderColor: primaryColor },
            disabled && panelStyles.buttonDisabled,
          ]}
          onPress={() => run(false)}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <Text style={[panelStyles.buttonText, { color: primaryColor }]}>
            Unfollow
          </Text>
        </TouchableOpacity>
      </View>
      {error !== null && (
        <Text style={[panelStyles.feedback, { color: '#FF3B30' }]}>
          ✕ {error}
        </Text>
      )}
      {results.map((r) => (
        <Text
          key={r.groupId}
          style={[panelStyles.feedback, { color: c.secondary }]}
        >
          {r.groupId} →{' '}
          {r.status === SyncFollowGroupStatus.Applied ? 'applied' : r.status}
        </Text>
      ))}
    </View>
  );
}
