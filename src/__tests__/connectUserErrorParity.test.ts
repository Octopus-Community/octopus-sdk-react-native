import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `connectUser`'s rejection codes are a three-sided contract: the Kotlin companion object, the
 * Swift `ConnectUserBridgeError` initialiser, and the `ConnectUserErrorCode` union JS consumers
 * match on. Nothing at build time links them — a code added on one side only compiles fine and
 * fails at runtime, in a `catch` branch that silently never runs.
 *
 * Extraction runs on text whose COMMENTS ARE STRIPPED but whose STRING LITERALS ARE KEPT: the
 * codes *are* string literals, while the surrounding doc comments (and the TSDoc table) spell
 * every code out in prose. Matching raw text would let a documentation-only mention satisfy this
 * guard while the real mapping had gone missing. The stripper is lexed rather than regexed for
 * the same reason in reverse — `"https://…"` inside live code must not read as a comment, and a
 * `'"'` character literal must not read as the start of a string.
 *
 * Kotlin codes are additionally required to be REFERENCED, not merely declared: CI never
 * compiles the Kotlin, so deleting a `when` branch while leaving its constant behind would
 * otherwise keep this guard green on a code the bridge can no longer emit.
 */

const ROOT = join(__dirname, '..', '..');

const ANDROID_AUTHENTICATOR =
  'android/src/main/java/com/octopuscommunity/octopusreactnativesdk/OctopusSSOAuthenticator.kt';
const IOS_AUTHENTICATOR = 'ios/OctopusSSOAuthenticator.swift';
const TS_CODES = 'src/types/connectUserError.ts';

const readFile = (relativePath: string): string =>
  readFileSync(join(ROOT, relativePath), 'utf8');

/**
 * Blanks out line comments and block comments, including the nesting Kotlin and Swift both
 * allow, while walking over string and character literals so that a delimiter inside one is
 * left alone. Newlines are kept so failures still point at usable line numbers.
 *
 * `blankLiterals` decides what happens to the literals themselves. Code extraction keeps them —
 * they carry the values under test — while the brace matching used to isolate a function body
 * blanks their contents, so a `{` inside a string cannot desynchronise the nesting count.
 */
const lex = (source: string, { blankLiterals = false } = {}): string => {
  const out = source.split('');
  const blank = (from: number, to: number): void => {
    for (let i = from; i < to && i < out.length; i += 1) {
      if (out[i] !== '\n') out[i] = ' ';
    }
  };

  /**
   * Index just past a literal opened at `start` by `quote`, honouring backslash escapes.
   *
   * An unterminated literal is a hard failure rather than a silent walk to the end of the file:
   * running off the end would leave every declaration after it unlexed, and the extractors would
   * report a short list — i.e. a missing code — as parity.
   */
  const skipLiteral = (start: number, quote: string): number => {
    let j = start + 1;
    while (j < source.length && source[j] !== quote) {
      if (source[j] === '\\') j += 1;
      j += 1;
    }
    if (j >= source.length) {
      const line = source.slice(0, start).split('\n').length;
      throw new Error(
        `Unterminated ${quote} literal at line ${line}: the parity guard cannot lex this file, ` +
          'so its result would be meaningless. Fix the source or the lexer.'
      );
    }
    return j + 1;
  };

  let i = 0;
  while (i < source.length) {
    if (source.startsWith('"""', i)) {
      const end = source.indexOf('"""', i + 3);
      if (end === -1) {
        throw new Error(
          `Unterminated """ literal at line ${source.slice(0, i).split('\n').length}: ` +
            'the parity guard cannot lex this file, so its result would be meaningless.'
        );
      }
      if (blankLiterals) blank(i + 3, end);
      i = end + 3;
    } else if (source[i] === '"') {
      const next = skipLiteral(i, '"');
      if (blankLiterals) blank(i + 1, next - 1);
      i = next;
    } else if (source[i] === "'") {
      // Kotlin character literals (`'"'`, `'\''`) and TS single-quoted strings alike: skipping
      // them keeps their text intact for extraction while stopping a quote inside one from
      // desynchronising every literal that follows.
      const next = skipLiteral(i, "'");
      if (blankLiterals) blank(i + 1, next - 1);
      i = next;
    } else if (source.startsWith('//', i)) {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      blank(i, stop);
      i = stop;
    } else if (source.startsWith('/*', i)) {
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
      blank(i, j);
      i = j;
    } else {
      i += 1;
    }
  }

  return out.join('');
};

const stripComments = (source: string): string => lex(source);

/**
 * The body of the declaration `header` matches, braces balanced, comments and literal contents
 * removed.
 *
 * Isolating the body is what turns "the file mentions this somewhere" into "this function does
 * it": a constant can be declared and a helper can exist while nothing applies them, which is
 * precisely the shape that reinstates a never-settling promise.
 */
const extractBody = (source: string, header: RegExp): string | null => {
  const lexed = lex(source, { blankLiterals: true });
  const match = header.exec(lexed);
  if (match === null) return null;

  const open = lexed.indexOf('{', match.index);
  if (open === -1) return null;

  let depth = 0;
  for (let i = open; i < lexed.length; i += 1) {
    if (lexed[i] === '{') depth += 1;
    else if (lexed[i] === '}') {
      depth -= 1;
      if (depth === 0) return lexed.slice(open + 1, i);
    }
  }
  return null;
};

/**
 * Index of the delimiter closing the one at `open`, or `-1` when the text runs out first.
 *
 * An unbalanced run reads as absent rather than as "everything to the end": a truncated argument
 * or block would be handed to the caller as if it were the real thing.
 */
const closingIndex = (
  text: string,
  open: number,
  openChar: string,
  closeChar: string
): number => {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === openChar) depth += 1;
    else if (text[i] === closeChar) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
};

/**
 * The argument text of the first `callee(…)` call in `body`, parentheses balanced so a nested
 * call comes back whole. `null` when the call is absent or never closes.
 *
 * FIRST match, deliberately: a body is expected to make the call it is asserted about once. What
 * makes that safe is not this function but the header-uniqueness test below, which requires every
 * pattern handed to an extractor to match exactly once in its source — otherwise a decoy inserted
 * above the real declaration would silently redirect every assertion onto itself.
 *
 * Meant for bodies produced by {@link extractBody}, whose string interiors are already blanked —
 * a parenthesis inside a literal therefore cannot unbalance the scan. Fed raw source instead, the
 * scan desynchronises and the call reads as unterminated; `code extraction` pins both directions.
 */
