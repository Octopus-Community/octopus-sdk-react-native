[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / trackCustomEvent

# Function: trackCustomEvent()

> **trackCustomEvent**(`name`, `properties?`): `Promise`\<`void`\>

Track custom events that are merged into Octopus analytics reports.

Use this to send app-specific business events (e.g. purchases, feature usage)
so they appear alongside Octopus Community analytics.

All property values must be strings. Non-string values should be stringified
before calling (e.g. numbers as `"123"`, booleans as `"true"`).

## Parameters

### name

`string`

The name of the custom event (e.g. `"purchase"`, `"screen_view"`).

### properties?

`Record`\<`string`, `string`\>

Optional map of string key-value pairs attached to the event.

## Returns

`Promise`\<`void`\>

A promise that resolves when the event has been tracked.

## Throws

An error if the SDK is not initialized or tracking fails.

## Example

```typescript
await trackCustomEvent('purchase', {
  product_id: '123',
  price: '9.99',
  currency: 'EUR',
});

await trackCustomEvent('feature_used', {
  feature: 'community_search',
  source: 'home_screen',
});
```
