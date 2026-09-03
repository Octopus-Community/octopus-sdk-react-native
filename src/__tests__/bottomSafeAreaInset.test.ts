import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  blockBody,
  functionBody,
  maskCommentsAndStrings,
  typeBody,
} from './helpers/sourceLexer';

/**
 * `OctopusUIOptions.bottomSafeAreaInset` is documented as a **total** bottom margin — which is
 * what the Android bridge delivers, since the native Android SDK adds no bottom system-bar
 * padding of its own. The native iOS API applies its value **additively**, on top of the safe
 * area the hosted screen already sits in. On the *embedded* path the two disagree, so
 * `OctopusEmbeddedContainerView` (`ios/OctopusUIViewManager.swift`) subtracts the container's
 * own safe area before forwarding. The *fullscreen* path forwards the value untouched — see
 * the "fullscreen path" block below for why that asymmetry is intentional, not a gap.
 *
 * These guards pin the parts of the embedded normalization that fail silently — no compiler
 * catches any of them, and the visible symptom is a band of the wrong height on a device, or
 * state loss that looks like an unrelated bug:
 *
 * 1. the strictly-positive floor, which keeps the native SDK's `bottomSafeAreaInset > 0` gate
 *    on. Crossing that gate swaps a `_ConditionalContent` branch and discards the displayed
 *    screen's state, a half-written post included;
 * 2. the subtraction itself, and the fact that a non-positive request never starts the
 *    normalization at all;
 * 3. that the container keeps tracking its **own** geometry (not the window's) on both layout
 *    and safe-area-change signals, and that no `rootView` is built outside the function that
 *    wraps the hosted tree in the observing host;
 * 4. the joins between all of the above. Each piece can be correct in isolation while the
 *    value never travels: a normalization that is computed and then discarded — pinned
 *    directly, by binding the store write to the expression it actually assigns — a store
 *    that publishes nothing, a host that renders from a constant instead of its content
 *    closure, a call site that never tells the container what was requested.
 *
 * Every assertion runs on source text with comments and string literals masked out, and every
 * check is expressed as a pure function of that text so the second half of the file can feed
 * it hand-written sources: one `MUST FAIL` case per way the invariant can break, one
 * `MUST PASS` case per equivalent rewrite that must not be mistaken for a break.
 */

const ROOT = join(__dirname, '..', '..');

const IOS_VIEW_MANAGER = 'ios/OctopusUIViewManager.swift';
const IOS_UI_MANAGER = 'ios/OctopusUIManager.swift';
const IOS_INSET = 'ios/OctopusBottomInset.swift';

const readFile = (relativePath: string): string =>
  readFileSync(join(ROOT, relativePath), 'utf8');

// --- the checks, as pure functions of source text -------------------------------------------

const FLOOR_DECLARATION =
  /static\s+let\s+gatePinningInset\s*(?::[^=\n]+)?=\s*([^\n]+)/;

/**
 * The literal the floor is declared with. Deliberately requires a plain numeric literal: a
 * computed expression is not something this guard can evaluate, so it reports that rather than
 * quietly accepting an unknown value.
 */
const floorLiteral = (source: string): string => {
  const match = FLOOR_DECLARATION.exec(maskCommentsAndStrings(source));
  if (match == null) {
    throw new Error(
      'No live `gatePinningInset` declaration — the guard would pass vacuously.'
    );
  }
  return (match[1] ?? '').trim();
};

