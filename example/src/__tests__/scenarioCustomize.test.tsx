// The workspace has separate root/example RN copies. Use host nodes so the test
// exercises the editor state without loading a second native bridge into Jest.
jest.mock('react-native', () => ({
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: (styles: unknown) => styles },
}));

import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';

import { ScenarioCustomize } from '../components/ScenarioCustomize';
import { PresetButton } from '../components/PresetButton';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it.each([false, true])(
  'restores the entry preset and submits clicked values (dark=%s)',
  async (isDark) => {
    const onRun = jest.fn(async (values: string[]) => values.join(','));
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <ScenarioCustomize
          id="locale"
          resultTestID="locale-result"
          isDark={isDark}
          fields={[{ label: 'Locale', help: '' }]}
          presets={[
            { label: 'French', testID: 'qa-preset-locale-1', values: ['fr'] },
            { label: 'English', testID: 'qa-preset-locale-2', values: ['en'] },
            { label: 'System', testID: 'qa-preset-locale-3', values: [''] },
          ]}
          onRun={onRun}
        />
      );
    });
    const press = (label: string) => {
      const button = tree.root
        .findAllByType(TouchableOpacity)
        .find((node) =>
          node.findAllByType(Text).some((text) => text.props.children === label)
        );
      if (!button) throw new Error(`Missing button: ${label}`);
      act(() => {
        button.props.onPress();
      });
    };
    expect(JSON.stringify(tree.toJSON())).toContain('Not run yet');
    press('Customize ›');
    act(() => tree.root.findByType(TextInput).props.onChangeText('en'));
    act(() => tree.root.findByType(TextInput).props.onChangeText('de'));
    expect(onRun).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain('Custom');
    press('Reset to preset');
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).toContain('fr');
    press('Customize ›');
    act(() => tree.root.findByType(TextInput).props.onChangeText('de'));
    act(() => tree.root.findAllByType(PresetButton)[1]!.props.onPress());
    expect(onRun).toHaveBeenLastCalledWith(['en']);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });
    expect(JSON.stringify(tree.toJSON())).not.toContain('Values changed');
    press('Customize ›');
    act(() => tree.root.findByType(TextInput).props.onChangeText('ja'));
    expect(JSON.stringify(tree.toJSON())).toContain('Values changed');
    press('Run again');
    expect(onRun).toHaveBeenLastCalledWith(['ja']);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });
    act(() => tree.unmount());
  }
);
