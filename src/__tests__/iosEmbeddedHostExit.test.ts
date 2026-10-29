import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  functionBody,
  maskCommentsAndStrings,
  typeBody,
} from './helpers/sourceLexer';

/**
 * iOS embedded view with a host exit (`showBackButton` or `navBarLeadingAction`).
 *
 * The native SDK closes its root screens through SwiftUI's
 * `presentationMode.dismiss()` and shows a text "Close" button whenever
 * `presentationMode.isPresented`. A plain child `UIHostingController` inherits
 * the host screen's presentation, so inside a React Navigation modal the SDK
 * dismissed the host's modal by itself, and a root post editor never reached
 * `onBackRequested` after a publish. Jest cannot run UIKit, so these guards pin
 * the Swift contract that fixes both. Comments and strings are masked so they
 * cannot satisfy the checks.
 */
const source = (file: string): string =>
  maskCommentsAndStrings(
    readFileSync(join(__dirname, '..', '..', file), 'utf8')
  );

const UI_MANAGER = source('ios/OctopusUIManager.swift');
const BRIDGE = source('ios/OctopusReactNativeSdk.swift');
const CONTAINER = source('ios/OctopusUIViewManager.swift');

describe('iOS embedded view with a host exit', () => {
  describe('OctopusEmbeddedHostingController', () => {
    const body = typeBody(
      UI_MANAGER,
      /class\s+OctopusEmbeddedHostingController\s*<[^>]*>\s*:\s*UIHostingController\s*<\s*Content\s*>/
    );

    it.each(['presentingViewController', 'navigationController'])(
      'hides the host %s from SwiftUI only when isolating',
      (property) => {
        expect(body).toMatch(
          new RegExp(
            `override\\s+var\\s+${property}\\s*:[^{]*\\{\\s*isolatesHostPresentation\\s*\\?\\s*nil\\s*:\\s*super\\s*\\.\\s*${property}\\s*\\}`
          )
        );
      }
    );

    it('isolates nothing by default', () => {
      expect(body).toMatch(/var\s+isolatesHostPresentation\s*=\s*false\b/);
    });
  });

  describe('OctopusUIManager.addEmbeddedView', () => {
    const body = functionBody(UI_MANAGER, /func\s+addEmbeddedView\s*\(/);

    it('hosts the SDK in the isolating controller, not a plain UIHostingController', () => {
      expect(body).toMatch(
        /let\s+hostingController\s*=\s*OctopusEmbeddedHostingController\s*\(/
      );
      expect(body).not.toMatch(/\bUIHostingController\s*\(/);
    });

    it('isolates exactly when the host supplied a leading action, before the view joins the hierarchy', () => {
      const isolation =
        /hostingController\s*\.\s*isolatesHostPresentation\s*=\s*navBarLeadingAction\s*!=\s*nil/;
      expect(body).toMatch(isolation);
      const isolatedAt = body.search(isolation);
      const attachedAt = body.search(
        /\.\s*addSubview\s*\(\s*hostingController/
      );
      expect(attachedAt).toBeGreaterThan(isolatedAt);
      expect(
        body.search(/\.\s*addChild\s*\(\s*hostingController/)
      ).toBeGreaterThan(isolatedAt);
    });
  });

  describe('root post editor publish', () => {
    const bridge = functionBody(BRIDGE, /@objc\s+func\s+addEmbeddedView\s*\(/);

    it('hands the SDK and the publish route the same host leading action', () => {
      expect(bridge).toMatch(
        /let\s+leadingAction\s*=\s*embeddedNavBarLeadingAction\s*\(/
      );
      expect(bridge).toMatch(/navBarLeadingAction\s*:\s*leadingAction\b/);
    });

    it('routes postCreated to onBackRequested only for a root editor with a host exit', () => {
      expect(bridge).toMatch(
        /if\s+leadingAction\s*!=\s*nil\s*,\s*case\s+\.\s*home\s*\(\s*\.\s*createPost\s*\)\s*=\s*initialScreen\s*,[^{]*as\?\s*OctopusEmbeddedContainerView\s*\{\s*container\s*\.\s*routePublishToBackRequested\s*\(\s*octopus\s*\.\s*eventPublisher/
      );
      expect(bridge).toMatch(/if\s+case\s+\.\s*postCreated\s*=\s*event/);
    });

    it('fires onBackRequested on the main queue, only while the view is in a window', () => {
      const route = functionBody(
        CONTAINER,
        /func\s+routePublishToBackRequested\s*\(/
      );
      expect(route).toMatch(
        /\.\s*receive\s*\(\s*on\s*:\s*DispatchQueue\s*\.\s*main\s*\)/
      );
      expect(route).toMatch(/\[\s*weak\s+self\s*\]/);
      expect(route).toMatch(/self\s*\.\s*window\s*!=\s*nil/);
      expect(route).toMatch(
        /(?:self\s*\.\s*)?onBackRequested\s*\?\s*\(\s*\[\s*:\s*\]\s*\)/
      );
      // Stored, so the subscription lives as long as the container.
      expect(route).toMatch(/publishSubscription\s*=\s*published\b/);
    });
  });
});
