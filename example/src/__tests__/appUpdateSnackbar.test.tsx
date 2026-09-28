// Same approach as scenarioCustomize.test.tsx: host nodes instead of the real RN, so the
// component's state and timer run without loading a second native bridge into Jest.
jest.mock('react-native', () => ({
  Pressable: 'Pressable',
  Text: 'Text',
  View: 'View',
  StyleSheet: { create: (styles: unknown) => styles },
}));
jest.mock('@react-native-vector-icons/material-icons/static', () => ({
  MaterialIcons: 'MaterialIcons',
}));

const mockAnnouncementListeners: Array<(versionCode: number | null) => void> =
  [];
const mockStartAppUpdateFlow = jest.fn();
let mockUpdateSupported = true;

// Real constants and copy, so the 8 s duration itself is pinned; only the native
// capability probe is replaced.
jest.mock('../update/appUpdate', () => ({
  ...jest.requireActual('../update/appUpdate'),
  isAppUpdateSupported: () => mockUpdateSupported,
}));
jest.mock('../update/appUpdateStore', () => ({
  startAppUpdateFlow: () => mockStartAppUpdateFlow(),
  subscribeToAppUpdateAnnouncements: (
    listener: (versionCode: number | null) => void
  ) => {
    mockAnnouncementListeners.push(listener);
    return () => {
      const index = mockAnnouncementListeners.indexOf(listener);
      if (index >= 0) mockAnnouncementListeners.splice(index, 1);
    };
  },
}));

import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';

import { AppUpdateSnackbar } from '../components/AppUpdateSnackbar';

const DURATION_MS = 8000;

function announce(versionCode: number) {
  act(() => {
    mockAnnouncementListeners.forEach((listener) => listener(versionCode));
  });
}

function snackbar(tree: ReactTestRenderer) {
  return tree.root.findAll(
    (node) => node.props.testID === 'sample-update-snackbar'
  )[0];
}

function press(tree: ReactTestRenderer, testID: string) {
  const target = tree.root.find((node) => node.props.testID === testID);
  act(() => target.props.onPress());
}

function render(isDark = false): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<AppUpdateSnackbar isDark={isDark} bottomOffset={80} />);
  });
  return tree;
}

beforeEach(() => {
  jest.useFakeTimers();
  mockAnnouncementListeners.length = 0;
  mockStartAppUpdateFlow.mockReset();
  mockUpdateSupported = true;
});
afterEach(() => jest.useRealTimers());

// Colours are owned by branding.test.ts; both themes are rendered to prove the timer
// logic does not depend on the palette.
it.each([false, true])(
  'shows an announced build and hides it after 8 s (dark=%s)',
  (isDark) => {
    const tree = render(isDark);
    expect(snackbar(tree)).toBeUndefined();

    announce(42);
    expect(snackbar(tree)).toBeDefined();

    act(() => jest.advanceTimersByTime(DURATION_MS - 1));
    expect(snackbar(tree)).toBeDefined();
    act(() => jest.advanceTimersByTime(1));
    expect(snackbar(tree)).toBeUndefined();
  }
);

it('hides on the dismiss button without starting the update', () => {
  const tree = render();
  announce(42);

  press(tree, 'sample-update-snackbar-dismiss');

  expect(snackbar(tree)).toBeUndefined();
  expect(mockStartAppUpdateFlow).not.toHaveBeenCalled();
});

it('starts the in-app update flow and hides on Update', () => {
  const tree = render();
  announce(42);

  press(tree, 'sample-update-snackbar-action');

  expect(mockStartAppUpdateFlow).toHaveBeenCalledTimes(1);
  expect(snackbar(tree)).toBeUndefined();
});

it('restarts the timer when a different build is announced while showing', () => {
  const tree = render();
  announce(42);
  act(() => jest.advanceTimersByTime(DURATION_MS - 1000));

  announce(43);
  act(() => jest.advanceTimersByTime(DURATION_MS - 1));
  expect(snackbar(tree)).toBeDefined();
  act(() => jest.advanceTimersByTime(1));
  expect(snackbar(tree)).toBeUndefined();
});

it('renders nothing and does not subscribe where in-app updates are absent', () => {
  mockUpdateSupported = false;
  const tree = render();

  expect(mockAnnouncementListeners).toHaveLength(0);
  expect(tree.toJSON()).toBeNull();
});
