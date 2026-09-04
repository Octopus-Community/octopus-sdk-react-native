[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / UrlOpeningStrategy

# Enumeration: UrlOpeningStrategy

Strategy for handling URLs tapped inside the Octopus Community UI.

When URL interception is enabled via `openUI({ interceptUrls: true })`,
the app receives each tapped URL via `addNavigateToUrlListener`. The callback
returns one of these strategies to decide who handles the URL.

## Enumeration Members

### handledByApp

> **handledByApp**: `"handledByApp"`

The URL has been handled by the app. The SDK will not open it.
Use this when you open the URL in an in-app web view or handle it yourself.

---

### handledByOctopus

> **handledByOctopus**: `"handledByOctopus"`

The URL should be opened by the Octopus SDK (system browser).
The native layer will open the URL in the default browser when this is returned.
