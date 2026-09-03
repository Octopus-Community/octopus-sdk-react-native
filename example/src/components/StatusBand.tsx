import { StyleSheet, Text, View } from 'react-native';

import { chromeColors } from '../theme/branding';
import { PillButton } from './PillButton';

/**
 * Which of the two persistent bands this is.
 *
 * `blocking` — nothing in the community can work until it is fixed. `degraded` — the
 * community works, but part of it is unavailable.
 *
 * The two transient members of the shared band grammar are deliberately absent: the empty
 * state is rendered by the SDK inside its own surface, and a reversible confirmation is a
 * snackbar rather than a band.
 */
export type StatusBandKind = 'blocking' | 'degraded';

export interface StatusBandProps {
  kind: StatusBandKind;
  /** The cause, in the host's own words — never a status code, which belongs in Events log. */
  message: string;
  /** Every band carries an action; a band the reader cannot act on is just noise. */
  actionLabel: string;
  onAction: () => void;
  isDark: boolean;
  testID?: string;
}

/**
 * A sample-layer status band, rendered under the app bar and ABOVE the SDK surface.
 *
 * The rule it exists to keep: the Community tab belongs to the SDK, so the sample never
 * draws inside it. What the host has to say about the SDK's state is said here, in the
 * sample's own colours, with the "APP" sigil making the ownership explicit — a tester
 * reporting a bug should never have to guess which layer wrote a message.
 *
 * Persistent by design, and therefore without a dismiss control: both kinds describe a state
 * that is still true after the reader has read them, and both are answered by their action,
 * not by being closed.
 */
export function StatusBand({
  kind,
  message,
  actionLabel,
  onAction,
  isDark,
  testID,
}: StatusBandProps) {
  const chrome = chromeColors(isDark);
  const blocking = kind === 'blocking';
  const surface = blocking ? chrome.dangerSurface : chrome.warnSurface;
  const border = blocking ? chrome.dangerBorder : chrome.warnBorder;
  const accent = blocking ? chrome.danger : chrome.warn;

  return (
    <View
      testID={testID}
      style={[
        styles.band,
        { backgroundColor: surface, borderBottomColor: border },
      ]}
    >
      <View style={styles.textColumn}>
        <View style={[styles.sigil, { borderColor: accent }]}>
          <Text style={[styles.sigilText, { color: accent }]}>APP</Text>
        </View>
        <Text style={[styles.message, { color: accent }]}>{message}</Text>
      </View>
      <PillButton
        label={actionLabel}
        onPress={onAction}
        isDark={isDark}
        variant={blocking ? 'danger' : 'secondary'}
        testID={testID ? `${testID}-action` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  textColumn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  sigil: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  sigilText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  message: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
