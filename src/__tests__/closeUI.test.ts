import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { closeUI } from '../closeUI';
import {
  blockBody,
  functionBody,
  maskCommentsAndStrings,
} from './helpers/sourceLexer';

const mockCloseUI = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    closeUI: (...args: unknown[]) => mockCloseUI(...args),
  },
}));

beforeEach(() => mockCloseUI.mockReset());

describe('closeUI', () => {
  it('forwards the native completion promise without resolving it early', async () => {
    let complete!: () => void;
    const nativeCompletion = new Promise<void>((resolve) => {
      complete = resolve;
    });
    mockCloseUI.mockReturnValue(nativeCompletion);
    const result = closeUI();
    expect(result).toBe(nativeCompletion);
    expect(mockCloseUI).toHaveBeenCalledTimes(1);
    expect(mockCloseUI).toHaveBeenCalledWith();

    let settled = false;
    result.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    complete();
    await result;
    expect(settled).toBe(true);
  });

  it('preserves native rejection when no iOS fullscreen UI is presented', async () => {
    const error = Object.assign(new Error('No UI is currently presented'), {
      code: 'CLOSE_UI_ERROR',
    });
    mockCloseUI.mockRejectedValue(error);
    await expect(closeUI()).rejects.toBe(error);
  });

  it('preserves native resolution when no Android fullscreen UI is presented', async () => {
    mockCloseUI.mockResolvedValue(undefined);
    await expect(closeUI()).resolves.toBeUndefined();
  });
});

// Jest can exercise the JS promise contract above, but cannot run UIKit or the
// Activity lifecycle. Keep scoped native callback-placement guards for those parts;
// allow formatting, optional `self`, semicolons and extra diagnostics in the bodies.
// Comments and strings are masked so they cannot satisfy these checks.
const nativeBody = (file: string, signature: RegExp): string =>
  functionBody(
    maskCommentsAndStrings(
      readFileSync(join(__dirname, '..', '..', file), 'utf8')
    ),
    signature
  );
const ANDROID =
  'android/src/main/java/com/octopuscommunity/octopusreactnativesdk/';

