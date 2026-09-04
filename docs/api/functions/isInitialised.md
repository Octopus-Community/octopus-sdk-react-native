[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / isInitialised

# Function: isInitialised()

> **isInitialised**(): `boolean`

Whether the Octopus SDK is currently initialised.

This is a **synchronous, client-side** read — it does not cross the bridge. It mirrors
the last `initialize` / `switchCommunity` / `stop` call this JS instance made:
`true` once `initialize` or `switchCommunity` has resolved, `false` once `stop` has
resolved. `reset()` does not change it — the SDK stays initialised after a reset.

Because it never queries native, a value observed right after a fresh app start (before
any lifecycle call has resolved) is always `false`, even if a previous session already
initialised the native SDK.

## Returns

`boolean`

`true` if the SDK is initialised, `false` otherwise.

## See

- [initialize](initialize.md)
- [switchCommunity](switchCommunity.md)
- [stop](stop.md)

## Example

```typescript
if (!isInitialised()) {
  await initialize({
    apiKey: 'your-api-key',
    connectionMode: { type: 'octopus' },
  });
}
```
