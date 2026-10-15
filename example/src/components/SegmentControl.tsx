import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { chromeColors } from '../theme/branding';
import { sampleRadius, sampleTypography } from '../theme/tokens';
export interface SegmentOption<T extends string> {
  label: string;
  value: T;
}
interface SegmentControlProps<T extends string> {
  testID?: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  isDark: boolean;
  style?: ViewStyle;
  disabled?: boolean;
}
/** Android's threshold for replacing a joined segment with a scrolling choice ribbon. */
export function segmentedNeedsChipRow(labels: string[]) {
  const longest = Math.max(0, ...labels.map((label) => label.length));
  return (
    labels.length > 4 || longest > 12 || (labels.length > 3 && longest > 8)
  );
}
export function SegmentControl<T extends string>({
  testID,
  options,
  value,
  onChange,
  isDark,
  style,
  disabled = false,
}: SegmentControlProps<T>) {
  const c = chromeColors(isDark);
  const scrolling = segmentedNeedsChipRow(options.map((o) => o.label));
  const scrollRef = useRef<ScrollView>(null);
  const optionLayouts = useRef(new Map<string, { x: number; width: number }>());
  const contentWidth = useRef(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const centerSelection = useCallback(() => {
    const selected = optionLayouts.current.get(value);
    if (!scrolling || viewportWidth === 0 || !selected) return;
    const desired = selected.x + selected.width / 2 - viewportWidth / 2;
    const maximum = Math.max(0, contentWidth.current - viewportWidth);
    scrollRef.current?.scrollTo({
      x: Math.min(maximum, Math.max(0, desired)),
      animated: false,
    });
  }, [scrolling, value, viewportWidth]);
  useEffect(centerSelection, [centerSelection]);
  const choices = options.map((o, index) => {
    const active = o.value === value;
    return (
      <TouchableOpacity
        key={o.value}
        onLayout={
          scrolling
            ? (event) => {
                const { x, width } = event.nativeEvent.layout;
                optionLayouts.current.set(o.value, { x, width });
                centerSelection();
              }
            : undefined
        }
        testID={testID ? `${testID}-${o.value}` : undefined}
        accessibilityRole="radio"
        accessibilityState={{ checked: active, disabled }}
        disabled={disabled}
        onPress={() => onChange(o.value)}
        style={[
          scrolling ? styles.chipTarget : styles.option,
          !scrolling && index > 0 && styles.divided,
          !scrolling && {
            backgroundColor: active ? c.accentContainer : undefined,
            borderColor: c.outline,
          },
        ]}
      >
        <View
          style={[
            styles.content,
            scrolling && [
              styles.chip,
              {
                borderColor: c.outline,
                backgroundColor: active ? c.accentContainer : 'transparent',
              },
            ],
          ]}
        >
          {active && (
            <MaterialIcons name="check" size={16} color={c.onAccentContainer} />
          )}
          <Text
            numberOfLines={1}
            style={[
              sampleTypography.label,
              styles.label,
              { color: active ? c.onAccentContainer : c.text },
            ]}
          >
            {o.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  });
  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      style={[style, disabled && styles.disabled]}
    >
      {scrolling ? (
        <ScrollView
          ref={scrollRef}
          onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
          onContentSizeChange={(width) => {
            contentWidth.current = width;
            centerSelection();
          }}
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.ribbon}
        >
          {choices}
        </ScrollView>
      ) : (
        <View style={[styles.wrapper, { borderColor: c.outline }]}>
          {choices}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  divided: { borderLeftWidth: 1 },
  label: { flexShrink: 1 },
  wrapper: {
    flexDirection: 'row',
    borderRadius: sampleRadius.pill,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 48,
  },
  option: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ribbon: { gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  chipTarget: { minHeight: 48, justifyContent: 'center' },
  chip: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: sampleRadius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  disabled: { opacity: 0.45 },
});
