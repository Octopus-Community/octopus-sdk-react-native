[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / addIsInitialisedListener

# Function: addIsInitialisedListener()

> **addIsInitialisedListener**(`callback`): `EmitterSubscription`

Adds a listener for the SDK initialization state.

Fires `true` once the SDK is initialized, and `false` when it goes back to uninitialized.
Consecutive duplicates are collapsed. Unlike the other state listeners this one always has a
value to replay — the SDK genuinely starts uninitialized — so a listener added before
`initialize()` is called back with `false` straight away, then with `true`. A listener added
after `initialize()` has resolved is called back with `true` only: `initialize()` publishes the
transition itself, so there is no spurious `false` for a host that subscribes late. The other
lifecycle calls publish the same way: `stop()` fires `false` and `switchCommunity()` fires
`true` as they resolve.

Mirrors the native Android `OctopusSDK.isInitialisedFlow`. iOS has no native equivalent: there,
the presence of an SDK instance is the source of truth, exactly as in the Flutter wrapper.

## Parameters

### callback

[`IsInitialisedListenerCallback`](../type-aliases/IsInitialisedListenerCallback.md)

Called with the current value, then on every change.

## Returns

`EmitterSubscription`

A subscription object with a `remove()` method to unsubscribe.

## See

[isInitialised](isInitialised.md) – the synchronous current value.

## Example

```typescript
const subscription = addIsInitialisedListener((ready) => {
  setSdkReady(ready);
});

// Later, to unsubscribe:
subscription.remove();
```