const extractCallArgument = (body: string, callee: RegExp): string | null => {
  const match = callee.exec(body);
  if (match === null) return null;
  const open = body.indexOf('(', match.index);
  if (open === -1) return null;
  const close = closingIndex(body, open, '(', ')');
  return close === -1 ? null : body.slice(open + 1, close);
};

/**
 * The trailing-lambda block of the first `callee(…) { … }` call in `body`, or `null` when the call
 * wraps no block at all.
 *
 * Asserting the argument proves what the bound *is*; this proves what it *bounds*. A
 * `withTimeout(TOKEN_REQUEST_TIMEOUT_MS) { }` around an empty block, with the real suspension
 * moved out after it, satisfies every assertion about the argument while bounding nothing.
 *
 * Only whitespace may sit between the closing parenthesis and the brace, so an unrelated call
 * that merely happens to be followed by a block elsewhere is not mistaken for the wrapped one.
 */
const extractTrailingBlock = (body: string, callee: RegExp): string | null => {
  const match = callee.exec(body);
  if (match === null) return null;
  const open = body.indexOf('(', match.index);
  if (open === -1) return null;
  const close = closingIndex(body, open, '(', ')');
  if (close === -1) return null;

  const brace = body.indexOf('{', close);
  if (brace === -1 || body.slice(close + 1, brace).trim() !== '') return null;
  const end = closingIndex(body, brace, '{', '}');
  return end === -1 ? null : body.slice(brace + 1, end);
};

/**
 * `argument` minus a leading parameter label — Kotlin's `timeMillis = …`, Swift's `nanoseconds: …`.
 *
 * Any identifier is accepted rather than an allowlist, because the label differs per platform and
 * per overload. The widening is safe here only because the caller compares the resulting *value*
 * against the declared constant: an over-strip yields either the same number or an expression that
 * no longer parses, and an unparsable expression fails. The same widening under a `toContain`
 * would be undetectable, which is why no assertion below matches on text.
 */
const stripArgumentLabel = (argument: string): string =>
  argument.trim().replace(/^[A-Za-z_][A-Za-z0-9_]*\s*(?::|=(?!=))\s*/, '');

const matchAll = (source: string, pattern: RegExp): string[] =>
  [...source.matchAll(pattern)].map((match) => match[1] as string);

