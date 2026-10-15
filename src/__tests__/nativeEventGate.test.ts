import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DeviceEventEmitter, NativeEventEmitter } from 'react-native';
import ts from 'typescript';
import {
  functionBody,
  maskComments,
  maskCommentsAndStrings,
} from './helpers/sourceLexer';

/**
 * Neither native side may gate `sendEvent` on a tally of `addListener` /
 * `removeListeners` calls. `NativeEventEmitter` does not give enough information to keep
 * such a tally honest — proved below — so both sides gate on whether their transport to JS
 * is still usable instead. These tests exist to stop a counter from creeping back in.
 *
 * The source-level assertions run on text with comments and string literals MASKED OUT.
 * That is not incidental: an adversarial pass on the previous version of this guard found
 * that a comment mentioning the expected identifier was enough to satisfy a check while the
 * real gate had been replaced by `if (true)`, and that a lone brace inside a log string was
 * enough to make a correct file fail. Every masking case below is one of those findings
 * turned into a test.
 */

const ROOT = join(__dirname, '..', '..');

const ANDROID_EMITTER =
  'android/src/main/java/com/octopuscommunity/octopusreactnativesdk/OctopusEventEmitter.kt';
const IOS_EMITTER = 'ios/OctopusEventManager.swift';

const readFile = (relativePath: string): string =>
  readFileSync(join(ROOT, relativePath), 'utf8');

