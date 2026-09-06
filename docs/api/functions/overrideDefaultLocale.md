[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / overrideDefaultLocale

# Function: overrideDefaultLocale()

> **overrideDefaultLocale**(`locale`): `Promise`\<`void`\>

Override the default locale used by the Octopus SDK for its UI.

The change takes effect immediately for subsequently displayed SDK screens.
Pass `null` to reset to the system default locale.

## Parameters

### locale

Object with `languageCode` and optional `countryCode`
(e.g. `{ languageCode: 'fr' }` or `{ languageCode: 'en', countryCode: 'US' }`).
Pass `null` to use the system default (no override).

[`OverrideLocaleParams`](../interfaces/OverrideLocaleParams.md) | `null`

## Returns

`Promise`\<`void`\>

A promise that resolves when the override has been applied.

## Throws

An error if the SDK is not initialized or the call fails.

## Throws

An error if locale is invalid (e.g. non-ISO language/country codes).

## Example

```typescript
// Use French
await overrideDefaultLocale({ languageCode: 'fr' });

// Use English (US)
await overrideDefaultLocale({ languageCode: 'en', countryCode: 'US' });

// Reset to system default
await overrideDefaultLocale(null);
```
