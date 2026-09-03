[**@octopus-community/react-native v1.13.1**](../README.md)

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
screens, `notification` to open directly on deep-linked content, and
`initialScreen` to open on a specific screen (a post, a group, one
member's posts or profile, or the post editor).

## Returns

`Promise`\<`void`\>

A promise that resolves when the UI has been opened.

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
