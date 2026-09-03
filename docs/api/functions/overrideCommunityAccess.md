[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / overrideCommunityAccess

# Function: overrideCommunityAccess()

> **overrideCommunityAccess**(`hasAccess`): `Promise`\<`void`\>

Override the community access cohort for the current user.

**When to use:** When the **Octopus SDK manages the A/B logic** — i.e. Octopus assigns
the cohort and decides who has access to the community. In that case, the "Has access
to community" state is the cohort value. Use this function to override that cohort
(e.g. for testing or feature gating). The new state is reflected via `addHasAccessToCommunityListener`.

**When not to use:** If **your app** decides who has access (e.g. your own feature flag or A/B logic),
do not use `overrideCommunityAccess`. Use `trackCommunityAccess` instead to report the access
value to Octopus for analytics only; that does not change the actual access state in the SDK.

## Parameters

### hasAccess

`boolean`

`true` to grant access, `false` to deny access.

## Returns

`Promise`\<`void`\>

A promise that resolves when the override has been applied.

## Throws

An [OverrideCommunityAccessError](../interfaces/OverrideCommunityAccessError.md) if the SDK is not initialized or the call
fails — see [isOverrideCommunityAccessError](isOverrideCommunityAccessError.md) to narrow it. Neither native SDK
classifies this failure beyond a single generic code.

## See

- [addHasAccessToCommunityListener](addHasAccessToCommunityListener.md) – subscribe to the Octopus-managed community access state.
- [trackCommunityAccess](trackCommunityAccess.md) – when your app manages access, report it for analytics only (no change to SDK state).

## Example

```typescript
const subscription = addHasAccessToCommunityListener((hasAccess) => {
  console.log(`Has access to community: ${hasAccess}`);
});
await overrideCommunityAccess(true);
await overrideCommunityAccess(false);
subscription.remove();
```