/** Whether `name` appears somewhere other than the single declaration that introduces it. */
const isUsedBeyondItsDeclaration = (code: string, name: string): boolean =>
  (code.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length > 1;

/**
 * Codes declared as `const val CODE_… = "…"` in the Kotlin companion object **and** referenced
 * elsewhere in the file, since a constant nothing rejects with is a code the bridge cannot emit.
 */
const extractKotlinCodes = (source: string): string[] => {
  const code = stripComments(source);
  return [
    ...code.matchAll(/const\s+val\s+(CODE_[A-Z0-9_]+)\s*=\s*"([A-Z0-9_]+)"/g),
  ]
    .filter((match) => isUsedBeyondItsDeclaration(code, match[1] as string))
    .map((match) => match[2] as string);
};

/** Codes assigned to `code` inside the Swift error mapping. */
const extractSwiftCodes = (source: string): string[] =>
  matchAll(stripComments(source), /\bcode\s*=\s*"([A-Z0-9_]+)"/g);

/**
 * Members of the `ConnectUserErrorCode` union only. Bounded to the declaration so the TSDoc
 * table above it — which lists every code in prose — cannot stand in for the type.
 */
const extractTsCodes = (source: string): string[] => {
  const declaration = /export type ConnectUserErrorCode\s*=([\s\S]*?);/.exec(
    stripComments(source)
  );
  if (declaration === null) return [];
  return matchAll(declaration[1] as string, /'([A-Z0-9_]+)'/g);
};

/** The bridge's token-request timeout, in milliseconds, as each platform spells it. */
const extractTimeoutMs = (source: string, pattern: RegExp): number | null => {
  const match = pattern.exec(stripComments(source));
  if (match === null) return null;
  return Number((match[1] as string).replace(/_/g, ''));
};

const KOTLIN_TIMEOUT = /TOKEN_REQUEST_TIMEOUT_MS\s*=\s*([0-9_]+)L?/;
const SWIFT_TIMEOUT = /tokenRequestTimeoutMilliseconds[^=\n]*=\s*([0-9_]+)/;

/**
 * Every value binding in `source`, as the *expression* it is bound to rather than a number, so
 * {@link evaluateBoundNanoseconds} can both fold it and report what it was resolved through.
 *
 * Kotlin's `const val`, Swift's `static let` and a plain local `val`/`let` are all collected the
 * same way: a bound hoisted into a local, derived into a second constant, or moved to the
 * companion object is the same bound, and none of those rewrites should read as a regression.
 *
 * A name bound twice is dropped rather than guessed at. That leaves it unresolvable, which fails
 * whichever assertion consults it — the safe direction, since the alternative is silently
 * asserting about the wrong binding.
 */
const collectConstants = (source: string): Map<string, string> => {
  const bindings = new Map<string, Set<string>>();
  const declaration =
    /\b(?:val|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::[^=\n]*)?=\s*([^\n]+)/g;
  for (const match of stripComments(source).matchAll(declaration)) {
    const name = match[1] as string;
    const existing = bindings.get(name) ?? new Set<string>();
    existing.add((match[2] as string).trim());
    bindings.set(name, existing);
  }

  const constants = new Map<string, string>();
  for (const [name, expressions] of bindings) {
    if (expressions.size === 1) {
      constants.set(name, [...expressions][0] as string);
    }
  }
  return constants;
};

/** Duration suffixes both platforms spell the same way, in nanoseconds. */
const DURATION_UNIT_NANOSECONDS: Readonly<Record<string, number>> = {
  nanoseconds: 1,
  microseconds: 1_000,
  milliseconds: 1_000_000,
  seconds: 1_000_000_000,
  minutes: 60_000_000_000,
};

const NUMBER_TOKEN = /^[0-9][0-9_]*(?:[uU]?[lL])?$/;
const IDENT_TOKEN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * `expression` split into numbers, identifiers and the arithmetic symbols this evaluator folds.
 *
 * `null` for anything else — a comma, a comparison, an operator not listed. Refusing to tokenise
 * is how `min(1, TIMEOUT)` and friends end up unevaluated, and an unevaluated bound fails.
 */
const tokenise = (expression: string): string[] | null => {
  const tokens: string[] = [];
  let i = 0;
  while (i < expression.length) {
    const rest = expression.slice(i);
    const whitespace = /^\s+/.exec(rest);
    if (whitespace !== null) {
      i += whitespace[0].length;
      continue;
    }
    const number = /^[0-9][0-9_]*(?:[uU]?[lL])?/.exec(rest);
    if (number !== null) {
      tokens.push(number[0]);
      i += number[0].length;
      continue;
    }
    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
    if (identifier !== null) {
      tokens.push(identifier[0]);
      i += identifier[0].length;
      continue;
    }
    const symbol = rest[0] as string;
    if (!'+-*/().'.includes(symbol)) return null;
    tokens.push(symbol);
    i += 1;
  }
  return tokens;
};

/**
 * A folded expression. `united` marks a value already carried to nanoseconds by an explicit
 * duration suffix, so the caller must not scale it again by the unit its call site implies.
 */
type ParsedBound = { value: number; united: boolean; references: string[] };

/**
 * Folds `expression` against `constants`, recording every constant it resolved through.
 *
 * Integer truncation is not modelled — `TIMEOUT / 1_000_000` folds to a fraction here where Swift
 * would give 0. Both are wrong against the declared bound, so the mutation fails either way, and
 * pretending to model a language's integer semantics in a text guard would be the bigger lie.
 */
const parseBound = (
  expression: string,
  constants: ReadonlyMap<string, string>,
  resolving: readonly string[]
): ParsedBound | null => {
  const tokens = tokenise(expression);
  if (tokens === null || tokens.length === 0) return null;

  let at = 0;
  const references: string[] = [];
  const peek = (offset = 0): string | undefined => tokens[at + offset];

  const resolve = (name: string): ParsedBound | null => {
    const definition = constants.get(name);
    // A name that resolves through itself is a definition this guard cannot fold, not a bound.
    if (definition === undefined || resolving.includes(name)) return null;
    references.push(name);
    const resolved = parseBound(definition, constants, [...resolving, name]);
    if (resolved === null) return null;
    references.push(...resolved.references);
    return { value: resolved.value, united: resolved.united, references: [] };
  };

  const parseUnit = (bound: ParsedBound | null): ParsedBound | null => {
    if (bound === null) return null;
    const unit = peek(1);
    if (
      peek() !== '.' ||
      unit === undefined ||
      !(unit in DURATION_UNIT_NANOSECONDS)
    ) {
      return bound;
    }
    if (bound.united) return null;
    at += 2;
    return {
      value: bound.value * (DURATION_UNIT_NANOSECONDS[unit] as number),
      united: true,
      references: [],
    };
  };

  const parsePrimary = (): ParsedBound | null => {
    const token = peek();
    if (token === undefined) return null;
    if (token === '(') {
      at += 1;
      const inner = parseSum();
      if (inner === null || peek() !== ')') return null;
      at += 1;
      return parseUnit(inner);
    }
    if (token === '-') {
      at += 1;
      const inner = parsePrimary();
      if (inner === null || inner.united) return null;
      return { value: -inner.value, united: false, references: [] };
    }
    if (NUMBER_TOKEN.test(token)) {
      at += 1;
      return parseUnit({
        value: Number(token.replace(/[_uUlL]/g, '')),
        united: false,
        references: [],
      });
    }
    if (IDENT_TOKEN.test(token)) {
      // A qualified name resolves on its LAST segment: once the bound leaves the class that
      // declares it, the call site has to write `Companion.TOKEN_REQUEST_TIMEOUT_MS` or
      // `Self.tokenRequestTimeoutMilliseconds` for the same constant. A duration suffix is left
      // behind for `parseUnit` rather than swallowed as another segment.
      let name = token;
      at += 1;
      while (peek() === '.') {
        const next = peek(1);
        if (
          next === undefined ||
          !IDENT_TOKEN.test(next) ||
          next in DURATION_UNIT_NANOSECONDS
        ) {
          break;
        }
        name = next;
        at += 2;
      }
      return parseUnit(resolve(name));
    }
    return null;
  };

  // A duration is not a number: folding one into arithmetic would need unit algebra this guard
  // has no reason to own, so a mixed expression is refused rather than approximated.
  const combine = (
    left: ParsedBound | null,
    right: ParsedBound | null,
    apply: (a: number, b: number) => number
  ): ParsedBound | null =>
    left === null || right === null || left.united || right.united
      ? null
      : {
          value: apply(left.value, right.value),
          united: false,
          references: [],
        };

  const parseProduct = (): ParsedBound | null => {
    let left = parsePrimary();
    while (left !== null && (peek() === '*' || peek() === '/')) {
      const operator = peek();
      at += 1;
      left = combine(left, parsePrimary(), (a, b) =>
        operator === '*' ? a * b : a / b
      );
    }
    return left;
  };

  function parseSum(): ParsedBound | null {
    let left = parseProduct();
    while (left !== null && (peek() === '+' || peek() === '-')) {
      const operator = peek();
      at += 1;
      left = combine(left, parseProduct(), (a, b) =>
        operator === '+' ? a + b : a - b
      );
    }
    return left;
  }

  const result = parseSum();
  // Trailing tokens mean the expression was only partly understood, which is not understood.
  if (result === null || at !== tokens.length) return null;
  return { value: result.value, united: result.united, references };
};

/** A folded call argument: what the bridge actually waits, and what it got there through. */
type EvaluatedBound = { nanoseconds: number; references: string[] };

/**
 * The effective value of a timeout call's argument, in nanoseconds.
 *
 * `implicitUnit` is the unit a bare number carries at that call site — milliseconds for Kotlin's
 * `withTimeout(Long)`, nanoseconds for `Task.sleep(nanoseconds:)`. An explicit duration suffix
 * overrides it.
 *
 * Asserting on this rather than on the argument's spelling is what closes both halves at once: an
 * arithmetic bypass that reads as bounded folds to the wrong number, and a legitimate rewrite that
 * reads as unfamiliar folds to the right one.
 */
const evaluateBoundNanoseconds = (
  argument: string,
  constants: ReadonlyMap<string, string>,
  implicitUnit: 'milliseconds' | 'nanoseconds'
): EvaluatedBound | null => {
  const parsed = parseBound(stripArgumentLabel(argument), constants, []);
  if (parsed === null) return null;
  return {
    nanoseconds: parsed.united
      ? parsed.value
      : parsed.value * (DURATION_UNIT_NANOSECONDS[implicitUnit] as number),
    references: parsed.references,
  };
};

/** Callables named in a body — lowercase-initial, the convention both bridges follow. */
const CALLEE = /\b([a-z][A-Za-z0-9_]*)\s*\(/g;
const NOT_A_HELPER = new Set([
  'if',
  'for',
  'while',
  'guard',
  'switch',
  'when',
  'catch',
  'return',
  'try',
  'await',
  'defer',
  'self',
  'super',
]);

/** The body of `name`, but only when exactly one declaration in `source` could be meant. */
const findUniqueFunctionBody = (
  source: string,
  name: string
): string | null => {
  const header = `func\\s+${name}\\s*\\(`;
  const declarations = [
    ...stripComments(source).matchAll(new RegExp(header, 'g')),
  ];
  if (declarations.length !== 1) return null;
  return extractBody(source, new RegExp(header));
};

/**
 * Whether `body` matches `pattern`, directly or through a helper it calls.
 *
 * Bounded to two hops and to helpers declared exactly once in `source`. Without it, routing both
 * answer paths through a single `answer(_:with:)`, or factoring an error construction into a
 * `timeoutError()`, would read as the work having disappeared. With it, the work still has to be
 * somewhere reachable — an ambiguous or missing helper resolves to nothing.
 */
const reaches = (
  source: string,
  body: string,
  pattern: RegExp,
  depth = 2
): boolean => {
  if (pattern.test(body)) return true;
  if (depth === 0) return false;
  for (const match of body.matchAll(CALLEE)) {
    const name = match[1] as string;
    if (NOT_A_HELPER.has(name)) continue;
    const helper = findUniqueFunctionBody(source, name);
    if (
      helper !== null &&
      helper !== body &&
      reaches(source, helper, pattern, depth - 1)
    ) {
      return true;
    }
  }
  return false;
};

const androidSource = readFile(ANDROID_AUTHENTICATOR);
const iosSource = readFile(IOS_AUTHENTICATOR);
const androidCodes = extractKotlinCodes(androidSource);
const iosCodes = extractSwiftCodes(iosSource);
const tsCodes = extractTsCodes(readFile(TS_CODES));
const androidConstants = collectConstants(androidSource);
const iosConstants = collectConstants(iosSource);
const androidTimeout = extractTimeoutMs(androidSource, KOTLIN_TIMEOUT);
const iosTimeout = extractTimeoutMs(iosSource, SWIFT_TIMEOUT);

/**
 * Every pattern an extractor anchors on, against the source it is anchored in.
 *
 * `extractBody`, `extractCallArgument` and `extractTrailingBlock` all take the FIRST match, so a
 * second declaration matching the same pattern redirects every assertion built on it — insert a
 * decoy `settle` above the real one and the real one is free to stop cancelling its timer, with
 * this file none the wiser. One test requires each entry to match exactly once, which retires that
 * whole class of bypass instead of one decoy at a time; anchoring a new assertion means adding its
 * pattern here.
 */
const HEADERS = {
  androidRequest: {
    source: ANDROID_AUTHENTICATOR,
    pattern: /suspend\s+fun\s+requestTokenFromRN\s*\(/,
  },
  androidDisconnect: {
    source: ANDROID_AUTHENTICATOR,
    pattern: /fun\s+disconnectUser\s*\(/,
  },
  // `withTimeoutOrNull` is the same bound with a different failure shape, so the pattern admits
  // it: what this file polices is the value waited, not which overload expresses it.
  androidTimeoutCall: {
    source: ANDROID_AUTHENTICATOR,
    pattern: /\bwithTimeout(?:OrNull)?\s*\(/,
  },
  iosRequest: {
    source: IOS_AUTHENTICATOR,
    pattern: /func\s+requestTokenFromRN\s*\(/,
  },
  iosSettle: { source: IOS_AUTHENTICATOR, pattern: /func\s+settle\s*\(/ },
  iosDisconnect: {
    source: IOS_AUTHENTICATOR,
    pattern: /func\s+disconnectUser\s*\(/,
  },
  iosTimer: {
    source: IOS_AUTHENTICATOR,
    pattern: /func\s+failTokenRequestOnTimeout\s*\(/,
  },
  iosComplete: {
    source: IOS_AUTHENTICATOR,
    pattern: /func\s+completeTokenRequest\s*\(/,
  },
  iosCancel: {
    source: IOS_AUTHENTICATOR,
    pattern: /func\s+cancelTokenRequest\s*\(/,
  },
  iosSleepCall: { source: IOS_AUTHENTICATOR, pattern: /Task\.sleep\s*\(/ },
} as const;

describe('connectUser error codes', () => {
  // Guards the guard: three empty lists compare equal, so an extractor broken by a refactor
  // would report perfect parity instead of failing.
  it('extracts a plausible set of codes from each side', () => {
    expect(androidCodes.length).toBeGreaterThanOrEqual(5);
    expect(iosCodes.length).toBeGreaterThanOrEqual(5);
    expect(tsCodes.length).toBeGreaterThanOrEqual(5);
  });

  it('declares no duplicate code on the sides where a duplicate is a mistake', () => {
    // A repeated Kotlin constant or union member is a copy-paste slip. Swift is deliberately
    // exempt: several `switch` branches may legitimately map onto the same code, and the guard
    // must not stand in the way of splitting one branch in two.
    expect(new Set(androidCodes).size).toBe(androidCodes.length);
    expect(new Set(tsCodes).size).toBe(tsCodes.length);
  });

  it('reports a ban and a generic failure on both platforms', () => {
    // USER_BANNED is the one code carrying a displayable backend message, and
    // CONNECT_USER_ERROR is the fallback every unclassified failure lands on. A platform
    // missing either has no way to express the two outcomes that matter most.
    for (const code of ['USER_BANNED', 'CONNECT_USER_ERROR']) {
      expect(androidCodes).toContain(code);
      expect(iosCodes).toContain(code);
      expect(tsCodes).toContain(code);
    }
  });

  it('bounds an unanswered token request on both platforms', () => {
    // Without this code on a platform, that platform has no way to end a `connectUser` whose
    // token request nobody answered — the promise would never settle.
    for (const code of ['TOKEN_REQUEST_TIMEOUT']) {
      expect(androidCodes).toContain(code);
      expect(iosCodes).toContain(code);
      expect(tsCodes).toContain(code);
    }
  });

  it('rejects only with codes the TS union declares', () => {
    expect(androidCodes.filter((code) => !tsCodes.includes(code))).toEqual([]);
    expect(iosCodes.filter((code) => !tsCodes.includes(code))).toEqual([]);
  });

  it('declares no TS code that neither platform can emit', () => {
    const emitted = new Set([...androidCodes, ...iosCodes]);
    expect(tsCodes.filter((code) => !emitted.has(code))).toEqual([]);
  });
});

describe('token request timeout', () => {
  it('is declared on both platforms', () => {
    expect(androidTimeout).not.toBeNull();
    expect(iosTimeout).not.toBeNull();
    expect(androidTimeout).toBeGreaterThan(0);
  });

  it('is the same on both platforms', () => {
    // Documented to consumers as a single number, so a one-sided edit would make the README
    // wrong on one platform without breaking any build.
    expect(iosTimeout).toBe(androidTimeout);
  });

  it('reads a value regardless of digit grouping and suffix', () => {
    expect(
      extractTimeoutMs(
        'const val TOKEN_REQUEST_TIMEOUT_MS = 60_000L',
        KOTLIN_TIMEOUT
      )
    ).toBe(60000);
    expect(
      extractTimeoutMs(
        'static let tokenRequestTimeoutMilliseconds: UInt64 = 60_000',
        SWIFT_TIMEOUT
      )
    ).toBe(60000);
  });

  it('ignores a timeout mentioned only in a comment', () => {
    expect(
      extractTimeoutMs('// TOKEN_REQUEST_TIMEOUT_MS = 1L', KOTLIN_TIMEOUT)
    ).toBeNull();
  });
});

/**
 * A declared timeout bounds nothing on its own. Each assertion below is one way the bridge could
 * keep both constants, keep every code, keep this file green — and still leave a `connectUser`
 * promise pending forever, or leave a timer asleep after the request was answered. They read the
 * body of the function that must do the work, not the file at large.
 */
describe('the timeout is applied, not merely declared', () => {
  const androidRequest = extractBody(
    androidSource,
    HEADERS.androidRequest.pattern
  );
  const iosRequest = extractBody(iosSource, HEADERS.iosRequest.pattern);
  const iosSettle = extractBody(iosSource, HEADERS.iosSettle.pattern);
  const androidDisconnect = extractBody(
    androidSource,
    HEADERS.androidDisconnect.pattern
  );
  const iosDisconnect = extractBody(iosSource, HEADERS.iosDisconnect.pattern);

  it('anchors every extractor on a pattern that matches exactly once', () => {
    // Guards the guard, independently of what any single assertion checks: every extractor takes
    // the first match, so a decoy declaration inserted above the real one would capture the lot.
    // Failing here names the ambiguous anchor rather than the assertion that quietly moved.
    const sources: Record<string, string> = {
      [ANDROID_AUTHENTICATOR]: stripComments(androidSource),
      [IOS_AUTHENTICATOR]: stripComments(iosSource),
    };
    for (const [name, { source, pattern }] of Object.entries(HEADERS)) {
      const matches = [
        ...(sources[source] as string).matchAll(
          new RegExp(pattern.source, 'g')
        ),
      ];
      expect([name, matches.length]).toEqual([name, 1]);
    }
  });

  it('locates every body it goes on to assert about', () => {
    // Guards the guard: a rename would otherwise turn each assertion below into a silent pass on
    // an empty string.
    for (const body of [
      androidRequest,
      iosRequest,
      iosSettle,
      androidDisconnect,
      iosDisconnect,
    ]) {
      expect(body).not.toBeNull();
      expect((body as string).length).toBeGreaterThan(20);
    }
  });

  it('waits exactly the declared timeout on Android, however it is spelled', () => {
    // Without a bound, `suspendCancellableCoroutine` waits for a JS answer that may never come.
    // Merely mentioning the constant would also admit `TOKEN_REQUEST_TIMEOUT_MS * 100_000` — a
    // wait of some seventy days, which reads as bounded and behaves as if it were not — while
    // rejecting the `Duration` overload, a hoisted local and a `Companion.`-qualified reference,
    // which are the same bound written differently. Folding the argument to a value settles both:
    // what is asserted is the number of nanoseconds the coroutine actually waits, and that it got
    // there through the constant the README documents rather than through a literal.
    const argument = extractCallArgument(
      androidRequest ?? '',
      HEADERS.androidTimeoutCall.pattern
    );
    expect(argument).not.toBeNull();

    const bound = evaluateBoundNanoseconds(
      argument as string,
      androidConstants,
      'milliseconds'
    );
    expect(bound).not.toBeNull();
    expect((bound as EvaluatedBound).references).toContain(
      'TOKEN_REQUEST_TIMEOUT_MS'
    );
    expect(androidTimeout).not.toBeNull();
    expect((bound as EvaluatedBound).nanoseconds).toBe(
      (androidTimeout as number) * 1_000_000
    );
  });

  it('runs the Android wait inside the bound rather than beside it', () => {
    // The argument assertion above proves what the bound is, not what it bounds:
    // `withTimeout(TOKEN_REQUEST_TIMEOUT_MS) { }` around an empty block, with the real
    // `suspendCancellableCoroutine` moved out after it, keeps every value assertion green while
    // the wait it was supposed to bound runs unbounded.
    const bounded = extractTrailingBlock(
      androidRequest ?? '',
      HEADERS.androidTimeoutCall.pattern
    );
    expect(bounded).not.toBeNull();
    expect(bounded).toContain('suspendCancellableCoroutine');
  });

  it('arms the iOS timer from the request that needs bounding', () => {
    // `failTokenRequestOnTimeout` can exist, reference the constant, and never be called.
    expect(iosRequest).toContain('failTokenRequestOnTimeout');
  });

  it('makes the armed iOS timer actually elapse and claim its request', () => {
    // The call site above proves only that the timer is armed. Gut this body and
    // `attachTimeoutTask` records a task that returns at once: nothing ever elapses, and an
    // unanswered request hangs for good while every assertion about the call site still passes.
    const timer = extractBody(iosSource, HEADERS.iosTimer.pattern);
    expect(timer).not.toBeNull();
    expect(timer).toContain('takePendingTokenRequest');
    // Through one hop, so factoring the construction into a `timeoutError()` helper stays legal
    // while deleting it does not.
    expect(
      reaches(iosSource, timer as string, /\bTokenRequestTimeoutError\b/)
    ).toBe(true);

    // The sleep's own argument, not merely the body: the constant also appears in the error this
    // function raises, so a sleep that mentions it and still elapses at once — `* 0`,
    // `/ 1_000_000`, `min(1, …)` — would keep every other assertion green while firing the
    // timeout instantly on every request, which is the mirror image of the bug this file guards.
    // Arithmetic is legitimate here (the constant is in milliseconds, `Task.sleep` wants
    // nanoseconds), so the argument is folded and the result compared, not read.
    const sleep = extractCallArgument(
      timer as string,
      HEADERS.iosSleepCall.pattern
    );
    expect(sleep).not.toBeNull();

    const bound = evaluateBoundNanoseconds(
      sleep as string,
      iosConstants,
      'nanoseconds'
    );
    expect(bound).not.toBeNull();
    expect((bound as EvaluatedBound).references).toContain(
      'tokenRequestTimeoutMilliseconds'
    );
    expect(iosTimeout).not.toBeNull();
    expect((bound as EvaluatedBound).nanoseconds).toBe(
      (iosTimeout as number) * 1_000_000
    );
  });

  it('answers every iOS request through the path that releases its timer', () => {
    // `settle` is what cancels the timer. Resuming a continuation directly instead leaves a task
    // sleeping for the rest of the timeout on every answered request — the regression this file
    // exists to prevent, invisible to an assertion that only reads `settle`'s own body. Reached
    // through helpers, so routing both paths via one `answer(_:with:)` is not a regression; the
    // pattern-uniqueness test above is what stops a decoy `settle` from absorbing the assertion.
    for (const header of [HEADERS.iosComplete, HEADERS.iosCancel]) {
      const body = extractBody(iosSource, header.pattern);
      expect(body).not.toBeNull();
      expect(reaches(iosSource, body as string, /\bsettle\s*\(/)).toBe(true);
    }
  });

  it('releases the iOS timer when a request is answered', () => {
    // Otherwise every answered request leaves a task sleeping for the rest of the timeout.
    expect(iosSettle).toMatch(/timeoutTask\??\.cancel\(/);
  });

  it('settles the requests still pending when the user disconnects', () => {
    expect(androidDisconnect).toContain('pendingTokenRequests');
    expect(iosDisconnect).toContain('takeAllPendingTokenRequests');
  });
});

describe('code extraction', () => {
  // MUST PASS — equivalent rewrites of the same declarations must still be seen.
  it('reads Kotlin declarations regardless of spacing', () => {
    expect(
      extractKotlinCodes(
        'const val CODE_A="ONE"\n  const   val  CODE_B = "TWO"\nuse(CODE_A, CODE_B)'
      )
    ).toEqual(['ONE', 'TWO']);
  });

  it('reads Swift assignments regardless of spacing and order', () => {
    expect(extractSwiftCodes('code="TWO"\ncode = "ONE"')).toEqual([
      'TWO',
      'ONE',
    ]);
  });

  it('reads a union whose members are laid out on one line', () => {
    expect(
      extractTsCodes("export type ConnectUserErrorCode = 'ONE' | 'TWO';")
    ).toEqual(['ONE', 'TWO']);
  });

  it('keeps reading live code that follows a URL in a string', () => {
    // A naive `//` strip would blank the rest of this line and hide the declaration.
    expect(
      extractKotlinCodes(
        'val url = "https://x.test"; const val CODE_A = "ONE"; use(CODE_A)'
      )
    ).toEqual(['ONE']);
  });

  it('keeps reading live code that follows a quote character literal', () => {
    // `'"'` is legal Kotlin. Treating its inner quote as a string opener swallows the real
    // declaration and silently pairs the quotes of everything after it.
    expect(
      extractKotlinCodes(
        'val q = \'"\'; const val CODE_A = "ONE"; use(CODE_A)\nconst val CODE_B = "TWO"; use(CODE_B)'
      )
    ).toEqual(['ONE', 'TWO']);
    // Swift has no single-quoted literal, so its exposure is the mirror case: an apostrophe
    // inside a string must not open one either.
    expect(extractSwiftCodes('let s = "don\'t"\ncode = "ONE"')).toEqual([
      'ONE',
    ]);
  });

  // MUST FAIL — a mention that is not a real, reachable declaration must not count.
  it('ignores codes mentioned only in a line comment', () => {
    expect(
      extractKotlinCodes('// const val CODE_A = "ONE"\nuse(CODE_A)')
    ).toEqual([]);
    expect(extractSwiftCodes('// code = "ONE"')).toEqual([]);
  });

  it('ignores codes mentioned only in a doc comment, including a nested one', () => {
    expect(
      extractKotlinCodes('/** /* CODE_A */ const val CODE_A = "ONE" */')
    ).toEqual([]);
    expect(extractSwiftCodes('/** table: `code = "ONE"` */')).toEqual([]);
  });

  it('ignores union members documented above the declaration', () => {
    expect(
      extractTsCodes(
        "/** | 'GHOST' | doc only | */\nexport type ConnectUserErrorCode = 'ONE';"
      )
    ).toEqual(['ONE']);
  });

  it('ignores a code string that is not a declaration', () => {
    expect(extractKotlinCodes('promise.reject("ONE", message)')).toEqual([]);
    expect(extractSwiftCodes('reject("ONE", message, nil)')).toEqual([]);
  });

  it('ignores a Kotlin constant nothing rejects with', () => {
    // The state left behind by deleting a mapping branch: the constant still parses, no
    // Kotlin is compiled in CI, and only its absence from the rejection sites gives it away.
    expect(
      extractKotlinCodes(
        'const val CODE_A = "ONE"\nconst val CODE_B = "TWO"\npromise.reject(CODE_A, m, null)'
      )
    ).toEqual(['ONE']);
  });

  it('does not count a reference that only appears in a comment', () => {
    expect(
      extractKotlinCodes('const val CODE_A = "ONE"\n// see CODE_A for details')
    ).toEqual([]);
  });

  it('returns nothing when the union is renamed away', () => {
    expect(extractTsCodes("export type SomethingElse = 'ONE';")).toEqual([]);
  });

  // MUST PASS — body isolation must survive the shapes the real sources already use.
  it('reads a body containing nested braces and stops at its own end', () => {
    expect(
      extractBody(
        'fun f() {\n  g { h() }\n}\nfun after() { boom() }',
        /fun\s+f\s*\(/
      )
    ).toBe('\n  g { h() }\n');
  });

  it('reads a body whose header is spread over several lines', () => {
    expect(
      extractBody(
        'func settle(\n  _ p: P,\n  with r: R\n) {\n  p.cancel()\n}',
        /func\s+settle\s*\(/
      )
    ).toContain('p.cancel()');
  });

  it('is not ended early by a brace inside a string', () => {
    // The literal contents are blanked for brace matching, so `"}"` cannot close the body.
    expect(
      extractBody('fun f() {\n  log("}")\n  real()\n}', /fun\s+f\s*\(/)
    ).toContain('real()');
  });

  // MUST PASS — argument isolation must survive the shapes an argument can legitimately take.
  it('reads the argument of a call', () => {
    expect(
      extractCallArgument(
        'withTimeout(TIMEOUT_MS) { body() }',
        /withTimeout\s*\(/
      )
    ).toBe('TIMEOUT_MS');
  });

  it('keeps a nested call whole rather than stopping at its closing paren', () => {
    expect(
      extractCallArgument(
        'withTimeout(scale(TIMEOUT_MS, 2)) { }',
        /withTimeout\s*\(/
      )
    ).toBe('scale(TIMEOUT_MS, 2)');
  });

  it('reads the first call, which is the semantics its callers rely on', () => {
    // Documented behaviour, pinned so it cannot drift silently: what makes first-match safe on the
    // real sources is the pattern-uniqueness test, not this function.
    expect(
      extractCallArgument(
        'withTimeout(FIRST) { }\nwithTimeout(SECOND) { }',
        /withTimeout\s*\(/
      )
    ).toBe('FIRST');
  });

  it('needs the blanked string interiors its callers hand it', () => {
    // The precondition, made checkable rather than merely documented: a parenthesis inside a live
    // literal desynchronises the scan, and only `extractBody`'s blanking keeps it balanced.
    const raw = 'withTimeout(f("(")) { body() }';
    expect(extractCallArgument(raw, /withTimeout\s*\(/)).toBeNull();
    expect(
      extractCallArgument(lex(raw, { blankLiterals: true }), /withTimeout\s*\(/)
    ).toBe('f(" ")');
  });

  it('strips a parameter label of either platform, and nothing else', () => {
    expect(stripArgumentLabel('timeMillis = TIMEOUT_MS')).toBe('TIMEOUT_MS');
    expect(stripArgumentLabel('nanoseconds: TIMEOUT_NS')).toBe('TIMEOUT_NS');
    expect(stripArgumentLabel(' TIMEOUT_MS * 2 ')).toBe('TIMEOUT_MS * 2');
    expect(stripArgumentLabel('TIMEOUT_MS == other')).toBe(
      'TIMEOUT_MS == other'
    );
  });

  // MUST FAIL — an absent call must read as absent, never as an empty argument that then
  // satisfies whatever the caller asserts about it.
  it('finds no argument when the call is absent', () => {
    expect(
      extractCallArgument('delay(TIMEOUT_MS)', /withTimeout\s*\(/)
    ).toBeNull();
  });

  it('finds no argument when the call is never closed', () => {
    // Returning the truncated tail would hand the caller a plausible-looking argument built from
    // an unparsable call.
    expect(
      extractCallArgument('withTimeout(TIMEOUT_MS', /withTimeout\s*\(/)
    ).toBeNull();
  });

  // MUST PASS / MUST FAIL — a bound must wrap the work, and an empty wrapper must read as empty.
  it('reads the block a call wraps', () => {
    expect(
      extractTrailingBlock('withTimeout(T) { work() }', /withTimeout\s*\(/)
    ).toBe(' work() ');
  });

  it('finds no block when the call wraps nothing', () => {
    expect(
      extractTrailingBlock(
        'withTimeout(T)\nwork { real() }',
        /withTimeout\s*\(/
      )
    ).toBeNull();
    expect(
      extractTrailingBlock('withTimeout(T) { }\nreal { }', /withTimeout\s*\(/)
    ).toBe(' ');
  });

  // MUST FAIL — a body that only exists in prose must not be read as code.
  it('finds no body for a declaration that lives in a comment', () => {
    expect(extractBody('// fun f() { real() }', /fun\s+f\s*\(/)).toBeNull();
  });

  it('finds no body when the declaration is renamed away', () => {
    expect(
      extractBody('fun somethingElse() { real() }', /fun\s+f\s*\(/)
    ).toBeNull();
  });

  it('fails loudly on an unterminated literal instead of truncating', () => {
    // The dangerous outcome is not an exception, it is a short list: everything after the
    // unbalanced quote goes unlexed, so a deleted code reads as parity.
    expect(() =>
      extractKotlinCodes(
        'val broken = "oops\nconst val CODE_A = "ONE"; use(CODE_A)'
      )
    ).toThrow(/Unterminated/);
    expect(() => extractSwiftCodes('let broken = """\ncode = "ONE"')).toThrow(
      /Unterminated/
    );
  });
});

describe('constant collection', () => {
  // MUST PASS — the shapes a bound can legitimately be declared in.
  it('reads a Kotlin constant, a Swift static and a plain local alike', () => {
    const constants = collectConstants(
      'const val A = 60_000L\nstatic let b: UInt64 = 60_000\nval c = A'
    );
    expect(constants.get('A')).toBe('60_000L');
    expect(constants.get('b')).toBe('60_000');
    expect(constants.get('c')).toBe('A');
  });

  // MUST FAIL — an ambiguous or fictional binding must resolve to nothing.
  it('drops a name bound twice rather than picking one', () => {
    expect(collectConstants('val a = 1\nval a = 2').has('a')).toBe(false);
  });

  it('ignores a binding that only exists in a comment', () => {
    expect(collectConstants('// const val A = 60_000L').has('A')).toBe(false);
  });
});

describe('timeout expression evaluation', () => {
  const KOTLIN = new Map([['TOKEN_REQUEST_TIMEOUT_MS', '60_000L']]);
  const SWIFT = new Map([
    ['tokenRequestTimeoutMilliseconds', '60_000'],
    [
      'tokenRequestTimeoutNanoseconds',
      'tokenRequestTimeoutMilliseconds * 1_000_000',
    ],
  ]);
  const DECLARED_NS = 60_000 * 1_000_000;

  const ns = (
    expression: string,
    constants: ReadonlyMap<string, string>,
    unit: 'milliseconds' | 'nanoseconds'
  ): number | null =>
    evaluateBoundNanoseconds(expression, constants, unit)?.nanoseconds ?? null;

  // MUST PASS — every rewrite below applies the declared bound; none is a regression.
  it('reads the bare constant in the unit its call site implies', () => {
    expect(ns('TOKEN_REQUEST_TIMEOUT_MS', KOTLIN, 'milliseconds')).toBe(
      DECLARED_NS
    );
    expect(
      ns('tokenRequestTimeoutMilliseconds * 1_000_000', SWIFT, 'nanoseconds')
    ).toBe(DECLARED_NS);
  });

  it('reads a labelled argument on either platform', () => {
    expect(
      ns('timeMillis = TOKEN_REQUEST_TIMEOUT_MS', KOTLIN, 'milliseconds')
    ).toBe(DECLARED_NS);
    expect(
      ns('nanoseconds: tokenRequestTimeoutNanoseconds', SWIFT, 'nanoseconds')
    ).toBe(DECLARED_NS);
  });

  it('reads the Duration overload as the same bound', () => {
    expect(
      ns('TOKEN_REQUEST_TIMEOUT_MS.milliseconds', KOTLIN, 'milliseconds')
    ).toBe(DECLARED_NS);
  });

  it('reads a qualified reference, which a hoist out of the class forces', () => {
    expect(
      ns('Companion.TOKEN_REQUEST_TIMEOUT_MS', KOTLIN, 'milliseconds')
    ).toBe(DECLARED_NS);
    expect(
      ns(
        'Self.tokenRequestTimeoutMilliseconds * 1_000_000',
        SWIFT,
        'nanoseconds'
      )
    ).toBe(DECLARED_NS);
  });

  it('follows a derived constant back to the one it is derived from', () => {
    const bound = evaluateBoundNanoseconds(
      'tokenRequestTimeoutNanoseconds',
      SWIFT,
      'nanoseconds'
    );
    expect(bound?.nanoseconds).toBe(DECLARED_NS);
    expect(bound?.references).toContain('tokenRequestTimeoutNanoseconds');
    expect(bound?.references).toContain('tokenRequestTimeoutMilliseconds');
  });

  it('folds arithmetic, so an equivalent rewrite is not a failure', () => {
    expect(
      ns('(TOKEN_REQUEST_TIMEOUT_MS * 2) / 2', KOTLIN, 'milliseconds')
    ).toBe(DECLARED_NS);
  });

  // MUST FAIL — each of these reads as bounded and behaves as if it were not.
  it('does not fold an expression that changes the value', () => {
    expect(
      ns('tokenRequestTimeoutMilliseconds * 0', SWIFT, 'nanoseconds')
    ).toBe(0);
    expect(
      ns('tokenRequestTimeoutMilliseconds / 1_000_000', SWIFT, 'nanoseconds')
    ).not.toBe(DECLARED_NS);
    expect(
      ns('TOKEN_REQUEST_TIMEOUT_MS * 100_000', KOTLIN, 'milliseconds')
    ).not.toBe(DECLARED_NS);
    // A unit is part of the value: 60 000 seconds is not the documented bound.
    expect(
      ns('TOKEN_REQUEST_TIMEOUT_MS.seconds', KOTLIN, 'milliseconds')
    ).not.toBe(DECLARED_NS);
  });

  it('refuses an expression it cannot fold instead of guessing', () => {
    expect(
      ns('min(1, tokenRequestTimeoutMilliseconds)', SWIFT, 'nanoseconds')
    ).toBeNull();
    expect(ns('SOME_OTHER_CONSTANT', KOTLIN, 'milliseconds')).toBeNull();
    expect(ns('TOKEN_REQUEST_TIMEOUT_MS 2', KOTLIN, 'milliseconds')).toBeNull();
  });

  it('refuses a definition that resolves through itself', () => {
    const cyclic = new Map([
      ['A', 'B'],
      ['B', 'A'],
    ]);
    expect(ns('A', cyclic, 'milliseconds')).toBeNull();
  });

  it('resolves a hard-coded literal through no constant at all', () => {
    // The value is right and the bound is still wrong: inlining the number decouples the wait from
    // the constant the README and the other platform are compared against. Callers assert on
    // `references`, which is empty here, so this is what catches it.
    const bound = evaluateBoundNanoseconds('60_000L', KOTLIN, 'milliseconds');
    expect(bound?.nanoseconds).toBe(DECLARED_NS);
    expect(bound?.references).toEqual([]);
  });
});

describe('helper reachability', () => {
  const SOURCE = [
    'func answer() {',
    '  settle(pending)',
    '}',
    'func complete() {',
    '  answer()',
    '}',
    'func resumeDirectly() {',
    '  continuation.resume(with: result)',
    '}',
  ].join('\n');

  // MUST PASS — the work may move into a helper without moving out of reach.
  it('follows a call into the helper that does the work', () => {
    expect(reaches(SOURCE, 'complete()', /\bsettle\s*\(/)).toBe(true);
  });

  // MUST FAIL — it must not invent a path that is not there.
  it('reports a body that reaches nothing', () => {
    expect(
      reaches(
        SOURCE,
        extractBody(SOURCE, /func\s+resumeDirectly\s*\(/) as string,
        /\bsettle\s*\(/
      )
    ).toBe(false);
  });

  it('refuses to follow a helper name declared more than once', () => {
    // Same reason the pattern-uniqueness test exists: with two candidates, "the" helper is a
    // guess, and a guess in this direction is a pass the code has not earned.
    const decoyed = `${SOURCE}\nfunc answer() {\n  settle(pending)\n}`;
    expect(reaches(decoyed, 'complete()', /\bsettle\s*\(/)).toBe(false);
  });

  it('stops on a cycle instead of recursing forever', () => {
    expect(
      reaches('func a() { b() }\nfunc b() { a() }', 'a()', /\bsettle\s*\(/)
    ).toBe(false);
  });
});
