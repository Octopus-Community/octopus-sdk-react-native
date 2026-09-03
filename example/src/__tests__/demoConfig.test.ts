import type { DemoConfig, InjectedApiKey } from '../config/demoConfig';
import {
  applySwitchedCommunity,
  DEMO_HOST,
  PRODUCTION_HOST,
  parseApiHost,
  parseInternalMarker,
  parseNamedApiKeys,
  resolveApiServer,
  resolveSwitchTarget,
  shouldShowServerWarning,
} from '../config/demoConfig';

// Both parsers read values assembled by a shell (a CI secret, a private
// launcher), so they are the sample's only defence against a malformed build
// value: `apiServer.host` is rejected natively when it carries a scheme, a port
// or a path, and a throw inside the Config screen's render would take the app
// down instead of just the option.

describe('parseApiHost', () => {
  it('treats an unset or blank value as no override', () => {
    expect(parseApiHost(undefined)).toBeUndefined();
    expect(parseApiHost('')).toBeUndefined();
    expect(parseApiHost('   ')).toBeUndefined();
  });

  it('passes a bare host through', () => {
    expect(parseApiHost('api-demo2.8pus.io')).toEqual({
      host: 'api-demo2.8pus.io',
    });
  });

  it('strips a scheme, a trailing path and surrounding whitespace', () => {
    expect(parseApiHost('  https://api-demo2.8pus.io/  ')).toEqual({
      host: 'api-demo2.8pus.io',
    });
    expect(parseApiHost('grpcs://api-demo2.8pus.io/v1/feed')).toEqual({
      host: 'api-demo2.8pus.io',
    });
  });

  it('splits an explicit port off into the port field', () => {
    expect(parseApiHost('https://api-demo2.8pus.io:8443/')).toEqual({
      host: 'api-demo2.8pus.io',
      port: 8443,
    });
  });

  it('keeps a bracketed IPv6 literal intact, with or without a port', () => {
    expect(parseApiHost('[::1]')).toEqual({ host: '[::1]' });
    expect(parseApiHost('https://[::1]:8443')).toEqual({
      host: '[::1]',
      port: 8443,
    });
  });

  it('leaves a non-numeric trailing segment on the host', () => {
    // Not a port: splitting here would hand the SDK a truncated host.
    expect(parseApiHost('api-demo2.8pus.io:notaport')).toEqual({
      host: 'api-demo2.8pus.io:notaport',
    });
  });

  it('yields no override when nothing but a scheme was set', () => {
    expect(parseApiHost('https://')).toBeUndefined();
  });
});

describe('resolveApiServer', () => {
  // The rule this guards is a safety default, not a convenience: an
  // unconfigured checkout — a fresh clone of the public mirror included — must
  // not reach real client communities. Production is opt-in, by name.
  it('falls back to the demo backend when no host was declared', () => {
    expect(resolveApiServer(undefined)).toEqual({ host: DEMO_HOST });
    expect(resolveApiServer('')).toEqual({ host: DEMO_HOST });
    expect(resolveApiServer('   ')).toEqual({ host: DEMO_HOST });
    // A value that normalizes to nothing usable is an unset value, not a reason
    // to hand the SDK a broken host — and not a reason to reach production.
    expect(resolveApiServer('https://')).toEqual({ host: DEMO_HOST });
  });

  it('targets production only when the build names it', () => {
    expect(resolveApiServer(PRODUCTION_HOST)).toEqual({
      host: PRODUCTION_HOST,
    });
    expect(resolveApiServer('https://api.8pus.io/')).toEqual({
      host: PRODUCTION_HOST,
    });
  });

  it('honours any other declared host, port included', () => {
    expect(resolveApiServer('https://api-staging.8pus.io:8443')).toEqual({
      host: 'api-staging.8pus.io',
      port: 8443,
    });
  });
});

describe('parseNamedApiKeys', () => {
  it('returns no slot for an unset or blank value', () => {
    expect(parseNamedApiKeys(undefined)).toEqual([]);
    expect(parseNamedApiKeys('  ')).toEqual([]);
  });

  it('parses id~label~key entries in order', () => {
    expect(parseNamedApiKeys('a~Label A~keyA;b~Label B~keyB')).toEqual([
      { id: 'a', label: 'Label A', key: 'keyA' },
      { id: 'b', label: 'Label B', key: 'keyB' },
    ]);
  });

  it('tolerates whitespace and trailing or empty entries', () => {
    expect(parseNamedApiKeys(' a ~ Label A ~ keyA ;;')).toEqual([
      { id: 'a', label: 'Label A', key: 'keyA' },
    ]);
  });

  it('falls back to the id when the label is empty', () => {
    expect(parseNamedApiKeys('a~~keyA')).toEqual([
      { id: 'a', label: 'a', key: 'keyA' },
    ]);
  });

  it('drops malformed entries rather than throwing', () => {
    expect(
      parseNamedApiKeys('a~Label A;b~Label B~keyB~extra;~L~k;c~L~')
    ).toEqual([]);
  });
});

