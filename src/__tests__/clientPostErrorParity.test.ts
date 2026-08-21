import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Three-way gate on `ClientPostErrorCode`: the TypeScript union, the Kotlin mapper and the
 * Swift mapper have to agree, and the documented "Emitted on" column has to describe what the
 * two native sides actually emit.
 *
 * Same motive as `connectUserErrorParity.test.ts`. A host writes its `catch` against the
 * documented table; a code added on one platform and forgotten on the other is invisible in
 * review — both files compile, both ship, and the host's `switch` silently falls through on
 * one platform only. Here the asymmetry is *expected* (iOS keeps its validation detail
 * internal), which makes an unchecked table even easier to let drift: the gate pins which
 * codes each platform emits, not merely that the sets overlap.
 *
 * Reading the sources as text rather than importing them is the only option — Kotlin and Swift
 * do not run under Jest. Comments are stripped first, so a code *named in prose* (this file's
 * own doc comment included) never counts as an emitted one.
 */

const repoRoot = join(__dirname, '..', '..');
const read = (...segments: string[]) =>
  readFileSync(join(repoRoot, ...segments), 'utf8');

const TS_SOURCE = read('src', 'types', 'clientPostError.ts');
const KOTLIN_BRIDGE = read(
  'android',
  'src',
  'main',
  'java',
  'com',
  'octopuscommunity',
  'octopusreactnativesdk',
  'ClientObjectBridge.kt'
);
const KOTLIN_MODULE = read(
  'android',
  'src',
  'main',
  'java',
  'com',
  'octopuscommunity',
  'octopusreactnativesdk',
  'OctopusReactModule.kt'
);
const SWIFT_MAPPERS = read('ios', 'ClientObjectMappers.swift');
const SWIFT_MODULE = read('ios', 'OctopusReactNativeSdk.swift');

/**
 * Removes `//` and block comments while keeping string literals intact — a naive regex would
 * eat the `//` inside `"android.resource://…"` and take the rest of the line with it.
 * Deliberately small: Kotlin's raw strings and Swift's interpolation are not used in the
 * regions this test reads.
 */
