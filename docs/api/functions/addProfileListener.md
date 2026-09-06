[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / addProfileListener

# Function: addProfileListener()

> **addProfileListener**(`callback`): `EmitterSubscription`

Adds a listener for the connected user's public [OctopusProfile](../interfaces/OctopusProfile.md), or `null` when no user is
connected.

Emits whenever the profile changes — including when entitlements are refreshed. Consecutive
duplicate values are collapsed, so it fires only on an actual change (consistent on Android and
iOS). **The current value is replayed immediately** to a listener added after the SDK already
published one, so a screen mounting later still sees the profile without waiting for the next
change. Nothing is replayed before the first value is known — `null` (not connected) is a real
value, distinct from "not known yet".

Mirrors the native `OctopusSDK.profile`.

## Parameters

### callback

[`ProfileListenerCallback`](../type-aliases/ProfileListenerCallback.md)

Called with the current profile, then on every change.

## Returns

`EmitterSubscription`

A subscription object with a `remove()` method to unsubscribe.

## See

[getProfile](getProfile.md) – the synchronous current value.

## Example

```typescript
const subscription = addProfileListener((profile) => {
  console.log('entitlements', profile?.entitlements ?? []);
});

// Later, to unsubscribe:
subscription.remove();
```
