/**
 * Minimal lexer shared by the guard tests that assert things about native **source text**
 * (`android/`, `ios/`). Matching a raw file is not good enough: a previous version of one of
 * those guards passed because a comment happened to mention the identifier it looked for,
 * while the real gate had been replaced by `if (true)` — and a correct file failed because a
 * log string contained a lone brace.
 *
 * Not a test file: `jest.testPathIgnorePatterns` in `package.json` keeps this directory out of
 * the suite list. The behaviour of both functions is covered from the guards that use them —
 * see the "resists text that only looks like code" blocks.
 */

/**
 * Blanks out comments, and optionally string literals, preserving newlines and byte offsets so
 * that brace balance over the remaining real code is unchanged. Handles `//` line comments,
 * block and KDoc comments including the nesting Kotlin and Swift both allow, Kotlin `"""`
 * raw strings, and escaped quotes.
 *
 * String literals are always *walked over* even when they are kept, so a `//` inside one is
 * never mistaken for the start of a comment.
 */
const mask = (source: string, maskStrings: boolean): string => {
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
      if (maskStrings) blank(i, stop);
      i = stop;
    } else if (source[i] === '"') {
      let j = i + 1;
      while (j < source.length && source[j] !== '"' && source[j] !== '\n') {
        j += source[j] === '\\' ? 2 : 1;
      }
      const stop = Math.min(j + 1, source.length);
      if (maskStrings) blank(i, stop);
      i = stop;
    } else {
      i += 1;
    }
  }

  return out.join('');
};

/** Blanks out comments and string literals. See {@link mask}. */
export const maskCommentsAndStrings = (source: string): string =>
  mask(source, true);

/**
 * Blanks out comments but keeps string literals, at identical byte offsets.
 *
 * For guards that assert something about the wire *values* a native serializer emits: the
 * literals are the payload, so they cannot be masked away, while a commented-out branch must
 * still not count as live code. Pair it with {@link functionBodyRange} over the fully masked
 * source — both preserve offsets, so a range computed on one slices the other correctly.
 */
export const maskComments = (source: string): string => mask(source, false);

/** Offsets `[start, end)` of the brace-balanced block that opens at `open`, braces excluded. */
const blockRangeAt = (
  masked: string,
  open: number,
  label: string
): [number, number] => {
  let depth = 0;
  for (let i = open; i < masked.length; i += 1) {
    if (masked[i] === '{') depth += 1;
    else if (masked[i] === '}') {
      depth -= 1;
      if (depth === 0) return [open + 1, i];
    }
  }
  throw new Error(`Unbalanced braces after ${label}.`);
};

/** Brace-balanced text of the block that opens at `open`, with whitespace collapsed. */
const blockAt = (masked: string, open: number, label: string): string => {
  const [start, end] = blockRangeAt(masked, open, label);
  return masked.slice(start, end).replace(/\s+/g, ' ').trim();
};

const declarationStart = (masked: string, signature: RegExp): number => {
  const match = signature.exec(masked);
  if (match == null) {
    throw new Error(
      `Could not find ${signature} — the guard would pass vacuously.`
    );
  }
  return match.index;
};

/**
 * Returns the brace-balanced body of the named function, so an assertion cannot be
 * satisfied by text living in some other method. Expects already-masked source. Walks past
 * the parameter list by paren depth before looking for the body brace, so a default
 * argument such as `onDone: () -> Unit = {}` is not mistaken for the body.
 */
export const functionBody = (masked: string, signature: RegExp): string => {
  const [start, end] = functionBodyRange(masked, signature);
  return masked.slice(start, end).replace(/\s+/g, ' ').trim();
};

/**
 * Offsets `[start, end)` of the named function's brace-balanced body — the same block
 * {@link functionBody} returns as text, addressed by position so the range can be applied to a
 * differently-masked copy of the same source (see {@link maskComments}). Expects already-masked
 * source.
 */
export const functionBodyRange = (
  masked: string,
  signature: RegExp
): [number, number] => {
  let cursor = masked.indexOf('(', declarationStart(masked, signature));
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
  return blockRangeAt(masked, open, String(signature));
};

/**
 * Returns the brace-balanced body of a type declaration (class, struct, enum), so an
 * assertion about one of its members cannot be satisfied by an identically-named member of
 * another type in the same file. Expects already-masked source.
 *
 * Unlike `functionBody` it does **not** walk a parameter list: a type declaration has none,
 * and the next `(` in the file usually belongs to one of the type's own members — walking to
 * its matching close would skip past the body brace and return the wrong block.
 */
export const typeBody = (masked: string, signature: RegExp): string => {
  const start = declarationStart(masked, signature);
  const open = masked.indexOf('{', start);
  if (open === -1) {
    throw new Error(`Could not find the opening brace of ${signature}.`);
  }
  return blockAt(masked, open, String(signature));
};

/**
 * Brace-balanced body of the block that opens right after `signature` matches — for
 * constructs `functionBody`/`typeBody` don't fit, chiefly an immediately-invoked closure
 * such as `let x: T? = { ... }()`, which has no parameter list to walk and is not a type
 * declaration either. Expects already-masked source.
 */
export const blockBody = (masked: string, signature: RegExp): string => {
  const start = declarationStart(masked, signature);
  const open = masked.indexOf('{', start);
  if (open === -1) {
    throw new Error(`Could not find the opening brace of ${signature}.`);
  }
  return blockAt(masked, open, String(signature));
};