const NORMALIZE = /func\s+normalizedBottomInset\s*\(/;
const UPDATE = /func\s+updateNormalizedBottomInset\s*\(/;
const LAYOUT_SUBVIEWS = /override\s+func\s+layoutSubviews\s*\(/;
const SAFE_AREA_CHANGE = /override\s+func\s+safeAreaInsetsDidChange\s*\(/;

const bodyOf = (source: string, signature: RegExp): string =>
  functionBody(maskCommentsAndStrings(source), signature);

/**
 * Whether `updateNormalizedBottomInset`'s body actually assigns the floored result to the
 * store — not merely computes it into a local that is then discarded. Accepts either an
 * inline `bottomInsetStore.value = max(...)` or a named binding written earlier in the same
 * body as `let <name> = max(...)`.
 */
const assignsFlooredValue = (body: string): boolean => {
  if (/bottomInsetStore\.value\s*=\s*(?:Swift\.)?max\s*\(/.test(body)) {
    return true;
  }
  const assigned = /bottomInsetStore\.value\s*=\s*([A-Za-z_]\w*)\b/.exec(body);
  if (assigned == null) return false;
  return new RegExp(
    `let\\s+${assigned[1]}\\s*=\\s*(?:Swift\\.)?max\\s*\\(`
  ).test(body);
};

/**
 * Whether `signature`'s body reaches `updateNormalizedBottomInset()` — directly, or through
 * one zero-argument helper defined in the same file.
 */
const reachesUpdate = (source: string, signature: RegExp): boolean => {
  const masked = maskCommentsAndStrings(source);
  const calls = (body: string): boolean =>
    /updateNormalizedBottomInset\s*\(\s*\)/.test(body);

  const body = functionBody(masked, signature);
  if (calls(body)) return true;

  for (const call of body.match(/\b[A-Za-z_]\w*\s*\(\s*\)/g) ?? []) {
    const name = call.replace(/\s*\(\s*\)$/, '');
    const helper = new RegExp(`func\\s+${name}\\s*\\(`);
    if (!helper.test(masked)) continue;
    if (calls(functionBody(masked, helper))) return true;
  }
  return false;
};

/**
 * Expression given to the container's own reads inside `updateNormalizedBottomInset`, i.e.
 * what feeds `systemInset:` in the call to `normalizedBottomInset(for:systemInset:)`.
 */
const systemInsetSource = (source: string): string | null => {
  const body = bodyOf(source, UPDATE);
  const match = /systemInset\s*:\s*([^)]*)\)/.exec(body);
  return match == null ? null : (match[1] ?? '').trim();
};

/** Argument given to each `startNormalizingBottomInset` call, in source order. */
const totalRequestedArgs = (source: string): string[] => {
  const masked = maskCommentsAndStrings(source);
  const args: string[] = [];
  const site = /\.startNormalizingBottomInset\s*\(\s*totalRequested\s*:\s*/g;
  let match: RegExpExecArray | null;
  while ((match = site.exec(masked)) != null) {
    args.push(readExpression(masked, match.index + match[0].length));
  }
  return args;
};

/**
 * Reads one expression starting at `from`: an identifier chain, plus its argument list when it
 * is a call, read to the **matching** close paren so a nested call cannot truncate it.
 *
 * Returns `''` when nothing at `from` starts an expression — a literal, notably, which is what
 * a hard-coded inset looks like.
 */
const readExpression = (text: string, from: number): string => {
  const head = /^[A-Za-z_][\w.?]*/.exec(text.slice(from));
  if (head == null) return '';

  const end = from + head[0].length;
  const opens = /^\s*\(/.exec(text.slice(end));
  if (opens == null) return text.slice(from, end);

  let depth = 0;
  for (let i = end + opens[0].length - 1; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') {
      depth -= 1;
      if (depth === 0) return text.slice(from, i + 1);
    }
  }
  return text.slice(from);
};

/**
 * The requested-total guard that gates whether the embedded path starts normalizing at all:
 * the immediately-invoked closure assigned to `bottomInsetStore` in `addEmbeddedView`. `null`
 * when the closure cannot be found — the guard would otherwise pass vacuously on a rewrite
 * that renamed or restructured it away.
 */
const BOTTOM_INSET_STORE_CLOSURE =
  /let\s+bottomInsetStore\s*:\s*OctopusBottomInsetStore\?\s*=\s*\{/;

const embeddedGuardBody = (source: string): string =>
  blockBody(maskCommentsAndStrings(source), BOTTOM_INSET_STORE_CLOSURE);

/** Argument given to each `rootView` write site, in source order. */
const rootViewWrites = (source: string): string[] => {
  const masked = maskCommentsAndStrings(source);
  const writes: string[] = [];
  const site = /rootView\s*[:=]\s*/g;
  let match: RegExpExecArray | null;
  while ((match = site.exec(masked)) != null) {
    writes.push(masked.slice(match.index + match[0].length).trimStart());
  }
  return writes;
};

/** A `rootView` may only be built through the function that wraps the hosted tree. */
const THROUGH_MAKE_HOME_SCREEN_VIEW =
  /^(?:OctopusThemedRoot\s*\{\s*)?(?:self\.)?makeHomeScreenView\s*\(/;

const MAKE_HOME_SCREEN_VIEW = /func\s+makeHomeScreenView\s*\(/;
const STORE_DECLARATION = /class\s+OctopusBottomInsetStore\b/;

/**
 * `value` carries the property wrapper, and not merely a neighbour of it: the tokens allowed
 * in between are access modifiers only (`private(set)` included), so anything with a `:` or an
 * `=` in it — that is, another property's declaration — ends the run.
 */
const PUBLISHED_VALUE = /@Published\s+(?:[\w()]+\s+)*var\s+value\b/;

const OPEN_UI = /func\s+openUI\s*\(/;

/**
 * Whether the SDK screen inside `makeHomeScreenView` is rendered from the observed store
 * value rather than a frozen one: the tree is wrapped in `OctopusBottomInsetHost(store:
 * content:)`, and the content — a local closure, reached directly or by name — renders
 * `bottomSafeAreaInset:` from its own parameter.
 */
const insetComesFromObservingHost = (source: string): boolean => {
  const body = bodyOf(source, MAKE_HOME_SCREEN_VIEW);

  const host =
    /OctopusBottomInsetHost\s*\(\s*store\s*:\s*[^,]+,\s*content\s*:\s*/.exec(
      body
    );
  if (host == null) return false;

  const from = host.index + host[0].length;
  const contentArg = /^\s*\{/.test(body.slice(from))
    ? body.slice(from).trimStart()
    : readExpression(body, from);

  // Either the content is an inline closure `{ inset in ... }`, or a bare name bound earlier
  // in the same body to `let <name> = { (<param>: CGFloat) in ... }`.
  const inlineParam = /^\{\s*([A-Za-z_]\w*)\s+in\b/.exec(contentArg);
  if (inlineParam != null) {
    return new RegExp(`bottomSafeAreaInset\\s*:\\s*${inlineParam[1]}\\b`).test(
      contentArg
    );
  }

  if (!/^[A-Za-z_]\w*$/.test(contentArg)) return false;
  const declaration = new RegExp(
    `\\blet\\s+${contentArg}\\s*=\\s*\\{\\s*\\(\\s*([A-Za-z_]\\w*)\\s*:`
  ).exec(body);
  if (declaration == null) return false;

  const param = declaration[1];
  const closureStart = declaration.index + declaration[0].length;
  const closureBody = body.slice(closureStart);
  return new RegExp(`bottomSafeAreaInset\\s*:\\s*${param}\\b`).test(
    closureBody
  );
};

// --- the real files ------------------------------------------------------------------------

describe('the gate-pinning floor', () => {
  it('is declared, and strictly positive', () => {
    const literal = floorLiteral(readFile(IOS_VIEW_MANAGER));
    const value = Number(literal);

    expect(Number.isFinite(value)).toBe(true);
    // A floor of 0 does not pin anything: the normalized inset legitimately reaches 0
    // whenever the system inset already covers what the host asked for.
    expect(value).toBeGreaterThan(0);
    // Above ~1 pt it stops being invisible, and the native gate it pins is `> 0`.
    expect(value).toBeLessThanOrEqual(1);
  });
});

describe('normalization', () => {
  it('subtracts the system inset, floored at zero', () => {
    const body = bodyOf(readFile(IOS_VIEW_MANAGER), NORMALIZE);

    expect(body).toMatch(/requested\s*-\s*systemInset/);
    expect(body).toMatch(/\bmax\s*\(\s*0\s*,/);
  });

  it('the caller floors the normalized result to the gate-pinning inset', () => {
    const body = bodyOf(readFile(IOS_VIEW_MANAGER), UPDATE);

    expect(body).toMatch(/normalizedBottomInset\s*\(/);
    expect(body).toMatch(/\bmax\s*\(/);
    expect(body).toMatch(/gatePinningInset/);
  });
});

describe('the embedded container', () => {
  it.each([
    ['on layout', LAYOUT_SUBVIEWS],
    ['on a safe-area change', SAFE_AREA_CHANGE],
  ])('re-normalizes %s', (_label, signature) => {
    expect(reachesUpdate(readFile(IOS_VIEW_MANAGER), signature)).toBe(true);
  });

  it('seeds the store before the SwiftUI tree is built', () => {
    // `startNormalizingBottomInset` is the call `addEmbeddedView` makes before the hosted
    // tree exists — see the docstring above it. A version that stores the request without
    // also updating the store synchronously leaves the first frame built from a stale
    // value, and the native gate flips on the *second* frame instead of never.
    expect(
      reachesUpdate(
        readFile(IOS_VIEW_MANAGER),
        /func\s+startNormalizingBottomInset\s*\(/
      )
    ).toBe(true);
  });

  it("tracks its own safe area, not the window's", () => {
    // `UIView.safeAreaInsets` already accounts for where the view sits, so this must be the
    // container's own overlap — reading the window's would over-reserve for a host that
    // already lays `<OctopusUIView>` out above the home indicator.
    const source = systemInsetSource(readFile(IOS_VIEW_MANAGER));

    expect(source).not.toBeNull();
    expect(source).toMatch(/safeAreaInsets\.bottom/);
    expect(source).not.toMatch(/\bwindow\b/);
  });
});

describe('the embedded path guard', () => {
  it('starts normalizing only for a strictly-positive request', () => {
    const body = embeddedGuardBody(readFile(IOS_UI_MANAGER));

    // An explicit `0`, or no request at all, has to leave the store untouched: flooring it up
    // to `gatePinningInset` would switch the native gate on — and with it the keyboard
    // branch — for a host that asked for nothing.
    expect(body).toMatch(/requested\s*>\s*0/);
    expect(body).toMatch(/else\s*\{\s*return\s+nil\s*\}/);
  });

  it("hands back the container's own store, not a fresh one", () => {
    // A rewrite that still gates on `requested > 0` but returns e.g. `OctopusBottomInsetStore()`
    // wires the SwiftUI tree to a store nobody ever writes: the guard above stays green while
    // the band freezes at its initial value.
    const body = embeddedGuardBody(readFile(IOS_UI_MANAGER));

    expect(body).toMatch(/return\s+container\.bottomInsetStore\b/);
  });
});

describe('the fullscreen path', () => {
  it('forwards the requested value untouched, with no tracker involved', () => {
    // See `OctopusUIManager.swift` around `makeHomeScreenView`: the fullscreen path's
    // scaffold already reserves the system inset and applies the host's value on top, the
    // same way the native SDK's `.safeAreaInset(edge: .bottom)` does — so there is nothing
    // to normalize there. A tracker appearing on this path would be a second, needless
    // source of truth, not a fix.
    const body = bodyOf(readFile(IOS_UI_MANAGER), OPEN_UI);

    expect(body).not.toMatch(/OctopusBottomInsetStore/);
    expect(body).not.toMatch(/startNormalizingBottomInset/);
  });
});

describe('the hosted tree', () => {
  it('is never built outside the function that wraps it in the observing host', () => {
    const writes = rootViewWrites(readFile(IOS_UI_MANAGER));

    // One per presentation path at the very least; a file with none would mean the grep
    // stopped matching and every assertion below passed on an empty list.
    expect(writes.length).toBeGreaterThanOrEqual(2);
    for (const write of writes) {
      expect(write.slice(0, 80)).toMatch(THROUGH_MAKE_HOME_SCREEN_VIEW);
    }
  });
});

/**
 * The checks above pin each piece of the chain in isolation. Every one of them can hold while
 * the value never travels: a normalization that is computed and discarded — asserted directly
 * below, rather than only inferred from the presence of `max(...)` and `gatePinningInset`
 * somewhere in the function — a store that publishes nothing, a host that renders from
 * something other than its content closure, a call site that hands the container a constant.
 * These assert the joins.
 */
describe('the value actually travels', () => {
  it('the store is actually written from the floored result, not a discarded local', () => {
    // Every check in "normalization" above holds even if `let normalized = max(...)` is
    // computed and then never assigned to the store — that leaves `bottomInsetStore.value`
    // frozen at its initial value while every regex there still matches.
    const body = bodyOf(readFile(IOS_VIEW_MANAGER), UPDATE);

    expect(assignsFlooredValue(body)).toBe(true);
  });

  it('publishes the stored value', () => {
    const store = typeBody(
      maskCommentsAndStrings(readFile(IOS_INSET)),
      STORE_DECLARATION
    );

    expect(store).toMatch(/var\s+value\b/);
    // Without `@Published` the store is written and read correctly and SwiftUI never hears
    // about it: the band freezes at its mount-time height, silently.
    expect(store).toMatch(PUBLISHED_VALUE);
  });

  it('conforms to ObservableObject', () => {
    expect(maskCommentsAndStrings(readFile(IOS_INSET))).toMatch(
      /class\s+OctopusBottomInsetStore\s*:\s*ObservableObject\b/
    );
  });

  it('renders the SDK screen from the observed value', () => {
    expect(insetComesFromObservingHost(readFile(IOS_UI_MANAGER))).toBe(true);
  });

  it('OctopusBottomInsetHost itself renders from the store, not a captured constant', () => {
    // The previous check only proves `makeHomeScreenView` passes the right closure to the
    // host. A `body` that ignores its own `store` and calls `content` with something else —
    // or with a value read once at init — breaks the join at the very last step, invisibly
    // to every check above.
    const masked = maskCommentsAndStrings(readFile(IOS_INSET));
    const host = typeBody(masked, /struct\s+OctopusBottomInsetHost\b/);

    expect(host).toMatch(/content\s*\(\s*store\.value\s*\)/);
  });

  it('feeds the container the requested total', () => {
    const args = totalRequestedArgs(readFile(IOS_UI_MANAGER));

    // A call site that stops handing the container the request leaves the store at its
    // initial 0, so the option silently does nothing on the embedded path.
    expect(args.length).toBeGreaterThanOrEqual(1);
    for (const arg of args) {
      expect(arg).toMatch(/\brequested\b/);
    }
  });
});

// --- MUST FAIL: one case per way the invariant can break ------------------------------------

describe('MUST FAIL — a broken invariant is caught', () => {
  it('rejects a floor of zero', () => {
    expect(
      Number(floorLiteral('static let gatePinningInset: CGFloat = 0'))
    ).not.toBeGreaterThan(0);
    expect(
      Number(floorLiteral('static let gatePinningInset: CGFloat = 0.0'))
    ).not.toBeGreaterThan(0);
  });

  it('rejects a negative floor', () => {
    expect(
      Number(floorLiteral('static let gatePinningInset = -0.01'))
    ).not.toBeGreaterThan(0);
  });

  it('reads the live floor, not a commented-out one', () => {
    const source = [
      '/* was: static let gatePinningInset: CGFloat = 0.01 */',
      'static let gatePinningInset: CGFloat = 0',
    ].join('\n');

    expect(Number(floorLiteral(source))).toBe(0);
  });

  it('throws rather than passing vacuously when the floor is gone', () => {
    expect(() => floorLiteral('enum E { static let other = 1.0 }')).toThrow(
      /pass vacuously/
    );
  });

  it('rejects normalization that forwards the total untouched', () => {
    const source =
      'func normalizedBottomInset(for requested: CGFloat, systemInset: CGFloat) -> CGFloat { requested }';

    expect(bodyOf(source, NORMALIZE)).not.toMatch(
      /requested\s*-\s*systemInset/
    );
  });

  it('rejects a subtraction the wrong way round', () => {
    const source =
      'func normalizedBottomInset(for requested: CGFloat, systemInset: CGFloat) -> CGFloat { max(0, systemInset - requested) }';

    expect(bodyOf(source, NORMALIZE)).not.toMatch(
      /requested\s*-\s*systemInset/
    );
  });

  it('rejects a result unfloored at zero', () => {
    const source =
      'func normalizedBottomInset(for requested: CGFloat, systemInset: CGFloat) -> CGFloat { requested - systemInset }';

    expect(bodyOf(source, NORMALIZE)).not.toMatch(/\bmax\s*\(\s*0\s*,/);
  });

  it('rejects an updateNormalizedBottomInset that drops the gate-pinning floor', () => {
    const source =
      'private func updateNormalizedBottomInset() { guard let requested = requestedBottomSafeAreaInset else { return } bottomInsetStore.value = normalizedBottomInset(for: requested, systemInset: safeAreaInsets.bottom) }';

    expect(bodyOf(source, UPDATE)).not.toMatch(/gatePinningInset/);
  });

  it('rejects a floored local that is computed and then discarded', () => {
    const source =
      'private func updateNormalizedBottomInset() { guard let requested = requestedBottomSafeAreaInset else { return } let normalized = max(normalizedBottomInset(for: requested, systemInset: safeAreaInsets.bottom), Self.gatePinningInset) }';

    expect(assignsFlooredValue(bodyOf(source, UPDATE))).toBe(false);
  });

  it('rejects a store write from an unrelated binding', () => {
    const source =
      'private func updateNormalizedBottomInset() { let normalized = max(normalizedBottomInset(for: requested, systemInset: safeAreaInsets.bottom), Self.gatePinningInset) bottomInsetStore.value = requestedBottomSafeAreaInset ?? 0 }';

    expect(assignsFlooredValue(bodyOf(source, UPDATE))).toBe(false);
  });

  it('rejects a guard that lets a non-positive request through', () => {
    const source =
      'let bottomInsetStore: OctopusBottomInsetStore? = { guard let container = containerView as? OctopusEmbeddedContainerView, let requested = bottomSafeAreaInset else { return nil }; container.startNormalizingBottomInset(totalRequested: requested); return container.bottomInsetStore }()';

    expect(embeddedGuardBody(source)).not.toMatch(/requested\s*>\s*0/);
  });

  it('rejects an override that no longer re-normalizes', () => {
    const source = [
      'final class V: UIView {',
      '  override func layoutSubviews() { super.layoutSubviews() }',
      '}',
    ].join('\n');

    expect(reachesUpdate(source, LAYOUT_SUBVIEWS)).toBe(false);
  });

  it('rejects an override whose helper only looks like it re-normalizes', () => {
    const source = [
      'final class V: UIView {',
      '  private func trackBottomSafeArea() { setNeedsLayout() }',
      '  override func layoutSubviews() { super.layoutSubviews(); trackBottomSafeArea() }',
      '}',
    ].join('\n');

    expect(reachesUpdate(source, LAYOUT_SUBVIEWS)).toBe(false);
  });

  it('rejects a container that reads the window instead of itself', () => {
    const source =
      'private func updateNormalizedBottomInset() { guard let requested = requestedBottomSafeAreaInset else { return } bottomInsetStore.value = max(normalizedBottomInset(for: requested, systemInset: window?.safeAreaInsets.bottom ?? 0), Self.gatePinningInset) }';

    expect(systemInsetSource(source)).toMatch(/\bwindow\b/);
  });

  it('rejects a rootView built outside makeHomeScreenView', () => {
    const writes = rootViewWrites(
      'hostingController.rootView = OctopusHomeScreen(octopus: octopus)'
    );

    expect(writes).toHaveLength(1);
    expect(writes[0]).not.toMatch(THROUGH_MAKE_HOME_SCREEN_VIEW);
  });

  it('is not satisfied by a commented-out compliant write', () => {
    const source = [
      '// hostingController.rootView = makeHomeScreenView(octopus: octopus)',
      'hostingController.rootView = OctopusHomeScreen(octopus: octopus)',
    ].join('\n');

    const writes = rootViewWrites(source);
    expect(writes).toHaveLength(1);
    expect(writes[0]).not.toMatch(THROUGH_MAKE_HOME_SCREEN_VIEW);
  });

  it('rejects a store that publishes nothing', () => {
    const source =
      'final class OctopusBottomInsetStore: ObservableObject { var value: CGFloat = 0 }';

    expect(
      typeBody(maskCommentsAndStrings(source), STORE_DECLARATION)
    ).not.toMatch(PUBLISHED_VALUE);
  });

  it('is not satisfied by a commented-out @Published', () => {
    const source =
      'final class OctopusBottomInsetStore: ObservableObject { /* @Published */ var value: CGFloat = 0 }';

    expect(
      typeBody(maskCommentsAndStrings(source), STORE_DECLARATION)
    ).not.toMatch(PUBLISHED_VALUE);
  });

  it('is not satisfied by @Published on a neighbouring property', () => {
    const source =
      'final class OctopusBottomInsetStore: ObservableObject { @Published var other = 0 var value: CGFloat = 0 }';

    expect(
      typeBody(maskCommentsAndStrings(source), STORE_DECLARATION)
    ).not.toMatch(PUBLISHED_VALUE);
  });

  it('rejects an observing host rendered from a constant', () => {
    const source =
      'private func makeHomeScreenView() -> AnyView { let makeScreen = { (inset: CGFloat) in OctopusHomeScreen(bottomSafeAreaInset: 0) }; return AnyView(OctopusBottomInsetHost(store: bottomInsetStore, content: makeScreen)) }';

    expect(insetComesFromObservingHost(source)).toBe(false);
  });

  it('rejects a rootView built without the observing host at all', () => {
    const source =
      'private func makeHomeScreenView(inset: CGFloat) -> AnyView { AnyView(OctopusHomeScreen(bottomSafeAreaInset: inset)) }';

    expect(insetComesFromObservingHost(source)).toBe(false);
  });

  it('rejects a call site that hands the container a hard-coded total', () => {
    expect(
      totalRequestedArgs(
        'container.startNormalizingBottomInset(totalRequested: 70)'
      )[0]
    ).not.toMatch(/\brequested\b/);
  });

  it('rejects a call site that stopped calling the container at all', () => {
    expect(
      totalRequestedArgs('// no longer calling startNormalizingBottomInset')
        .length
    ).toBe(0);
  });
});

// --- MUST PASS: equivalent rewrites must not read as breaks ---------------------------------

describe('MUST PASS — equivalent rewrites still satisfy the guard', () => {
  it('accepts a floor declared without a type annotation', () => {
    expect(Number(floorLiteral('static let gatePinningInset = 0.01'))).toBe(
      0.01
    );
  });

  it('accepts a floor in exponent form', () => {
    expect(
      Number(floorLiteral('static let gatePinningInset: CGFloat = 1e-2'))
    ).toBe(0.01);
  });

  it('accepts a floor with a trailing comment', () => {
    expect(
      Number(
        floorLiteral('static let gatePinningInset: CGFloat = 0.01 // invisible')
      )
    ).toBe(0.01);
  });

  it('accepts max() with its floor argument qualified', () => {
    const source =
      'private func updateNormalizedBottomInset() { bottomInsetStore.value = Swift.max(normalizedBottomInset(for: requested, systemInset: safeAreaInsets.bottom), Self.gatePinningInset) }';

    const body = bodyOf(source, UPDATE);
    expect(body).toMatch(/normalizedBottomInset\s*\(/);
    expect(body).toMatch(/\bmax\s*\(/);
    expect(body).toMatch(/gatePinningInset/);
  });

  it('accepts a guard written as an early-return if', () => {
    const source =
      'let bottomInsetStore: OctopusBottomInsetStore? = { if let container = containerView as? OctopusEmbeddedContainerView, let requested = bottomSafeAreaInset, requested > 0 { container.startNormalizingBottomInset(totalRequested: requested); return container.bottomInsetStore } else { return nil } }()';

    expect(embeddedGuardBody(source)).toMatch(/requested\s*>\s*0/);
  });

  it('accepts an override that re-normalizes through a differently-named helper', () => {
    const source = [
      'final class V: UIView {',
      '  private func syncInset() { updateNormalizedBottomInset() }',
      '  override func layoutSubviews() { super.layoutSubviews(); syncInset() }',
      '}',
    ].join('\n');

    expect(reachesUpdate(source, LAYOUT_SUBVIEWS)).toBe(true);
  });

  it('accepts a `self.`-qualified rootView write split across lines', () => {
    const source = [
      'hostingController?.rootView =',
      '  self.makeHomeScreenView(octopus: octopus)',
    ].join('\n');

    expect(rootViewWrites(source)[0]?.slice(0, 80)).toMatch(
      THROUGH_MAKE_HOME_SCREEN_VIEW
    );
  });

  it('accepts an unqualified rootView write', () => {
    expect(
      rootViewWrites(
        'let c = UIHostingController(rootView: makeHomeScreenView(octopus: o))'
      )[0]
    ).toMatch(THROUGH_MAKE_HOME_SCREEN_VIEW);
  });

  it('does not count a bypassing write that lives in a string literal', () => {
    const source = [
      'let decoy = "hostingController.rootView = OctopusHomeScreen(o)"',
      'hostingController.rootView = makeHomeScreenView(octopus: octopus)',
    ].join('\n');

    const writes = rootViewWrites(source);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatch(THROUGH_MAKE_HOME_SCREEN_VIEW);
  });

  it('does not count a bypassing write inside a nested comment', () => {
    const source = [
      '/* old /* really old */ hostingController.rootView = OctopusHomeScreen(o) */',
      'hostingController.rootView = makeHomeScreenView(octopus: octopus)',
    ].join('\n');

    const writes = rootViewWrites(source);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatch(THROUGH_MAKE_HOME_SCREEN_VIEW);
  });

  it('accepts @Published with an access modifier', () => {
    const source =
      'final class OctopusBottomInsetStore: ObservableObject { @Published private(set) var value: CGFloat = 0 }';

    expect(typeBody(maskCommentsAndStrings(source), STORE_DECLARATION)).toMatch(
      PUBLISHED_VALUE
    );
  });

  it('accepts an inline content closure instead of a named local', () => {
    const source =
      'private func makeHomeScreenView() -> AnyView { AnyView(OctopusBottomInsetHost(store: bottomInsetStore, content: { inset in OctopusHomeScreen(bottomSafeAreaInset: inset) })) }';

    expect(insetComesFromObservingHost(source)).toBe(true);
  });

  it('accepts any name for the closure and its parameter', () => {
    const source =
      'private func makeHomeScreenView() -> AnyView { let renderScreen = { (normalized: CGFloat) in OctopusHomeScreen(theme: theme, bottomSafeAreaInset: normalized, topAppBar: topAppBar) }; return AnyView(OctopusBottomInsetHost(store: store, content: renderScreen)) }';

    expect(insetComesFromObservingHost(source)).toBe(true);
  });

  it('accepts an inlined store write instead of a named local', () => {
    const source =
      'private func updateNormalizedBottomInset() { guard let requested = requestedBottomSafeAreaInset else { return } bottomInsetStore.value = max(normalizedBottomInset(for: requested, systemInset: safeAreaInsets.bottom), Self.gatePinningInset) }';

    expect(assignsFlooredValue(bodyOf(source, UPDATE))).toBe(true);
  });

  it('accepts totalRequested arguments reached through different bindings', () => {
    const source = [
      'container.startNormalizingBottomInset(totalRequested: requested)',
      'someOtherContainer',
      '  .startNormalizingBottomInset(totalRequested: requested)',
    ].join('\n');

    const args = totalRequestedArgs(source);
    expect(args).toHaveLength(2);
    for (const arg of args) {
      expect(arg).toMatch(/\brequested\b/);
    }
  });
});