describe('parseInternalMarker', () => {
  it('marks a build internal only for a literal true', () => {
    expect(parseInternalMarker('true')).toBe(true);
    expect(parseInternalMarker(' TRUE ')).toBe(true);
  });

  it('treats a declared-but-empty entry as not internal', () => {
    // What `.env.dist` ships, and what a `.env` copied from it carries.
    expect(parseInternalMarker('')).toBe(false);
  });

  it('treats an absent variable as not internal', () => {
    // Not inlined at all → `undefined` at runtime. Fail-closed.
    expect(parseInternalMarker(undefined)).toBe(false);
  });

  it('does not accept anything else as true', () => {
    expect(parseInternalMarker('1')).toBe(false);
    expect(parseInternalMarker('yes')).toBe(false);
    expect(parseInternalMarker('false')).toBe(false);
  });
});

describe('shouldShowServerWarning', () => {
  it('warns an internal build pointed at production', () => {
    expect(shouldShowServerWarning(true, true)).toBe(true);
  });

  it('stays silent on a host build pointed at production', () => {
    // The nominal integration case: their own key, the production backend.
    // Showing an Octopus host there is what this gate exists to prevent.
    expect(shouldShowServerWarning(false, true)).toBe(false);
  });

  it('stays silent on an internal build pointed at the demo backend', () => {
    expect(shouldShowServerWarning(true, false)).toBe(false);
  });

  it('stays silent when neither half holds', () => {
    expect(shouldShowServerWarning(false, false)).toBe(false);
  });
});

describe('applySwitchedCommunity', () => {
  // The config every case starts from: a session started on a named slot, with a pasted key
  // still hanging off the object the way `DemoConfig` allows.
  const config: DemoConfig = {
    apiKeySource: 'demo',
    customApiKey: 'pasted-key',
    selectedKeyId: 'slotA',
    userId: 'sample-user',
    authMode: 'sso',
    theme: 'system',
    serverEnv: 'custom',
  };

  it('names the slot a switch onto a named key landed on', () => {
    expect(
      applySwitchedCommunity(config, {
        id: 'slotB',
        label: 'Label B',
        key: 'keyB',
      })
    ).toEqual({ ...config, selectedKeyId: 'slotB', customApiKey: '' });
  });

  it('drops the pasted key when the switch names a slot', () => {
    // Kept, it would sit in a config that resolves through the slot instead — a value
    // nothing reads, and a key on disk's worth of risk for nothing.
    const switched = applySwitchedCommunity(config, {
      id: 'slotB',
      label: 'Label B',
      key: 'keyB',
    });
    expect(switched.customApiKey).toBe('');
  });

  it('records a pasted target as a custom source, key included', () => {
    expect(
      applySwitchedCommunity(config, {
        id: null,
        label: 'Custom community',
        key: 'keyC',
      })
    ).toEqual({
      ...config,
      apiKeySource: 'custom',
      customApiKey: 'keyC',
      selectedKeyId: null,
    });
  });

  it('leaves everything the switch does not decide alone', () => {
    // The user id, the auth mode, the appearance and the build's server env are the Config
    // screen's answers — a community switch is not a way to change any of them.
    const switched = applySwitchedCommunity(config, {
      id: null,
      label: 'Custom community',
      key: 'keyC',
    });
    expect(switched.userId).toBe(config.userId);
    expect(switched.authMode).toBe(config.authMode);
    expect(switched.theme).toBe(config.theme);
    expect(switched.serverEnv).toBe(config.serverEnv);
  });

  it('does not mutate the config it was given', () => {
    const before = { ...config };
    applySwitchedCommunity(config, { id: 'slotB', label: 'B', key: 'keyB' });
    expect(config).toEqual(before);
  });
});

