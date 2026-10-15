import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  blockBody,
  functionBody,
  maskCommentsAndStrings,
} from '../../../src/__tests__/helpers/sourceLexer';

const sceneDelegate = readFileSync(
  join(__dirname, '../../ios/OctopusReactNativeSdkExample/SceneDelegate.swift'),
  'utf8'
);

// Jest cannot execute UIKit. Scope the native-source check to the setup guard's
// failure branch, so a log elsewhere (or in a comment) cannot hide a blank launch.
const setupFailureBody = (source: string): string => {
  const connectBody = functionBody(
    maskCommentsAndStrings(source),
    /func\s+scene\s*\(/
  );
  return blockBody(
    connectBody,
    /guard\s+let\s+windowScene\b[\s\S]*?\belse\s*\{/
  );
};

const logsBeforeReturning = (body: string): boolean =>
  /^(?:(?:NSLog|assertionFailure)\s*\(\s*\)\s+)+return$/.test(body) &&
  /\bNSLog\s*\(/.test(body);

describe('iOS example scene setup', () => {
  it('logs a setup failure before returning from the guard', () => {
    expect(logsBeforeReturning(setupFailureBody(sceneDelegate))).toBe(true);
  });

  it.each([
    'NSLog("setup failed") assertionFailure("unexpected scene") return',
    'assertionFailure("unexpected scene") NSLog("setup failed") return',
    'NSLog("setup failed") NSLog("more context") return',
  ])('allows additional diagnostics before returning: %s', (failureBody) => {
    const scene = `
      func scene(_ scene: UIScene) {
        guard let windowScene = scene as? UIWindowScene else { ${failureBody} }
      }
    `;
    expect(logsBeforeReturning(setupFailureBody(scene))).toBe(true);
  });

  it.each([
    'return',
    '/* NSLog("setup failed") */ return',
    'assertionFailure("setup failed") return',
    'return NSLog("too late")',
  ])('rejects a silent failure branch: %s', (failureBody) => {
    const silentScene = `
        func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
                   options connectionOptions: UIScene.ConnectionOptions) {
          guard let windowScene = scene as? UIWindowScene,
                let appDelegate = UIApplication.shared.delegate as? AppDelegate,
                let moduleName = appDelegate.moduleName
          else { ${failureBody} }
          NSLog("outside the failure branch")
        }
      `;
    expect(logsBeforeReturning(setupFailureBody(silentScene))).toBe(false);
  });
});
