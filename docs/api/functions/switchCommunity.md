[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / switchCommunity

# Function: switchCommunity()

> **switchCommunity**(`params`): `Promise`\<`void`\>

Switches the SDK to a different community (a different API key) at runtime.

This:

- Resets the SDK (disconnects the user and clears all locally cached data)
- Reinitializes the SDK with the new community configuration

After this resolves, the user needs to be reconnected on the new community (e.g. via
[connectUser](connectUser.md)). This call is safe even if the SDK is not currently initialised —
it initialises it directly on the new community in that case, on both platforms
including reactive events ([isInitialised](isInitialised.md)'s counterparts: notification counts,
community-access state, SDK events all start emitting for the new community too).

**You must remount `<OctopusUIView>` after switching.** Change the `key` prop you pass
to `<OctopusUIView>` (e.g. to the new community's API key) so React re-creates the
native view for the new community, instead of reusing the one bound to the previous
community.

**Known limitation on Android:** natively, `switchCommunity` is implemented as
`reset()` + `initialize()`. If the `initialize()` half throws, the SDK is left
uninitialised, but [isInitialised](isInitialised.md) on the JS side keeps whatever value it had
before the call (this function only flips it to `true` on success). This is a
best-effort tracking choice, not a bug fix target for this API — check the promise
rejection rather than [isInitialised](isInitialised.md) to detect a failed switch.

## Parameters

### params

[`SwitchCommunityParams`](../interfaces/SwitchCommunityParams.md)

See [SwitchCommunityParams](../interfaces/SwitchCommunityParams.md).

## Returns

`Promise`\<`void`\>

A promise that resolves when the switch completes.

## Throws

An error if the call fails.

## See

- [initialize](initialize.md)
- [reset](reset.md)
- [stop](stop.md)

## Example

```typescript
await switchCommunity({
  apiKey: 'new-community-api-key',
  connectionMode: { type: 'octopus' },
});
// Then remount the embedded UI, e.g.:
// <OctopusUIView key="new-community-api-key" ... />
await connectUser(user);
```