describe('resolveSwitchTarget', () => {
  const slotA: InjectedApiKey = { id: 'slotA', label: 'Label A', key: 'keyA' };
  const slotB: InjectedApiKey = { id: 'slotB', label: 'Label B', key: 'keyB' };

  // One build shape per case below: a single injected slot not yet active, that same single
  // slot already active, a build with no injected slots at all running on a pasted key, and
  // multiple slots with the active one filtered out of the pick.

  describe('a single injected slot, not the active one', () => {
    it('is switchable and picks that slot on the initial (seed) call', () => {
      const result = resolveSwitchTarget([slotA], 'other', undefined, '');
      expect(result.hasSwitchableSlot).toBe(true);
      expect(result.resolvedSelectedId).toBe('slotA');
      expect(result.switchTarget).toEqual({
        id: 'slotA',
        label: 'Label A',
        key: 'keyA',
      });
    });

    it('moves the selection off the slot once it becomes active', () => {
      // Simulates the useEffect correction firing right after a switch landed on slotA —
      // with only slotA injected there is nowhere else to go, so it keeps the selection and
      // the resulting target collapses to null (nothing left to switch to).
      const result = resolveSwitchTarget([slotA], 'slotA', 'slotA', '');
      expect(result.hasSwitchableSlot).toBe(false);
      expect(result.resolvedSelectedId).toBe('slotA');
      expect(result.switchTarget).toBeNull();
    });
  });

  describe('a single injected slot already active', () => {
    it('is not switchable and falls through to the free-text field', () => {
      const result = resolveSwitchTarget([slotA], 'slotA', undefined, '');
      expect(result.hasSwitchableSlot).toBe(false);
      // Nothing else to seed the picker with — the only slot is the active one.
      expect(result.resolvedSelectedId).toBe('slotA');
      expect(result.switchTarget).toBeNull();
    });

    it('resolves a pasted key as the target once one is typed', () => {
      const result = resolveSwitchTarget(
        [slotA],
        'slotA',
        undefined,
        '  pasted-key  '
      );
      expect(result.switchTarget).toEqual({
        id: null,
        label: 'Custom community',
        key: 'pasted-key',
      });
    });
  });

  describe('a custom (pasted) key already active', () => {
    it('is not switchable when no named slot exists', () => {
      const result = resolveSwitchTarget([], null, undefined, '', 'active-key');
      expect(result.hasSwitchableSlot).toBe(false);
      expect(result.switchTarget).toBeNull();
    });

    it('refuses a switch onto the key already in force', () => {
      const result = resolveSwitchTarget(
        [],
        null,
        undefined,
        'active-key',
        'active-key'
      );
      expect(result.switchTarget).toBeNull();
    });

    it('refuses it however either side is padded', () => {
      // Both keys reached this function through the same text field, so a stray space on
      // one side must not turn "the key already in force" into a switch to itself.
      const result = resolveSwitchTarget(
        [],
        null,
        undefined,
        '  active-key  ',
        ' active-key '
      );
      expect(result.switchTarget).toBeNull();
    });

    it('allows a switch onto a different pasted key', () => {
      const result = resolveSwitchTarget(
        [],
        null,
        undefined,
        'a-different-key',
        'active-key'
      );
      expect(result.switchTarget).toEqual({
        id: null,
        label: 'Custom community',
        key: 'a-different-key',
      });
    });
  });

  describe('a build with no injected slots at all', () => {
    it('is not switchable and requires a pasted key, with no active custom key to guard against', () => {
      const emptyResult = resolveSwitchTarget([], null, undefined, '');
      expect(emptyResult.hasSwitchableSlot).toBe(false);
      expect(emptyResult.resolvedSelectedId).toBe('');
      expect(emptyResult.switchTarget).toBeNull();

      const pastedResult = resolveSwitchTarget([], null, undefined, 'any-key');
      expect(pastedResult.switchTarget).toEqual({
        id: null,
        label: 'Custom community',
        key: 'any-key',
      });
    });
  });

  describe('multiple slots, one of them active', () => {
    it('picks the other slot on the initial call and excludes the active one from the target', () => {
      const seeded = resolveSwitchTarget(
        [slotA, slotB],
        'slotA',
        undefined,
        ''
      );
      expect(seeded.hasSwitchableSlot).toBe(true);
      expect(seeded.resolvedSelectedId).toBe('slotB');
      expect(seeded.switchTarget).toEqual({
        id: 'slotB',
        label: 'Label B',
        key: 'keyB',
      });
    });

    it('moves a stale selection off the slot that just became active', () => {
      const result = resolveSwitchTarget([slotA, slotB], 'slotB', 'slotB', '');
      expect(result.resolvedSelectedId).toBe('slotA');
      expect(result.switchTarget).toEqual({
        id: 'slotA',
        label: 'Label A',
        key: 'keyA',
      });
    });

    it('leaves a selection alone when it is not the active slot', () => {
      const result = resolveSwitchTarget([slotA, slotB], 'slotA', 'slotB', '');
      expect(result.resolvedSelectedId).toBe('slotB');
    });
  });
});
