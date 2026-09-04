[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / trackCommunityAccess

# Function: trackCommunityAccess()

> **trackCommunityAccess**(`hasAccess`): `Promise`\<`void`\>

Track community access for analytics without changing the actual access.

**When to use:** When **your app manages its own A/B logic** — i.e. your app decides who can see
the community (e.g. via your own feature flag or experiment). Call this to report that decision
to Octopus for analytics only. It does not grant or restrict access in the SDK; it only records
the value for reporting.

**When not to use:** If the **Octopus SDK manages the cohort** (Octopus assigns who has access),
use `overrideCommunityAccess` to change the cohort and `addHasAccessToCommunityListener` to react
to it. Use `trackCommunityAccess` only when the access decision is owned by your app and you just
need to report it.

## Parameters

### hasAccess

`boolean`

The access value to report (e.g. the variant your app decided).

## Returns

`Promise`\<`void`\>

A promise that resolves when the tracking call has completed.

## Throws

An error if the SDK is not initialized or the call fails.

## See

- [overrideCommunityAccess](overrideCommunityAccess.md) – when Octopus manages the cohort, override it (and use addHasAccessToCommunityListener to react).
- [addHasAccessToCommunityListener](addHasAccessToCommunityListener.md) – subscribe to the Octopus-managed access state (relevant when Octopus or override sets it).

## Example

```typescript
await trackCommunityAccess(true);
await trackCommunityAccess(false);
```
