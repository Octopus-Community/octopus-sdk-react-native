[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / addNavigateToProfileListener

# Function: addNavigateToProfileListener()

> **addNavigateToProfileListener**(`callback`): `EmitterSubscription`

Adds a listener for profile taps inside the Octopus Community UI, so your app
can show its own profile screen instead of the SDK's (Unified Profile).

Only has an effect when the UI was mounted with profile taps intercepted —
`openUI({ interceptProfileTaps: true })` or
`<OctopusUIView interceptProfileTaps />` — **and** the community is configured
to expose client user ids. Both halves are required: without them the SDK
keeps showing its own profile screens and this event is never emitted.

Fires for any profile tapped in the community, including the connected user's
own. A member the SDK holds no client user id for (a guest, or a
back-office-created profile) opens the Octopus activity screen instead — the
callback is never invoked without an id.

## Parameters

### callback

[`NavigateToProfileListenerCallback`](../type-aliases/NavigateToProfileListenerCallback.md)

Function called with the tapped member's `clientUserId`.

## Returns

`EmitterSubscription`

A subscription object with a `remove()` method to unsubscribe.

## Example

```typescript
const subscription = addNavigateToProfileListener(({ clientUserId }) => {
  navigation.navigate('Profile', { userId: clientUserId });
});

// Later, to unsubscribe:
subscription.remove();
```
