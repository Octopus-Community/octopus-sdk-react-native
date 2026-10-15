import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { OctopusUIView, type OctopusUIViewProps } from '../OctopusUIView';

function nativeProps(props: OctopusUIViewProps): Record<string, unknown> {
  return (OctopusUIView(props) as ReactElement<Record<string, unknown>>).props;
}

afterEach(() => jest.restoreAllMocks());

it('defaults Android visibility to true and forwards explicit updates', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  expect(nativeProps({}).isVisible).toBe(true);
  expect(nativeProps({ isVisible: false }).isVisible).toBe(false);
  expect(nativeProps({ isVisible: true }).isVisible).toBe(true);
});

it('accepts visibility on iOS without sending an Android-only native prop', () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  expect(nativeProps({})).not.toHaveProperty('isVisible');
  expect(nativeProps({ isVisible: false })).not.toHaveProperty('isVisible');
});
