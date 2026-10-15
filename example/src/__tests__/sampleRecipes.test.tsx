jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
  TextInput: 'TextInput',
  StyleSheet: { create: (styles: unknown) => styles },
  Platform: { select: (values: { default: string }) => values.default },
}));
jest.mock('@react-native-vector-icons/material-icons/static', () => ({
  MaterialIcons: 'MaterialIcons',
}));

import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import type { ReactElement } from 'react';
import {
  Pressable,
  TouchableOpacity,
  ScrollView,
  Text,
  ActivityIndicator,
  View,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { PillButton } from '../components/PillButton';
import { PresetButton } from '../components/PresetButton';
import {
  SegmentControl,
  segmentedNeedsChipRow,
} from '../components/SegmentControl';
import { SettingsRadio } from '../components/SettingsRadio';
import {
  ScenarioBlock,
  GroupHeader,
  SummaryRow,
  Banner,
  LiveConfigPanel,
  ProfileHeader,
} from '../components/SampleRecipes';
import { ScenarioResultPanel } from '../components/ScenarioResultPanel';
import { EnumParamField } from '../components/ScenarioParamField';
import { chromeColors } from '../theme/branding';

let tree: ReactTestRenderer;
function render(element: ReactElement) {
  act(() => {
    tree = create(element);
  });
  return tree;
}
afterEach(() => {
  act(() => tree?.unmount());
});
function flat(style: unknown): Record<string, unknown> {
  return Array.isArray(style)
    ? Object.assign({}, ...style.map(flat))
    : style && typeof style === 'object'
      ? (style as Record<string, unknown>)
      : {};
}
const texts = () =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .join('\n');

it.each([undefined, 3])('announces group headings with count %s', (count) => {
  render(<GroupHeader title="Community" count={count} isDark={false} />);
  const heading = tree.root.findByProps({ accessibilityRole: 'header' });
  expect(heading.type).toBe(View);
  expect(heading.props.accessible).toBe(true);
  expect(heading.props.accessibilityLabel).toBe(
    count === undefined ? 'Community' : `Community, ${count}`
  );
  expect(texts()).toContain('Community');
  if (count !== undefined) expect(texts()).toContain(String(count));
});

it.each([false, true])(
  'keeps a loading capsule label and disables it without losing its fill (dark=%s)',
  (isDark) => {
    render(
      <PillButton
        label="Save profile"
        testID="save"
        onPress={jest.fn()}
        isDark={isDark}
        loading
        fullWidth
        minHeight={52}
      />
    );
    const button = tree.root.findByType(Pressable);
    expect(button.props.disabled).toBe(true);
    expect(button.props.accessibilityState.disabled).toBe(true);
    expect(texts()).toContain('Save profile');
    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(1);
    const style = flat(button.props.style({ pressed: false }));
    expect(style).toMatchObject({
      backgroundColor: chromeColors(isDark).accent,
      borderRadius: 999,
      minHeight: 52,
      alignSelf: 'stretch',
      opacity: 0.45,
    });
    expect(style.borderStyle).toBeUndefined();
  }
);
it.each([false, true])(
  'preserves preset ids and actions through the shared secondary capsule (dark=%s)',
  (isDark) => {
    const onPress = jest.fn();
    render(
      <PresetButton
        testID="qa-preset-locale-1"
        label="Demo preset"
        onPress={onPress}
        isDark={isDark}
      />
    );
    const button = tree.root.findByType(Pressable);
    expect(button.props.testID).toBe('qa-preset-locale-1');
    expect(flat(button.props.style({ pressed: false }))).toMatchObject({
      backgroundColor: 'transparent',
      paddingLeft: 24,
      paddingRight: 24,
      alignSelf: 'stretch',
    });
    expect(flat(tree.root.findByType(Text).props.style).color).toBe(
      chromeColors(isDark).text
    );
    act(() => button.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  }
);
it.each([
  [['One', 'Two', 'Three'], false],
  [['123456789012', 'Two'], false],
  [['1234567890123', 'Two'], true],
  [['12345678', 'Two', 'Three', 'Four'], false],
  [['123456789', 'Two', 'Three', 'Four'], true],
  [['A', 'B', 'C', 'D', 'E'], true],
])('matches the Android scrolling threshold for %j', (labels, expected) => {
  expect(segmentedNeedsChipRow(labels as string[])).toBe(expected);
});
it.each([false, true])(
  'keeps segment radio semantics and selected container/ink (dark=%s)',
  (isDark) => {
    const onChange = jest.fn();
    const c = chromeColors(isDark);
    render(
      <SegmentControl
        testID="appearance"
        options={[
          { value: 'system', label: 'System' },
          { value: 'dark', label: 'Dark' },
        ]}
        value="system"
        onChange={onChange}
        isDark={isDark}
      />
    );
    expect(tree.root.findAllByType(ScrollView)).toHaveLength(0);
    const options = tree.root.findAllByType(TouchableOpacity);
    expect(options[0]!.props.accessibilityState.checked).toBe(true);
    expect(flat(options[0]!.props.style).backgroundColor).toBe(
      c.accentContainer
    );
    expect(tree.root.findByType(MaterialIcons).props).toMatchObject({
      name: 'check',
      size: 16,
      color: c.onAccentContainer,
    });
    act(() => options[1]!.props.onPress());
    expect(onChange).toHaveBeenCalledWith('dark');
    expect(options[1]!.props.testID).toBe('appearance-dark');
  }
);
it('scrolls long choices horizontally, keeps targets at 48 and disables every option', () => {
  render(
    <SegmentControl
      options={[
        { value: 'a', label: 'A long theme preset' },
        { value: 'b', label: 'Default' },
      ]}
      value="a"
      onChange={jest.fn()}
      isDark
      disabled
    />
  );
  expect(tree.root.findByType(ScrollView).props.horizontal).toBe(true);
  for (const option of tree.root.findAllByType(TouchableOpacity)) {
    expect(flat(option.props.style).minHeight).toBe(48);
    expect(option.props.disabled).toBe(true);
  }
});
it.each([false, true])(
  'distinguishes off radios and supports compact config rows (dark=%s)',
  (isDark) => {
    const element = (rowMin?: number) => (
      <SettingsRadio
        testID="language"
        options={[
          { value: 'en', label: 'English' },
          { value: 'fr', label: 'French' },
        ]}
        value="en"
        onChange={jest.fn()}
        isDark={isDark}
        rowMin={rowMin}
      />
    );
    render(element());
    expect(
      flat(tree.root.findAllByType(TouchableOpacity)[0]!.props.style).minHeight
    ).toBe(56);
    expect(
      tree.root.findAllByType(MaterialIcons).map((node) => node.props.color)
    ).toEqual([chromeColors(isDark).accentText, chromeColors(isDark).outline]);
    act(() => tree.update(element(48)));
    expect(
      flat(tree.root.findAllByType(TouchableOpacity)[0]!.props.style).minHeight
    ).toBe(48);
  }
);
it('keeps API parameter case, type tags and touchable choices', () => {
  render(
    <EnumParamField
      testID="qa-param-test"
      label="themeSet"
      typeName="ThemeSet"
      options={[{ key: 'a', label: 'Default' }]}
      value="a"
      onChange={jest.fn()}
      isDark={false}
    />
  );
  expect(texts()).toContain('themeSet');
  expect(texts()).toContain('ThemeSet');
  expect(
    flat(tree.root.findByType(TouchableOpacity).props.style).minHeight
  ).toBe(48);
});
it.each([false, true])(
  'renders failure output in the same code recipe as success (dark=%s)',
  (isDark) => {
    render(
      <ScenarioResultPanel
        testID="demo-result"
        isDark={isDark}
        state={{ status: 'error', message: 'Request refused', durationMs: 12 }}
      />
    );
    expect(texts()).toContain('✕ Error');
    expect(texts()).toContain('Request refused');
    const message = tree.root
      .findAllByType(Text)
      .find((node) => node.props.children === 'Request refused')!;
    expect(flat(message.props.style)).toMatchObject({
      fontSize: 13,
      lineHeight: 18,
      color: chromeColors(isDark).onCodeSurface,
    });
    expect(flat(message.parent!.props.style)).toMatchObject({
      borderRadius: 8,
      padding: 12,
      backgroundColor: chromeColors(isDark).codeSurface,
    });
    expect(
      tree.root
        .findAllByType(View)
        .some((node) => flat(node.props.style).minHeight === 28)
    ).toBe(true);
  }
);
it('composes scenario, summary, banner and live configuration recipes while retaining actions', () => {
  const change = jest.fn();
  render(
    <View>
      <ScenarioBlock title="Try it" isDark={false}>
        <Text>Presets</Text>
      </ScenarioBlock>
      <SummaryRow
        title="Account"
        subtitle="Connected"
        icon="person-outline"
        testID="account"
        isDark={false}
        onPress={change}
      />
      <Banner
        message="Choose a setup"
        actionLabel="Change"
        onAction={change}
        isDark={false}
        testID="banner"
      />
      <LiveConfigPanel
        title="Live config"
        explanation="Current setup"
        rows={[{ label: 'Mode', value: 'SSO' }]}
        isDark={false}
      />
    </View>
  );
  act(() =>
    tree.root
      .findAllByType(TouchableOpacity)
      .forEach((button) => button.props.onPress())
  );
  expect(change).toHaveBeenCalledTimes(2);
  expect(texts()).toContain('Try it');
  expect(texts()).toContain('Current setup');
  expect(texts()).toContain('SSO');
});

it('reveals a persisted offscreen selection on layout and recenters a changed value', () => {
  const scrollTo = jest.fn();
  const options = ['a', 'b', 'c', 'd', 'e'].map((value) => ({
    value,
    label: `Theme ${value}`,
  }));
  const element = (value: string) => (
    <SegmentControl
      options={options}
      value={value}
      onChange={jest.fn()}
      isDark={false}
    />
  );
  act(() => {
    tree = create(element('e'), {
      createNodeMock: (node) =>
        node.type === 'ScrollView' ? { scrollTo } : null,
    });
  });
  const ribbon = () => tree.root.findByType(ScrollView);
  act(() =>
    ribbon().props.onLayout({ nativeEvent: { layout: { width: 200 } } })
  );
  act(() => ribbon().props.onContentSizeChange(600, 48));
  act(() =>
    tree.root
      .findAllByType(TouchableOpacity)[4]!
      .props.onLayout({ nativeEvent: { layout: { x: 500, width: 100 } } })
  );
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 400, animated: false });
  act(() =>
    tree.root
      .findAllByType(TouchableOpacity)[0]!
      .props.onLayout({ nativeEvent: { layout: { x: 16, width: 100 } } })
  );
  act(() => tree.update(element('a')));
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: false });
});
it.each([false, true])(
  'uses the profile family glyph64 without a state disc (dark=%s)',
  (isDark) => {
    render(<ProfileHeader title="Edit profile" isDark={isDark} />);
    expect(tree.root.findByType(MaterialIcons).props).toMatchObject({
      name: 'person',
      size: 64,
      color: chromeColors(isDark).accent,
    });
    expect(
      tree.root
        .findAllByType(View)
        .some((node) => flat(node.props.style).backgroundColor !== undefined)
    ).toBe(false);
  }
);
