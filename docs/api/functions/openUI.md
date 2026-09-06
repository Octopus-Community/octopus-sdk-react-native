[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / openUI

# Function: openUI()

> **openUI**(`options?`): `Promise`\<`void`\>

Opens the Octopus UI home screen.

## Parameters

### options?

[`OpenUIOptions`](../interfaces/OpenUIOptions.md)

Optional configuration. Use `interceptUrls: true` to receive
URL taps via `addNavigateToUrlListener` instead of having the SDK open them,
`interceptProfileTaps: true` to receive profile taps via
`addNavigateToProfileListener` instead of having the SDK open its own profile
screens, `notification` to open directly on deep-linked content,
`initialScreen` to open on a specific screen (a post, a group, one
member's posts or profile, or the post editor), and `onBackRequested` to
be told when the user leaves the UI from its root screen.

## Returns

`Promise`\<`void`\>

A promise that resolves when the UI has been opened.

## Throws

An error whose `code` is `OPEN_UI_ERROR` (as a promise rejection) when
the SDK is not initialized — call `initialize()` first. Both platforms.

## Throws

A plain `Error` synchronously when `initialScreen` is structurally
invalid (blank `postId` / `groupId`, or an `activity` member violating the
exactly-one-id contract), and a [NavigateToOctopusCreatePostError](../interfaces/NavigateToOctopusCreatePostError.md)
when a `createPost` initial screen's `prefilledPost` fails native
validation.

## Example

```typescript
// Open UI with default behaviour (SDK opens links in system browser)
await openUI();

// Open UI with URL interception (app receives links via addNavigateToUrlListener)
await openUI({ interceptUrls: true });

// Open UI with the host's own profile screens (Unified Profile)
await openUI({ interceptProfileTaps: true });

// Open UI on the content carried by a tapped push notification
await openUI({ notification });

// Open UI directly on a specific post (bridge mode)
await openUI({ initialScreen: { type: 'post', postId: 'post-1' } });
```