const sentNames = (source: string): string[] => {
  const masked = maskCommentsAndStrings(source);
  const withLiterals = maskComments(source);
  const calls = Array.from(masked.matchAll(/\bsendEvent\s*\(/g)).filter(
    (match) => !/\b(?:fun|func)\s+$/.test(masked.slice(0, match.index))
  );
  // Locate calls on fully masked code, then recover their literal arguments at
  // the same offsets. A dynamic name must fail, rather than evade the inventory.
  const names = calls.flatMap((call) => {
    const literal = withLiterals
      .slice(call.index)
      .match(/^sendEvent\s*\(\s*(?:name\s*:\s*)?"(\w+)"\s*,/);
    return literal === null ? [] : [literal[1]!];
  });
  if (names.length !== calls.length) {
    throw new Error('Every sendEvent call must use a literal event name.');
  }
  return [...new Set(names)].sort();
};

/** Direct emitter subscriptions and the four StateChannel registrations. */
const subscribedNames = (source: string, file: string): string[] => {
  const names: string[] = [];
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const visit = (node: ts.Node): void => {
    const isDirectSubscription =
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(tree) === 'eventEmitter' &&
      node.expression.name.text === 'addListener';
    const isStateChannel =
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'StateChannel';
    if (isDirectSubscription || isStateChannel) {
      const event = node.arguments?.[0];
      if (event && ts.isStringLiteral(event)) names.push(event.text);
      // StateChannel forwards the literal supplied by its constructor.
      else if (
        file !== 'internals/stateChannels.ts' ||
        event?.getText(tree) !== 'this.eventName' ||
        !isDirectSubscription
      ) {
        throw new Error(`Unrecognised native event subscription in ${file}.`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return names;
};

const sourceFiles = (directory: string): string[] =>
  readdirSync(join(ROOT, 'src', directory), { withFileTypes: true }).flatMap(
    (entry) => {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) {
        return entry.name === '__tests__' ? [] : sourceFiles(file);
      }
      return /\.tsx?$/.test(entry.name) ? [file] : [];
    }
  );

const PLATFORMS = [
  {
    name: 'Android',
    file: ANDROID_EMITTER,
    sendEvent: /private\s+fun\s+sendEvent\s*\(/,
    // `getJSModule` throws once the instance is torn down — that is the real hazard.
    liveness: /hasActiveReactInstance\s*\(\s*\)/,
    forbidden: undefined,
  },
  {
    name: 'iOS',
    file: IOS_EMITTER,
    sendEvent: /private\s+func\s+sendEvent\s*\(/,
    // The gate is bridge *presence*, deliberately NOT `bridge.isValid`: under the New
    // Architecture (bridgeless) a legacy module gets an RCTBridgeProxy whose `valid`
    // returns NO by design, so an isValid guard drops every event silently — it is what
    // broke navigateToProfile (and every state stream) in 1.13.0.
    liveness: /guard\s+let\s+bridge\s*=\s*bridge\s+else/,
    // The body is comment/string-masked, so any surviving occurrence is real code.
    forbidden: /\bisValid\b/,
  },
] as const;

describe.each(PLATFORMS)(
  '$name event gate',
  ({ file, sendEvent, liveness, forbidden }) => {
    it('keeps no listener tally', () => {
      // Masked, so the explanatory comments in these files (which do mention
      // `RCTDeviceEventEmitter.listenerCount`) cannot trip this.
      expect(maskCommentsAndStrings(readFile(file))).not.toMatch(
        /listenerCount/
      );
    });

    it('gates sendEvent on transport liveness', () => {
      const body = functionBody(
        maskCommentsAndStrings(readFile(file)),
        sendEvent
      );

      expect(body).toMatch(liveness);
      // An unconditional emit would satisfy nothing above but is worth naming explicitly.
      expect(body).toMatch(/\bif\b|\bguard\b/);
      if (forbidden !== undefined) {
        expect(body).not.toMatch(forbidden);
      }
    });
  }
);

describe('the guard resists text that only looks like code', () => {
  // Each case below is a hole or a false positive found by an adversarial pass on the
  // previous version of this guard.

  it('ignores a signature that appears only inside a string literal', () => {
    const source = [
      'class C {',
      '  val decoy = "private fun sendEvent(x: Int) { hasActiveReactInstance() }"',
      '  private fun sendEvent(x: Int) { emitAlways() }',
      '}',
    ].join('\n');

    const body = functionBody(
      maskCommentsAndStrings(source),
      /private\s+fun\s+sendEvent\s*\(/
    );
    expect(body).toBe('emitAlways()');
    expect(body).not.toMatch(/hasActiveReactInstance/);
  });

  it('ignores an identifier that appears only in a comment', () => {
    const source = [
      'class C {',
      '  private fun sendEvent(x: Int) {',
      '    // gate: hasActiveReactInstance() used to be checked here',
      '    emitAlways()',
      '  }',
      '}',
    ].join('\n');

    expect(
      functionBody(
        maskCommentsAndStrings(source),
        /private\s+fun\s+sendEvent\s*\(/
      )
    ).not.toMatch(/hasActiveReactInstance/);
  });

  it('is not derailed by an unbalanced brace inside a string literal', () => {
    const source = [
      'class C {',
      '  private fun sendEvent(x: Int) {',
      '    log("unregister batch }")',
      '    hasActiveReactInstance()',
      '  }',
      '}',
    ].join('\n');

    expect(
      functionBody(
        maskCommentsAndStrings(source),
        /private\s+fun\s+sendEvent\s*\(/
      )
    ).toMatch(/hasActiveReactInstance/);
  });

  it('skips a default-argument lambda when locating the body', () => {
    const source = [
      'class C {',
      '  private fun sendEvent(x: Int, onDone: () -> Unit = {}) {',
      '    hasActiveReactInstance()',
      '  }',
      '}',
    ].join('\n');

    expect(
      functionBody(
        maskCommentsAndStrings(source),
        /private\s+fun\s+sendEvent\s*\(/
      )
    ).toMatch(/hasActiveReactInstance/);
  });

  it('masks a nested block comment through to its real end', () => {
    // Kotlin and Swift both allow nesting. Closing at the first `*/` would leave
    // `if (...) return */` looking live while the compiled function has no gate at all.
    const source = [
      'class C {',
      '  private fun sendEvent(x: Int) {',
      '    /* disabled /* see flake */ if (hasActiveReactInstance()) return */',
      '    emitAlways()',
      '  }',
      '}',
    ].join('\n');

    const body = functionBody(
      maskCommentsAndStrings(source),
      /private\s+fun\s+sendEvent\s*\(/
    );
    expect(body).toBe('emitAlways()');
    expect(body).not.toMatch(/hasActiveReactInstance/);
  });

  it('throws rather than passing vacuously when the signature is gone', () => {
    expect(() =>
      functionBody(
        'class C { private fun other() {} }',
        /private\s+fun\s+sendEvent\s*\(/
      )
    ).toThrow(/would pass vacuously/);
  });
});

describe('why a listener tally cannot be kept honest', () => {
  /**
   * Mirrors what a native counter would see if one existed: `NativeEventEmitter` drives
   * these two callbacks, and nothing else.
   */
  const makeCounter = () => {
    let count = 0;
    return {
      get value() {
        return count;
      },
      nativeModule: {
        addListener: (_eventName: string) => {
          count += 1;
        },
        removeListeners: (n: number) => {
          count -= n;
        },
      },
    };
  };

  it('reports more removals than additions after removeAllListeners', () => {
    // `removeAllListeners` deletes the event registry but does not invalidate the
    // subscriptions `addListener` already handed out, so removing one later decrements a
    // second time for the same listener.
    const counter = makeCounter();
    const emitter = new NativeEventEmitter(counter.nativeModule);

    const subscription = emitter.addListener('loginRequired', () => {});
    expect(counter.value).toBe(1);

    emitter.removeAllListeners('loginRequired');
    subscription.remove();

    expect(counter.value).toBe(-1);
  });

  it('counts listeners this module never registered', () => {
    // Event names are globally scoped on RCTDeviceEventEmitter, and `removeAllListeners`
    // forwards that global count rather than the module's own tally.
    const counter = makeCounter();
    const emitter = new NativeEventEmitter(counter.nativeModule);

    emitter.addListener('navigateToUrl', () => {});
    const foreign = DeviceEventEmitter.addListener('navigateToUrl', () => {});

    expect(emitter.listenerCount('navigateToUrl')).toBe(2);

    emitter.removeAllListeners('navigateToUrl');

    expect(counter.value).toBe(-1);
    foreign.remove();
  });

  it('can reach zero while a listener on another event is still live', () => {
    // The starvation case: one scalar cannot describe many independently-removable event
    // names. This is why the counter was removed rather than merely floored at zero.
    const counter = makeCounter();
    const emitter = new NativeEventEmitter(counter.nativeModule);

    emitter.addListener('loginRequired', () => {});
    const nav = emitter.addListener('navigateToUrl', () => {});
    expect(counter.value).toBe(2);

    emitter.removeAllListeners('navigateToUrl');
    nav.remove();

    expect(counter.value).toBe(0);
    expect(emitter.listenerCount('loginRequired')).toBe(1);
  });
});

describe('module-level event inventory', () => {
  // Adding or removing a native channel must touch this list, so a new name (e.g.
  // `backRequested`) cannot land without a test acknowledging it. Both platforms must
  // send exactly the same set.
  const EVENT_NAMES = [
    'backRequested',
    'bridgeShareTokenRequest',
    'clientObjectPostChanged',
    'communityDataChanged',
    'connectionStateChanged',
    'editUser',
    'groupAccessDenied',
    'groupsChanged',
    'hasAccessToCommunityChanged',
    'isInitialisedChanged',
    'loginRequired',
    'navigateToClientObject',
    'navigateToProfile',
    'navigateToUrl',
    'notSeenNotificationsCountChanged',
    'profileChanged',
    'sdkEvent',
    'userTokenRequest',
  ];

  it.each([
    ['Android', ANDROID_EMITTER],
    ['iOS', IOS_EMITTER],
  ])('%s sends exactly the inventoried events', (_name, file) => {
    expect(sentNames(readFile(file))).toEqual(EVENT_NAMES);
  });

  it('has a TypeScript subscription for every native event', () => {
    const names = sourceFiles('').flatMap((file) =>
      subscribedNames(readFile(join('src', file)), file)
    );
    expect([...new Set(names)].sort()).toEqual(EVENT_NAMES);
  });

  it('ignores commented calls, string decoys and the declaration', () => {
    const source = [
      '// sendEvent("comment", null)',
      '/* sendEvent(name: "blockComment", body: nil) */',
      'val decoy = "sendEvent(\\"stringDecoy\\", null)"',
      'private fun sendEvent(name: String, body: Any?) {}',
      'sendEvent ( /* label */ "loginRequired", null)',
      'sendEvent( name : "loginRequired", body: nil)',
    ].join('\n');
    expect(sentNames(source)).toEqual(['loginRequired']);
  });

  it.each([
    'sendEvent(eventName, null)',
    'sendEvent(name: eventName, body: nil)',
    'sendEvent("event${suffix}", null)',
    'sendEvent("loginRequired" + suffix, null)',
  ])('rejects an uninventoried call: %s', (dynamicCall) => {
    expect(() =>
      sentNames(`sendEvent("loginRequired", null)\n${dynamicCall}`)
    ).toThrow(/literal event name/);
  });

  it('reads TypeScript subscriptions as code, including state channels', () => {
    expect(
      subscribedNames(
        '// eventEmitter.addListener("comment", cb);\n' +
          'const decoy = \'eventEmitter.addListener("string", cb)\';\n' +
          'eventEmitter.addListener("loginRequired", cb);\n' +
          'new StateChannel<boolean>("isInitialisedChanged", false);',
        'fixture.ts'
      )
    ).toEqual(['loginRequired', 'isInitialisedChanged']);
    expect(() =>
      subscribedNames('eventEmitter.addListener(dynamicName, cb)', 'fixture.ts')
    ).toThrow(/Unrecognised native event subscription/);
  });

  it('keeps the inventory sorted and free of duplicates', () => {
    expect(EVENT_NAMES).toEqual([...new Set(EVENT_NAMES)].sort());
  });
});
