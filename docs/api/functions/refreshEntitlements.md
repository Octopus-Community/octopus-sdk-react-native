[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / refreshEntitlements

# Function: refreshEntitlements()

> **refreshEntitlements**(): `Promise`\<`void`\>

Forces a refresh of the connected user's entitlements from the server.

Entitlements are normally kept up to date automatically; call this only when you need an
up-to-date value synchronously — e.g. right after your app's own purchase/subscription flow
completes, before checking `OctopusGroup.canAccess` on a just-unlocked group.

## Returns

`Promise`\<`void`\>

A promise that resolves when entitlements have been refreshed.

## Throws

A [RefreshEntitlementsError](../interfaces/RefreshEntitlementsError.md) — see [isRefreshEntitlementsError](isRefreshEntitlementsError.md) to narrow it.

## Example

```typescript
try {
  await refreshEntitlements();
} catch (error) {
  if (isRefreshEntitlementsError(error)) {
    console.warn(
      `refreshEntitlements failed — ${error.code}: ${error.message}`
    );
  }
}
```
