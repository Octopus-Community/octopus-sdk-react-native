[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / setNavigateToClientObjectCallback

# Function: setNavigateToClientObjectCallback()

> **setNavigateToClientObjectCallback**(`callback`): () => `void`

Registers what to do when a member taps the "view object" button on a post linked to one of
your objects — the button whose label is [ClientPost.viewObjectButtonText](../interfaces/ClientPost.md#viewobjectbuttontext).

The callback receives the `objectId` you passed as [ClientPost.objectId](../interfaces/ClientPost.md#objectid): route to
your own screen for that object. Called on the JS thread, so it is safe to navigate from.

**Last write wins**, like [addBridgeShareTokenRequestListener](addBridgeShareTokenRequestListener.md)'s provider: a second
call replaces the first. Register it once, at app start, before opening the Octopus UI —
see the two platform notes below for what happens if you register later.

Returns an **unregister handle**, the same shape the Flutter SDK's
`setNavigateToClientObjectCallback` returns. The handle is **identity-guarded**: it clears
the registration only if yours is still the current one, so a late `useEffect` cleanup or a
hot reload cannot wipe a newer registration made in the meantime. Calling it twice, or
after someone else has registered, is a no-op.

## Parameters

### callback

[`NavigateToClientObjectCallback`](../type-aliases/NavigateToClientObjectCallback.md)

What to run when the button is tapped.

## Returns

A function that unregisters _this_ callback. Call it from your `useEffect`
cleanup; ignore it if you register once for the lifetime of the app.

> (): `void`

### Returns

`void`

## Remarks

**Accepted divergences from the native SDKs**, both consequences of the two platforms
exposing this hook in different places, and both about _when_ the registration is read
rather than what it does.

- **Android** takes it as the `onNavigateToClientObject` parameter of `OctopusHomeScreen`,
  read at composition, and the SDK keys the button's visibility on it being non-null. This
  wrapper reads the registration when the Octopus UI is composed: register **before**
  opening the UI, otherwise the button stays hidden until the UI is reopened.
- **iOS** takes it as `OctopusSDK.set(displayClientObjectCallback:)`, whose parameter is
  **not** optional — the native SDK offers no way to un-set it. Clearing the registration
  here therefore stops your callback from being invoked, but the button remains visible in
  an already-running UI and taps become no-ops until you register again. Registering after
  `initialize()` works on iOS at any time; a registration made _before_ `initialize()` is
  applied as soon as the SDK is created.

The practical rule that is correct on both platforms: call this once at app start, and do
not clear it while the Octopus UI is on screen.

## Example

```typescript
useEffect(() => {
  return setNavigateToClientObjectCallback((objectId) => {
    navigation.navigate('Article', { id: objectId });
  });
}, [navigation]);
```
