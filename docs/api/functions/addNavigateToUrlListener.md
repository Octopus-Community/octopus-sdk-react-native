[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / addNavigateToUrlListener

# Function: addNavigateToUrlListener()

> **addNavigateToUrlListener**(`callback`): `EmitterSubscription`

Adds a listener for URL navigation events from the Octopus Community UI.

Only has an effect when the UI was opened with `openUI({ interceptUrls: true })`.
When the user taps a link, this callback is invoked with the URL. Return
`handledByApp` if your app handles the URL (e.g. in-app web view), or
`handledByOctopus` to let the SDK open it in the system browser.

## Parameters

### callback

[`NavigateToUrlListenerCallback`](../type-aliases/NavigateToUrlListenerCallback.md)

Function called with the tapped URL. Can be async.
Return `UrlOpeningStrategy.handledByApp` or `UrlOpeningStrategy.handledByOctopus`.

## Returns

`EmitterSubscription`

A subscription object with a `remove()` method to unsubscribe.

## Example

```typescript
const subscription = addNavigateToUrlListener(async (url) => {
  if (url.startsWith('https://myapp.com/')) {
    // Handle deep link in-app
    Linking.openURL(url);
    return UrlOpeningStrategy.handledByApp;
  }
  return UrlOpeningStrategy.handledByOctopus; // Open in system browser
});

// Later, to unsubscribe:
subscription.remove();
```
