[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / formatOctopusCompactCount

# Function: formatOctopusCompactCount()

> **formatOctopusCompactCount**(`count`, `options?`): `string`

Formats `count` as a compact, human-readable string in the same style as the embedded
community UI on both native platforms: `0`–`999` raw, then `K` / `M` / `B` for thousands /
millions / billions.

Use it to render the counts carried by [OctopusPost](../interfaces/OctopusPost.md) (`commentCount`, `viewCount`) and
[OctopusReactionCount](../interfaces/OctopusReactionCount.md) (`count`) consistently with the native Octopus feed.

Pure TypeScript — no native call, no `Intl`, safe to call during render and safe to call
before `initialize()`.

## Algorithm

- `0`–`999` → `'0'` … `'999'`
- `1_000`–`999_999` → `'1K'`, `'1.2K'`, `'9.9K'`, `'12K'`, … `'999K'`
- `1_000_000`–`999_999_999` → `'1M'`, `'1.2M'`, … `'999M'`
- `≥ 1_000_000_000` → `'1B'`, `'1.2B'`, …

Within a band the value is divided by the band's divisor and **floored** to one decimal
(truncation, not rounding — `1999` → `'1.9K'`, never `'2.0K'`). One decimal is shown only
when the truncated value is `< 10`; otherwise the integer form is used (`'12K'`, `'999K'`).
A whole-number truncated value drops the decimal (`'2K'`, not `'2.0K'`).

## Locale

`options.locale` controls the decimal separator **only**: `'1,2K'` for languages that use a
comma decimal (French, German, Spanish, …) and `'1.2K'` for the rest. The `K` / `M` / `B`
suffixes are not translated — they match what the native SDKs render. Pass the locale you
handed to [overrideDefaultLocale](overrideDefaultLocale.md), so the formatted counts match the embedded UI.

## Negative and non-integer values

Negative numbers are returned unchanged (`-12345` → `'-12345'`) — counts are expected to be
non-negative, and the bug case is exposed rather than silently rebanded. A non-integer is
truncated toward zero before formatting; a non-finite number is stringified as-is.

## Parameters

### count

`number`

The raw count to format.

### options?

[`FormatOctopusCompactCountOptions`](../interfaces/FormatOctopusCompactCountOptions.md)

Optional formatting options.

## Returns

`string`

The compact representation.

## Example

```typescript
formatOctopusCompactCount(1234); // '1.2K'
formatOctopusCompactCount(1234, { locale: 'fr-FR' }); // '1,2K'
formatOctopusCompactCount(12345); // '12K'
formatOctopusCompactCount(1_234_567_890); // '1.2B'
```
