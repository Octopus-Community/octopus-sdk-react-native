import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DeviceEventEmitter, NativeEventEmitter } from 'react-native';

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

/**
 * Blanks out comments and string literals, preserving newlines and byte offsets so that
 * brace balance over the remaining real code is unchanged. Handles `//` line comments,
 * block and KDoc comments including the nesting Kotlin and Swift both allow, Kotlin `"""`
 * raw strings, and escaped quotes.
 */
const maskCommentsAndStrings = (source: string): string => {
  const out = source.split('');
  const blank = (from: number, to: number): void => {
    for (let i = from; i < to && i < out.length; i += 1) {
      if (out[i] !== '\n') out[i] = ' ';
    }
  };

  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);

    if (two === '//') {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      blank(i, stop);
      i = stop;
    } else if (two === '/*') {
      // Kotlin and Swift both allow NESTED block comments, so track depth instead of
      // stopping at the first `*/`. Stopping early would leave the tail of an outer
      // comment looking like live code — enough to make a gate that is entirely
      // commented out read as present.
      let depth = 0;
      let j = i;
      while (j < source.length) {
        if (source.startsWith('/*', j)) {
          depth += 1;
          j += 2;
        } else if (source.startsWith('*/', j)) {
          depth -= 1;
          j += 2;
          if (depth === 0) break;
        } else {
          j += 1;
        }
      }
      const stop = Math.min(j, source.length);
      blank(i, stop);
      i = stop;
    } else if (source.startsWith('"""', i)) {
      const end = source.indexOf('"""', i + 3);
      const stop = end === -1 ? source.length : end + 3;
      blank(i, stop);
      i = stop;
    } else if (source[i] === '"') {
      let j = i + 1;
      while (j < source.length && source[j] !== '"' && source[j] !== '\n') {
        j += source[j] === '\\' ? 2 : 1;
      }
      const stop = Math.min(j + 1, source.length);
      blank(i, stop);
      i = stop;
    } else {
      i += 1;
    }
  }

  return out.join('');
};

/**
 * Returns the brace-balanced body of the named function, so an assertion cannot be
 * satisfied by text living in some other method. Expects already-masked source. Walks past
 * the parameter list by paren depth before looking for the body brace, so a default
 * argument such as `onDone: () -> Unit = {}` is not mistaken for the body.
 */
const functionBody = (masked: string, signature: RegExp): string => {
  const match = signature.exec(masked);
  if (match == null) {
    throw new Error(
      `Could not find ${signature} — the guard would pass vacuously.`
    );
  }

  let cursor = masked.indexOf('(', match.index);
  if (cursor === -1) {
    throw new Error(`Could not find the parameter list of ${signature}.`);
  }
  let parens = 0;
  for (; cursor < masked.length; cursor += 1) {
    if (masked[cursor] === '(') parens += 1;
    else if (masked[cursor] === ')') {
      parens -= 1;
      if (parens === 0) {
        cursor += 1;
        break;
      }
    }
  }
  if (parens !== 0) {
    throw new Error(`Unbalanced parameter list in ${signature}.`);
  }

  const open = masked.indexOf('{', cursor);
  if (open === -1) {
    throw new Error(`Could not find the opening brace of ${signature}.`);
  }

  let depth = 0;
  for (let i = open; i < masked.length; i += 1) {
    if (masked[i] === '{') depth += 1;
    else if (masked[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        return masked
          .slice(open + 1, i)
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
  }
  throw new Error(`Unbalanced braces after ${signature}.`);
};

const PLATFORMS = [
  {
    name: 'Android',
    file: ANDROID_EMITTER,
    sendEvent: /private\s+fun\s+sendEvent\s*\(/,
    // `getJSModule` throws once the instance is torn down — that is the real hazard.
    liveness: /hasActiveReactInstance\s*\(\s*\)/,
  },
  {
    name: 'iOS',
    file: IOS_EMITTER,
    sendEvent: /private\s+func\s+sendEvent\s*\(/,
    liveness: /\bisValid\b/,
  },
] as const;

describe.each(PLATFORMS)(
  '$name event gate',
  ({ file, sendEvent, liveness }) => {
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