function expectIosCompletion(bridge: string): void {
  const main = blockBody(bridge, /DispatchQueue\s*\.\s*main\s*\.\s*async/);
  const completion = blockBody(
    main,
    /try\s+(?:self\s*\.\s*)?uiManager\s*\.\s*closeUI/
  );
  expect(completion).toMatch(/\bresolve\s*\(\s*nil\s*\)/);
  expect(bridge.match(/\bresolve\s*\(/g)).toHaveLength(1);
  expect(blockBody(main, /catch/)).toMatch(/\breject\s*\(/);
}

const callbackIteration =
  /(?:\bcompletions\s*\.\s*forEach|\bfor\s+([A-Za-z_]\w*)\s+in\s+completions)\s*\{/;

function expectCallbacksInvoked(source: string): void {
  const iteration = callbackIteration.exec(source);
  expect(iteration).not.toBeNull();
  const body = blockBody(source, callbackIteration);
  const parameter = body.match(
    /^\s*(?:\(\s*)?([A-Za-z_]\w*)\s*(?::\s*[^{}]*?)?(?:\s*\))?\s+in\b/
  );
  const callback = iteration?.[1] ?? parameter?.[1] ?? '$0';
  const statements = parameter ? body.slice(parameter[0].length) : body;
  const escapedCallback = callback.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  expect(statements).toMatch(
    new RegExp(`(?<![\\w$.])${escapedCallback}\\s*\\(\\s*\\)`)
  );
}

function expectConcurrentRequestJoined(source: string): void {
  expect(source).toMatch(
    /closeUICompletions\s*\[\s*controllerID\s*\]\s*\?\s*\.\s*append\s*\(\s*completion\s*\)/
  );
  expect(source).toMatch(/\breturn\s*;?$/);
  expect(source).not.toMatch(
    /\b(?:dismissFullscreenUI|completeCloseUI|completion)\s*\(|\.\s*dismiss\s*\(|\$0\s*\(/
  );
}

describe('iOS closeUI native completion', () => {
  const bridge = nativeBody(
    'ios/OctopusReactNativeSdk.swift',
    /func\s+closeUI\s*\(/
  );
  const manager = nativeBody(
    'ios/OctopusUIManager.swift',
    /func\s+closeUI\s*\(/
  );

  it('resolves only inside the manager completion on the main queue', () => {
    expectIosCompletion(bridge);
  });

  it.each(['self.uiManager', 'uiManager'])(
    'allows diagnostic statements and formatting changes around %s completion',
    (managerName) => {
      const source = maskCommentsAndStrings(`
        func closeUI() {
          DispatchQueue.main.async {
            do {
              try ${managerName}.closeUI {
                NSLog("closed"); resolve ( nil );
              }
            } catch { reject("CLOSE_UI_ERROR", "failed", error) }
          }
        }
      `);
      expectIosCompletion(functionBody(source, /func\s+closeUI\s*\(/));
    }
  );

  const dismiss = nativeBody(
    'ios/OctopusUIManager.swift',
    /func\s+dismissFullscreenUI\s*\(/
  );
  const complete = nativeBody(
    'ios/OctopusUIManager.swift',
    /func\s+completeCloseUI\s*\(/
  );

  it('dismisses Octopus and its sheets through the presenting controller', () => {
    expect(dismiss).toMatch(
      /guard\s+let\s+presenter\s*=\s*presentedVC\s*\.\s*presentingViewController\s+else/
    );
    expect(
      blockBody(
        dismiss,
        /presenter\s*\.\s*dismiss\s*\(\s*animated\s*:\s*true\s*\)/
      )
    ).toMatch(/\bcompleteCloseUI\s*\(\s*presentedVC\s*\)/);
    expect(dismiss).not.toMatch(/presentedVC\s*\.\s*dismiss\s*\(/);
    expect(
      blockBody(complete, /if\s+presentedViewController\s*===\s*presentedVC/)
    ).toMatch(/\bpresentedViewController\s*=\s*nil\b/);
    expect(complete).toMatch(
      /closeUICompletions\s*\.\s*removeValue\s*\(\s*forKey\s*:\s*ObjectIdentifier\s*\(\s*presentedVC\s*\)\s*\)/
    );
    expect(complete.search(/\bremoveValue\s*\(/)).toBeLessThan(
      complete.search(callbackIteration)
    );
    expectCallbacksInvoked(complete);
  });

  it('allows diagnostics around callbacks but rejects a loop that never invokes them', () => {
    expectCallbacksInvoked(
      maskCommentsAndStrings(
        'completions.forEach { NSLog("completed"); $0 ( ); }'
      )
    );
    expect(() =>
      expectCallbacksInvoked(
        maskCommentsAndStrings(
          'completions.forEach { _ in NSLog("completed") }'
        )
      )
    ).toThrow();
  });

  it('accepts named callback parameters with optional parentheses and types', () => {
    for (const closure of [
      'completion in completion()',
      '(c) in c()',
      'completion: () -> Void in completion()',
      '(c: () -> Void) in c()',
    ]) {
      expectCallbacksInvoked(`completions.forEach { ${closure} }`);
    }
  });

  it('accepts for-in callback loops', () => {
    for (const variable of ['completion', 'c']) {
      expectCallbacksInvoked(
        `for ${variable} in completions { ${variable}() }`
      );
    }
  });

  it('rejects named callback blocks that do not invoke the bound parameter', () => {
    for (const statement of [
      'NSLog("x")',
      'other()',
      '$0()',
      'object.completion()',
    ]) {
      expect(() =>
        expectCallbacksInvoked(
          maskCommentsAndStrings(
            `completions.forEach { completion in ${statement} }`
          )
        )
      ).toThrow();
    }
  });

  it('rejects for-in callback loops that do not invoke the bound variable', () => {
    for (const statement of ['NSLog("x")', 'other()', '$0()', 'object.c()']) {
      expect(() =>
        expectCallbacksInvoked(
          maskCommentsAndStrings(`for c in completions { ${statement} }`)
        )
      ).toThrow();
    }
  });

  it('joins concurrent requests without starting another dismissal', () => {
    const joinDismissal = blockBody(
      manager,
      /if\s+closeUICompletions\s*\[\s*controllerID\s*\]\s*!=\s*nil/
    );
    expectConcurrentRequestJoined(joinDismissal);
    expect(manager.indexOf(joinDismissal)).toBeLessThan(
      manager.search(/\bdismissFullscreenUI\s*\(/)
    );
  });

  it('allows diagnostics while joining, but rejects a second dismissal', () => {
    const joinStatement =
      'closeUICompletions[controllerID]?.append(completion);';
    expectConcurrentRequestJoined(
      maskCommentsAndStrings(`${joinStatement} NSLog("joined"); return;`)
    );
    expect(() =>
      expectConcurrentRequestJoined(
        `${joinStatement} dismissFullscreenUI(presentedVC); return`
      )
    ).toThrow();
  });

  it('waits for an SDK-initiated dismissal before completing or dismissing again', () => {
    const waiting = blockBody(
      dismiss,
      /if\s+presentedVC\s*\.\s*isBeingDismissed/
    );
    expect(
      blockBody(waiting, /DispatchQueue\s*\.\s*main\s*\.\s*asyncAfter/)
    ).toMatch(/\bdismissFullscreenUI\s*\(\s*presentedVC\s*\)/);
    expect(waiting).toMatch(/\breturn\s*;?$/);
    expect(waiting).not.toMatch(/completeCloseUI|\.\s*dismiss\s*\(/);
    expect(dismiss.indexOf(waiting)).toBeLessThan(
      dismiss.search(/presenter\s*\.\s*dismiss/)
    );
    expect(
      blockBody(
        dismiss,
        /guard\s+let\s+presenter\s*=\s*presentedVC\s*\.\s*presentingViewController\s+else/
      )
    ).toMatch(/\bcompleteCloseUI\s*\(\s*presentedVC\s*\)\s*;?\s*return\s*;?$/);
  });

  it('settles every pending close request during cleanup and stops delayed work', () => {
    const cleanup = nativeBody(
      'ios/OctopusUIManager.swift',
      /func\s+cleanup\s*\(/
    );
    expect(cleanup).toMatch(/!\s*presentedVC\s*\.\s*isBeingDismissed/);
    expect(cleanup).toMatch(
      /presentedVC\s*\.\s*presentingViewController\s*\?\s*\.\s*dismiss\s*\(\s*animated\s*:\s*false\s*,\s*completion\s*:\s*nil\s*\)/
    );
    expect(cleanup).toMatch(
      /let\s+completions\s*=\s*closeUICompletions\s*\.\s*values\s*\.\s*flatMap\s*\{\s*\$0\s*\}/
    );
    expect(cleanup).toMatch(/closeUICompletions\s*\.\s*removeAll\s*\(\s*\)/);
    expectCallbacksInvoked(cleanup);
    expect(
      cleanup.search(/closeUICompletions\s*\.\s*removeAll\s*\(/)
    ).toBeLessThan(cleanup.search(callbackIteration));
    expect(
      blockBody(
        dismiss,
        /guard\s+closeUICompletions\s*\[\s*ObjectIdentifier\s*\(\s*presentedVC\s*\)\s*\]\s*!=\s*nil\s+else/
      )
    ).toMatch(/\breturn\s*;?$/);
  });

  it('throws before starting a dismissal when no controller is presented', () => {
    const absent = blockBody(
      manager,
      /guard\s+let\s+presentedVC\s*=\s*presentedViewController\s+else/
    );
    expect(absent).toMatch(/\bthrow\s+NSError\s*\(/);
    expect(manager.indexOf(absent)).toBeLessThan(
      manager.search(/closeUICompletions\s*\[\s*controllerID\s*\]\s*=/)
    );
  });
});

describe('Android closeUI native completion', () => {
  const bridge = nativeBody(
    `${ANDROID}OctopusUIController.kt`,
    /fun\s+closeUI\s*\(/
  );
  const activity = `${ANDROID}OctopusActivity.kt`;

  it('resolves immediately after broadcasting the close request', () => {
    const request = blockBody(bridge, /try/);
    expect(request).toMatch(
      /val\s+intent\s*=\s*Intent\s*\(\s*CLOSE_UI_ACTION\s*\)/
    );
    expect(request).toMatch(
      /intent\s*\.\s*setPackage\s*\(\s*reactContext\s*\.\s*packageName\s*\)/
    );
    expect(request).toMatch(
      /reactContext\s*\.\s*sendBroadcast\s*\(\s*intent\s*\)/
    );
    expect(request).toMatch(/promise\s*\.\s*resolve\s*\(\s*null\s*\)/);
    expect(request.search(/\bsendBroadcast\s*\(/)).toBeLessThan(
      request.search(/\bresolve\s*\(/)
    );
    expect(bridge.match(/promise\s*\.\s*resolve\s*\(/g)).toHaveLength(1);
    expect(bridge).not.toMatch(/UiThreadUtil|OctopusActivity\.closeUI/);
    expect(blockBody(bridge, /catch/)).toMatch(/promise\s*\.\s*reject\s*\(/);
  });

  it('keeps the receiver that finishes the Activity without waiting for destruction', () => {
    const source = maskCommentsAndStrings(
      readFileSync(join(__dirname, '..', '..', activity), 'utf8')
    );
    expect(functionBody(source, /override\s+fun\s+onReceive\s*\(/)).toMatch(
      /\bfinish\s*\(\s*\)/
    );
    expect(functionBody(source, /fun\s+registerCloseUIReceiver\s*\(/)).toMatch(
      /IntentFilter\s*\(\s*OctopusUIController\s*\.\s*CLOSE_UI_ACTION\s*\)/
    );
    expect(source).not.toMatch(/closeUICompletions|fun\s+closeUI\s*\(/);
  });
});
