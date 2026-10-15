import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { chromeColors } from '../theme/branding';
import { sampleRadius, sampleTypography } from '../theme/tokens';
import { SampleInfoRow } from './SampleInfoRow';

type Icon = React.ComponentProps<typeof MaterialIcons>['name'];
export function ScenarioBlock({
  title,
  icon = 'science',
  isDark,
  children,
}: {
  title: string;
  icon?: Icon;
  isDark: boolean;
  children: ReactNode;
}) {
  const c = chromeColors(isDark);
  return (
    <View
      style={[
        styles.scenario,
        { backgroundColor: c.tint, borderColor: `${c.accentText}59` },
      ]}
    >
      <View style={styles.scenarioHeader}>
        <MaterialIcons name={icon} size={20} color={c.accentText} />
        <Text style={[sampleTypography.buttonLabel, { color: c.text }]}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}
export function ParametersPanel({
  isDark,
  children,
}: {
  isDark: boolean;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.parameters,
        { backgroundColor: chromeColors(isDark).tint },
      ]}
    >
      {children}
    </View>
  );
}
export function TypePill({
  value,
  isDark,
}: {
  value: string;
  isDark: boolean;
}) {
  const c = chromeColors(isDark);
  return (
    <View
      style={[
        styles.typePill,
        { backgroundColor: c.surface3, borderColor: c.outline },
      ]}
    >
      <Text style={[sampleTypography.monoSmall, { color: c.text }]}>
        {value}
      </Text>
    </View>
  );
}
export function GroupHeader({
  title,
  count,
  isDark,
}: {
  title: string;
  count?: number;
  isDark: boolean;
}) {
  const c = chromeColors(isDark);
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={count === undefined ? title : `${title}, ${count}`}
      style={styles.groupHeader}
    >
      <Text style={[sampleTypography.label, { color: c.text }]}>{title}</Text>
      {count !== undefined && (
        <View
          style={[
            styles.count,
            { backgroundColor: c.surface3, borderColor: c.outline },
          ]}
        >
          <Text style={[sampleTypography.caption, { color: c.text }]}>
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}
export function ListDivider({
  isDark,
  settings = false,
}: {
  isDark: boolean;
  settings?: boolean;
}) {
  return (
    <View
      style={[
        styles.divider,
        settings && styles.settingsDivider,
        { backgroundColor: chromeColors(isDark).hairline },
      ]}
    />
  );
}
export function SummaryRow({
  title,
  subtitle,
  icon,
  isDark,
  onPress,
  testID,
  danger = false,
}: {
  title: string;
  subtitle?: string;
  icon: Icon;
  isDark: boolean;
  onPress: () => void;
  testID?: string;
  danger?: boolean;
}) {
  const c = chromeColors(isDark);
  const ink = danger ? c.danger : c.text;
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.summary, { backgroundColor: c.surface }]}
    >
      <MaterialIcons name={icon} size={24} color={ink} />
      <View style={styles.flex}>
        <Text style={[sampleTypography.body, { color: ink }]}>{title}</Text>
        {subtitle && (
          <Text style={[sampleTypography.callout, { color: c.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <MaterialIcons name="chevron-right" size={24} color={c.textSecondary} />
    </TouchableOpacity>
  );
}
export function Banner({
  kind = 'info',
  title,
  message,
  actionLabel,
  onAction,
  testID,
  isDark,
  inline = false,
}: {
  kind?: 'info' | 'warning' | 'error';
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
  isDark: boolean;
  inline?: boolean;
}) {
  const c = chromeColors(isDark);
  const ink =
    kind === 'error' ? c.danger : kind === 'warning' ? c.warn : c.accentText;
  const fill =
    kind === 'error'
      ? c.dangerSurface
      : kind === 'warning'
        ? c.warnSurface
        : c.tint;
  return (
    <View
      testID={testID}
      style={[
        styles.banner,
        inline && styles.inlineBanner,
        {
          backgroundColor: fill,
          borderColor: `${ink}73`,
        },
      ]}
    >
      <MaterialIcons
        name={
          kind === 'error'
            ? 'error-outline'
            : kind === 'warning'
              ? 'warning-amber'
              : 'info-outline'
        }
        size={20}
        color={ink}
      />
      <View style={styles.flex}>
        {title && (
          <Text style={[sampleTypography.label, { color: ink }]}>{title}</Text>
        )}
        <Text style={[sampleTypography.callout, { color: ink }]}>
          {message}
        </Text>
      </View>
      {actionLabel && onAction && (
        <TouchableOpacity
          testID={testID ? `${testID}-action` : undefined}
          accessibilityRole="button"
          onPress={onAction}
          style={styles.textButton}
        >
          <Text style={[sampleTypography.label, { color: ink }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
export function LiveConfigPanel({
  title,
  explanation,
  note,
  rows,
  isDark,
  testID,
}: {
  title: string;
  explanation: string;
  note?: string;
  rows: { label: string; value: string }[];
  isDark: boolean;
  testID?: string;
}) {
  const c = chromeColors(isDark);
  return (
    <View
      testID={testID}
      style={[
        styles.liveConfig,
        { backgroundColor: c.tint, borderColor: c.border },
      ]}
    >
      <Text style={[sampleTypography.label, { color: c.text }]}>{title}</Text>
      <Text style={[sampleTypography.caption, { color: c.textSecondary }]}>
        {explanation}
      </Text>
      {rows.map((row) => (
        <SampleInfoRow key={row.label} {...row} isDark={isDark} compact />
      ))}
      {note && (
        <Text style={[sampleTypography.caption, { color: c.textSecondary }]}>
          {note}
        </Text>
      )}
    </View>
  );
}
export type Status =
  | 'ready'
  | 'running'
  | 'passed'
  | 'failed'
  | 'blocked'
  | 'unavailable';
export function StatusBadge({
  status,
  isDark,
  label,
}: {
  status: Status;
  isDark: boolean;
  label?: string;
}) {
  const c = chromeColors(isDark);
  const ink =
    status === 'passed'
      ? c.success
      : status === 'failed'
        ? c.danger
        : status === 'blocked'
          ? c.warn
          : status === 'unavailable'
            ? c.textSecondary
            : c.accentText;
  const fill =
    status === 'passed'
      ? c.successSurface
      : status === 'failed'
        ? c.dangerSurface
        : status === 'blocked'
          ? c.warnSurface
          : status === 'running'
            ? c.tint
            : 'transparent';
  const labels = {
    ready: 'Ready',
    running: 'Running…',
    passed: '✓ Success',
    failed: '✕ Error',
    blocked: 'Blocked',
    unavailable: 'Not available',
  };
  const icons: Record<Status, Icon> = {
    ready: 'play-arrow',
    running: 'hourglass-top',
    passed: 'check',
    failed: 'close',
    blocked: 'lock-outline',
    unavailable: 'remove',
  };
  return (
    <View
      style={[
        styles.status,
        status === 'unavailable' && styles.unavailable,
        {
          backgroundColor: fill,
          borderColor: status === 'unavailable' ? c.outline : ink,
        },
      ]}
    >
      {status === 'running' ? (
        <ActivityIndicator size="small" color={ink} />
      ) : (
        <MaterialIcons name={icons[status]} size={16} color={ink} />
      )}
      <Text style={[sampleTypography.badge, { color: ink }]}>
        {label ?? labels[status]}
      </Text>
    </View>
  );
}
export function CodeResultBlock({
  message,
  isDark,
}: {
  message: string;
  isDark: boolean;
}) {
  const c = chromeColors(isDark);
  return (
    <View style={[styles.code, { backgroundColor: c.codeSurface }]}>
      <Text style={[sampleTypography.mono, { color: c.onCodeSurface }]}>
        {message}
      </Text>
    </View>
  );
}
export function ProfileHeader({
  title,
  isDark,
}: {
  title: string;
  isDark: boolean;
}) {
  const c = chromeColors(isDark);
  return (
    <View style={styles.profileHeader}>
      <MaterialIcons name="person" size={64} color={c.accent} />
      <Text
        style={[
          sampleTypography.title2,
          styles.profileTitle,
          { color: c.text },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  divider: { height: 1, marginHorizontal: 16 },
  settingsDivider: { marginLeft: 52, marginRight: 0 },
  inlineBanner: { borderRadius: 0 },
  unavailable: { borderStyle: 'dashed' },
  profileTitle: { textAlign: 'center' },
  scenario: {
    borderRadius: sampleRadius.xl,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 12,
  },
  scenarioHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  parameters: { borderRadius: 12, padding: 12, gap: 8 },
  typePill: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  groupHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  count: {
    borderRadius: sampleRadius.pill,
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    alignItems: 'center',
  },
  summary: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  banner: {
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textButton: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveConfig: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
    marginBottom: 12,
  },
  status: {
    minHeight: 28,
    borderRadius: sampleRadius.pill,
    borderWidth: 1.5,
    paddingLeft: 8,
    paddingRight: 10,
    gap: 4,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  code: { borderRadius: 8, padding: 12 },
  profileHeader: { alignItems: 'center', gap: 12 },
});