function stripComments(source: string): string {
  let out = '';
  let index = 0;
  let inString: string | null = null;

  while (index < source.length) {
    const char = source[index] as string;
    const next = source[index + 1];

    if (inString !== null) {
      out += char;
      if (char === '\\') {
        out += next ?? '';
        index += 2;
        continue;
      }
      if (char === inString) inString = null;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = char;
      out += char;
      index += 1;
      continue;
    }

    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      index += 2;
      while (index < source.length) {
        if (source[index] === '*' && source[index + 1] === '/') {
          index += 2;
          break;
        }
        index += 1;
      }
      // Keep a newline so line-oriented reading of the result stays sane.
      out += '\n';
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
}

/**
 * Returns the body of the declaration whose signature starts at `signature`, by counting braces
 * on comment-stripped source and skipping over string literals.
 */
function bodyOf(source: string, signature: string): string {
  const stripped = stripComments(source);
  const start = stripped.indexOf(signature);
  expect(start).toBeGreaterThanOrEqual(0);

  const open = stripped.indexOf('{', start);
  expect(open).toBeGreaterThanOrEqual(0);

  let depth = 0;
  let inString: string | null = null;
  for (let index = open; index < stripped.length; index += 1) {
    const char = stripped[index] as string;
    if (inString !== null) {
      if (char === '\\') index += 1;
      else if (char === inString) inString = null;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return stripped.slice(open, index + 1);
    }
  }
  throw new Error(`Unbalanced braces after "${signature}"`);
}

/** Every SCREAMING_SNAKE string literal in `source`, deduplicated. */
function codeLiterals(source: string): Set<string> {
  const codes = new Set<string>();
  for (const match of source.matchAll(/"([A-Z][A-Z0-9_]*)"/g)) {
    codes.add(match[1] as string);
  }
  return codes;
}

const sorted = (values: Iterable<string>) => [...values].sort();

// --- TypeScript: the union and the documented table -------------------------------------

const unionCodes = [
  ...stripComments(TS_SOURCE)
    .slice(stripComments(TS_SOURCE).indexOf('export type ClientPostErrorCode'))
    .matchAll(/'([A-Z][A-Z0-9_]*)'/g),
].map((match) => match[1] as string);

const tableRows = [
  ...TS_SOURCE.matchAll(
    /^\s*\*\s*\|\s*`([A-Z][A-Z0-9_]*)`\s*\|.*\|\s*([^|]+?)\s*\|\s*$/gm
  ),
].map((match) => ({
  code: match[1] as string,
  platforms: (match[2] as string).split(',').map((value) => value.trim()),
}));

const documentedFor = (platform: string) =>
  sorted(
    tableRows
      .filter((row) => row.platforms.includes(platform))
      .map((row) => row.code)
  );

// --- Kotlin and Swift: what each side actually rejects with ------------------------------

// Both entry points of the client-object bridge that can reject: the fetch, and the
// observation start. The union documents the codes of both, so both are read here.
const kotlinCodes = new Set([
  ...codeLiterals(stripComments(KOTLIN_BRIDGE)),
  ...codeLiterals(
    bodyOf(KOTLIN_MODULE, 'fun fetchOrCreateClientObjectRelatedPost')
  ),
  ...codeLiterals(
    bodyOf(KOTLIN_MODULE, 'fun startObservingClientObjectRelatedPost')
  ),
]);

const swiftCodes = new Set([
  ...codeLiterals(stripComments(SWIFT_MAPPERS)),
  ...codeLiterals(
    bodyOf(SWIFT_MODULE, 'func fetchOrCreateClientObjectRelatedPost')
  ),
  ...codeLiterals(
    bodyOf(SWIFT_MODULE, 'func startObservingClientObjectRelatedPost')
  ),
]);

describe('ClientPostErrorCode — source integrity', () => {
  it('found all four sources', () => {
    expect(unionCodes.length).toBeGreaterThan(0);
    expect(tableRows.length).toBeGreaterThan(0);
    expect(kotlinCodes.size).toBeGreaterThan(0);
    expect(swiftCodes.size).toBeGreaterThan(0);
  });

  it('lists each union member exactly once', () => {
    expect(sorted(new Set(unionCodes))).toEqual(sorted(unionCodes));
  });

  it('documents every union member in the table, and nothing else', () => {
    expect(sorted(tableRows.map((row) => row.code))).toEqual(
      sorted(unionCodes)
    );
  });

  it('names only platforms the table is allowed to name', () => {
    for (const row of tableRows) {
      expect(row.platforms.sort()).toEqual(
        row.platforms.filter((value) => value === 'Android' || value === 'iOS')
      );
    }
  });
});

describe('ClientPostErrorCode — Kotlin parity', () => {
  it('emits exactly the codes documented as Android', () => {
    expect(sorted(kotlinCodes)).toEqual(documentedFor('Android'));
  });

  it('emits only codes the union declares', () => {
    expect(
      sorted(kotlinCodes).filter((code) => !unionCodes.includes(code))
    ).toEqual([]);
  });
});

describe('ClientPostErrorCode — Swift parity', () => {
  it('emits exactly the codes documented as iOS', () => {
    expect(sorted(swiftCodes)).toEqual(documentedFor('iOS'));
  });

  it('emits only codes the union declares', () => {
    expect(
      sorted(swiftCodes).filter((code) => !unionCodes.includes(code))
    ).toEqual([]);
  });

  it('is a strict subset of what Android emits, as documented', () => {
    // Not a defect: iOS keeps `ClientPostError.ValidationError`'s fields internal, so the
    // bridge has nothing to classify a content failure with. Pinned so the day iOS opens them
    // up, this test fails and the table gets updated with the codes instead of the wrapper
    // silently keeping the old, lossier mapping.
    for (const code of swiftCodes) expect(kotlinCodes.has(code)).toBe(true);
    expect(swiftCodes.size).toBeLessThan(kotlinCodes.size);
  });
});
