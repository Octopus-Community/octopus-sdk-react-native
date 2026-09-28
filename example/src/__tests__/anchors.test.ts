import * as React from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { act, create } from 'react-test-renderer';

import { buildDebugInfoCards } from '../debug/debugInfo';
import type { DebugInfoInput } from '../debug/debugInfo';
import {
  anchorScrollOffset,
  nextNavRequest,
  withSectionOpen,
} from '../navigation/anchors';
import type { ConfigSection, NavRequest } from '../navigation/anchors';
import { useAnchorScroll } from '../navigation/useAnchorScroll';

// A link that names one setting has to land on it: these pin the request stamp (asking
// twice is two requests), the section-open merge (a link opens, never closes) and the
// once-per-request scroll, which must wait for both the request and the section position.

describe('nextNavRequest', () => {
  it('stamps a first request with nonce 1', () => {
    expect(nextNavRequest(null, 'account')).toEqual({
      target: 'account',
      nonce: 1,
    });
  });

  it('makes a repeat of the same target a new request', () => {
    const first = nextNavRequest(null, 'account');
    const second = nextNavRequest(first, 'account');
    expect(second.target).toBe('account');
    expect(second.nonce).not.toBe(first.nonce);
  });
});

describe('withSectionOpen', () => {
  it('opens the named section and keeps the others as they were', () => {
    expect(
      withSectionOpen({ sso: false, community: true, host: false }, 'host')
    ).toEqual({ sso: false, community: true, host: true });
  });

  it('does not mutate its input', () => {
    const open = { sso: false };
    withSectionOpen(open, 'sso');
    expect(open).toEqual({ sso: false });
  });
});

describe('anchorScrollOffset', () => {
  it('leaves a margin above the section', () => {
    expect(anchorScrollOffset(200)).toBe(192);
  });

  it('never asks for a negative offset', () => {
    expect(anchorScrollOffset(3)).toBe(0);
  });
});

/** Mounts the hook with a stub scroll view and exposes its layout handler. */
function renderAnchorScroll(request: NavRequest<ConfigSection> | null) {
  const scrollTo = jest.fn();
  let onLayout!: ReturnType<
    typeof useAnchorScroll<ConfigSection>
  >['onSectionLayout'];

  function Harness({ req }: { req: NavRequest<ConfigSection> | null }) {
    const { scrollRef, onSectionLayout } = useAnchorScroll(req);
    // The hook only ever calls `scrollTo` on its ref; a stub is the whole scroll view here.
    (scrollRef as { current: unknown }).current = { scrollTo };
    onLayout = onSectionLayout;
    return null;
  }

  let root!: ReturnType<typeof create>;
  act(() => {
    root = create(React.createElement(Harness, { req: request }));
  });
  const layout = (key: ConfigSection, y: number) =>
    act(() => {
      onLayout(key)({ nativeEvent: { layout: { y } } } as LayoutChangeEvent);
    });
  const update = (req: NavRequest<ConfigSection> | null) =>
    act(() => {
      root.update(React.createElement(Harness, { req }));
    });
  return { scrollTo, layout, update };
}

describe('useAnchorScroll', () => {
  it('scrolls to the requested section once its position is known', () => {
    const { scrollTo, layout } = renderAnchorScroll({
      target: 'auth',
      nonce: 1,
    });
    layout('community', 0);
    expect(scrollTo).not.toHaveBeenCalled();
    layout('auth', 400);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ y: 392, animated: true });
  });

  it('does not scroll again when the section re-lays out', () => {
    const { scrollTo, layout } = renderAnchorScroll({
      target: 'auth',
      nonce: 1,
    });
    layout('auth', 400);
    layout('auth', 460);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('serves a new request for a section already laid out', () => {
    const { scrollTo, layout, update } = renderAnchorScroll(null);
    layout('theme', 900);
    expect(scrollTo).not.toHaveBeenCalled();
    update({ target: 'theme', nonce: 1 });
    expect(scrollTo).toHaveBeenCalledWith({ y: 892, animated: true });
    update({ target: 'theme', nonce: 2 });
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });
});

describe('buildDebugInfoCards', () => {
  const base: DebugInfoInput = {
    sampleVersionLabel: '1.13.2 (42)',
    sdkVersion: '1.13.2',
    build: null,
    serverLabel: 'Demo',
    host: 'api-demo2.8pus.io',
    community: 'Demo community',
    apiKeySource: 'Demo (.env)',
    authMode: 'sso',
    userId: 'qa-user',
    displayMode: 'embed',
    urlOpeningMode: 'defaultBrowser',
    profileTapMode: 'sdkScreens',
  };
  const value = (
    cards: ReturnType<typeof buildDebugInfoCards>,
    label: string
  ) => cards.flatMap((c) => c.rows).find((r) => r.label === label)?.value;

  it('describes the build and the configuration in force', () => {
    const cards = buildDebugInfoCards(base);
    expect(cards.map((c) => c.title)).toEqual(['Build', 'Configuration']);
    expect(value(cards, 'Build')).toBe('—');
    expect(value(cards, 'Server')).toBe('Demo — api-demo2.8pus.io');
    expect(value(cards, 'SSO user id')).toBe('qa-user');
    expect(value(cards, 'Display mode')).toBe('Embedded');
  });

  it('shows no SSO user in octopus mode, where there is no host user', () => {
    const cards = buildDebugInfoCards({ ...base, authMode: 'octopus' });
    expect(value(cards, 'Authentication')).toBe('Octopus');
    expect(value(cards, 'SSO user id')).toBe('—');
  });

  it('carries the key provenance only, never a key', () => {
    const rows = buildDebugInfoCards(base).flatMap((c) => c.rows);
    expect(rows.map((r) => r.label)).not.toContain('API key');
    expect(value(buildDebugInfoCards(base), 'API key source')).toBe(
      'Demo (.env)'
    );
  });
});
