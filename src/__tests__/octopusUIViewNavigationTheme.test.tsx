import type { ReactElement } from 'react';
import { OctopusUIView, type OctopusUIViewProps } from '../OctopusUIView';

/**
 * The props `OctopusUIView` hands the native component.
 *
 * `OctopusUIView` is a plain function component, so calling it returns the
 * element it would render — enough to assert the marshalled native props
 * without a renderer (the repo ships none). Same technique as
 * `octopusUIViewInitialScreen.test.tsx`.
 */
function nativeProps(props: OctopusUIViewProps): Record<string, unknown> {
  const element = OctopusUIView(props) as ReactElement<Record<string, unknown>>;
  return element.props;
}

describe('OctopusUIView navigation & theme prop marshalling', () => {
  it('leaves every new prop undefined when omitted, so native defaults apply', () => {
    const props = nativeProps({});
    expect(props.showBackButton).toBeUndefined();
    expect(props.showNavBar).toBeUndefined();
    expect(props.navBarTitle).toBeUndefined();
    expect(props.navBarPrimaryColor).toBeUndefined();
    expect(props.titleCentered).toBeUndefined();
    expect(props.navBarLeadingAction).toBeUndefined();
  });

  it("defaults navigationMode to 'navigationStack' when omitted, unlike the other props", () => {
    // RN's own policy default (issue #36's reparenting concern), always
    // emitted on the wire rather than left for the native side to pick its
    // own default — see the TSDoc on `OctopusNavigationMode`.
    expect(nativeProps({}).navigationMode).toBe('navigationStack');
  });

  it('forwards showBackButton and showNavBar verbatim', () => {
    const props = nativeProps({ showBackButton: true, showNavBar: false });
    expect(props.showBackButton).toBe(true);
    expect(props.showNavBar).toBe(false);
  });

  it('forwards the per-view top app bar overrides verbatim', () => {
    const props = nativeProps({
      navBarTitle: 'My group',
      navBarPrimaryColor: true,
      titleCentered: true,
    });
    expect(props.navBarTitle).toBe('My group');
    expect(props.navBarPrimaryColor).toBe(true);
    expect(props.titleCentered).toBe(true);
  });

  it('forwards navigationMode verbatim', () => {
    expect(nativeProps({ navigationMode: 'automatic' }).navigationMode).toBe(
      'automatic'
    );
  });

  it('forwards navBarLeadingAction verbatim', () => {
    expect(
      nativeProps({ navBarLeadingAction: 'close' }).navBarLeadingAction
    ).toBe('close');
  });
});
