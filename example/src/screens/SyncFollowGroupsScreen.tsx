import { useState } from 'react';
import {
  Button,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import {
  syncFollowGroups,
  SyncFollowGroupStatus,
  type SyncFollowGroupResult,
} from '@octopus-community/react-native';

export function SyncFollowGroupsScreen() {
  const [groupId, setGroupId] = useState('');
  const [results, setResults] = useState<SyncFollowGroupResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function run(followed: boolean) {
    setError(null);
    try {
      const res = await syncFollowGroups([
        { groupId, followed, actionDate: new Date() },
      ]);
      setResults(res);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Group ID</Text>
      <TextInput
        value={groupId}
        onChangeText={setGroupId}
        placeholder="e.g. group-123"
        style={styles.input}
      />
      <View style={styles.row}>
        <Button title="Follow" onPress={() => run(true)} />
        <Button title="Unfollow" onPress={() => run(false)} />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {results.map((r) => (
        <Text key={r.groupId}>
          {r.groupId} →{' '}
          {r.status === SyncFollowGroupStatus.Applied ? 'applied' : r.status}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  label: { fontWeight: '600' },
  input: { borderWidth: 1, padding: 8, borderRadius: 4 },
  row: { flexDirection: 'row', gap: 8 },
  error: { color: 'red' },
});
