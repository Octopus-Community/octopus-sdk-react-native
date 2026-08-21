import { formatOctopusCompactCount } from '../formatOctopusCompactCount';

/**
 * The truth table below is transcribed from the Flutter plugin's
 * `test/octopus_count_format_test.dart`, case for case. The two wrappers render the same counts
 * next to the same native feed, so a divergence here is a user-visible one — a French host
 * showing `1.2K` in one SDK and `1,2K` in the other.
 *
 * Both implementations do the same IEEE-754 double arithmetic (`count / divisor`, then
 * `floor(value * 10) / 10`), so the floor-not-round cases are iso by construction rather than by
 * coincidence; they are pinned anyway because "truncate" and "round" agree on most inputs and
 * disagree on exactly the ones a reader would eyeball as equivalent (`1950` → `1.9K`, not
 * `2.0K`).
 */
describe('formatOctopusCompactCount — raw band (< 1000)', () => {
  it.each([
    [0, '0'],
    [7, '7'],
    [999, '999'],
  ])('%i is "%s"', (count, expected) => {
    expect(formatOctopusCompactCount(count)).toBe(expected);
  });

  it('returns negative integers unchanged (no rebanding)', () => {
    expect(formatOctopusCompactCount(-1)).toBe('-1');
    expect(formatOctopusCompactCount(-12345)).toBe('-12345');
  });
});

describe('formatOctopusCompactCount — K band (1_000…999_999)', () => {
  it.each([
    [1000, '1K'],
    [1234, '1.2K'],
    [1999, '1.9K'],
    [9999, '9.9K'],
    [1950, '1.9K'],
    [10000, '10K'],
    [12345, '12K'],
    [99999, '99K'],
    [999999, '999K'],
    [2000, '2K'],
  ])('%i is "%s"', (count, expected) => {
    expect(formatOctopusCompactCount(count)).toBe(expected);
  });
});

describe('formatOctopusCompactCount — M band (1_000_000…999_999_999)', () => {
  it.each([
    [1000000, '1M'],
    [1234567, '1.2M'],
    [9950000, '9.9M'],
    [9999999, '9.9M'],
    [10000000, '10M'],
    [999999999, '999M'],
  ])('%i is "%s"', (count, expected) => {
    expect(formatOctopusCompactCount(count)).toBe(expected);
  });
});

describe('formatOctopusCompactCount — B band (>= 1_000_000_000)', () => {
  it.each([
    [1000000000, '1B'],
    [1234567890, '1.2B'],
    [9999999999, '9.9B'],
    [12000000000, '12B'],
  ])('%i is "%s"', (count, expected) => {
    expect(formatOctopusCompactCount(count)).toBe(expected);
  });
});

describe('formatOctopusCompactCount — band boundaries', () => {
  it.each([
    [999, '999'],
    [1000, '1K'],
    [999999, '999K'],
    [1000000, '1M'],
    [999999999, '999M'],
    [1000000000, '1B'],
  ])('%i is "%s"', (count, expected) => {
    expect(formatOctopusCompactCount(count)).toBe(expected);
  });
});

describe('formatOctopusCompactCount — locale decimal separator', () => {
  it('falls back to "." with no locale', () => {
    expect(formatOctopusCompactCount(1234)).toBe('1.2K');
    expect(formatOctopusCompactCount(1234, {})).toBe('1.2K');
    expect(formatOctopusCompactCount(1234, { locale: null })).toBe('1.2K');
  });

  it('uses "." for English', () => {
    expect(formatOctopusCompactCount(1234, { locale: 'en' })).toBe('1.2K');
    expect(formatOctopusCompactCount(1234, { locale: 'en-US' })).toBe('1.2K');
  });

  it('uses "," for French', () => {
    expect(formatOctopusCompactCount(1234, { locale: 'fr' })).toBe('1,2K');
    expect(formatOctopusCompactCount(1234, { locale: 'fr-FR' })).toBe('1,2K');
  });

  it('accepts the underscore locale form, which Android hosts pass through', () => {
    // Dart takes a structured `Locale`; JS hosts hand over whatever string they hold, and both
    // `fr-FR` (BCP 47) and `fr_FR` (Android resource form) reach this API in the wild.
    expect(formatOctopusCompactCount(1234, { locale: 'fr_FR' })).toBe('1,2K');
  });

  it('reads the language subtag case-insensitively', () => {
    expect(formatOctopusCompactCount(1234, { locale: 'FR-fr' })).toBe('1,2K');
  });

  it('uses "," for German', () => {
    expect(formatOctopusCompactCount(1234567, { locale: 'de' })).toBe('1,2M');
  });

  it('uses "," for Spanish', () => {
    expect(formatOctopusCompactCount(1500000000, { locale: 'es' })).toBe(
      '1,5B'
    );
  });

  it('shows no separator for whole values, whatever the locale', () => {
    expect(formatOctopusCompactCount(2000, { locale: 'fr' })).toBe('2K');
    expect(formatOctopusCompactCount(10000, { locale: 'fr' })).toBe('10K');
  });

  it('leaves the raw band locale-independent', () => {
    expect(formatOctopusCompactCount(42, { locale: 'fr' })).toBe('42');
  });

  it('falls back to "." for an unknown locale', () => {
    expect(formatOctopusCompactCount(1234, { locale: 'xx' })).toBe('1.2K');
  });
});

describe('formatOctopusCompactCount — inputs Dart’s int cannot express', () => {
  // `formatOctopusCompactCount(int)` in Dart; `number` here. These cases have no Flutter
  // counterpart to be iso with — they exist so a JS host that hands over a float or a NaN gets
  // something readable instead of "1.2345000000001K".
  it('truncates a non-integer toward zero before banding', () => {
    expect(formatOctopusCompactCount(1234.9)).toBe('1.2K');
    expect(formatOctopusCompactCount(42.7)).toBe('42');
    expect(formatOctopusCompactCount(-42.7)).toBe('-42');
  });

  it('stringifies a non-finite number as-is', () => {
    expect(formatOctopusCompactCount(Number.NaN)).toBe('NaN');
    expect(formatOctopusCompactCount(Number.POSITIVE_INFINITY)).toBe(
      'Infinity'
    );
  });
});
