[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / useBridgeShareTokenProvider

# Function: useBridgeShareTokenProvider()

> **useBridgeShareTokenProvider**(`bridgeShareTokenProvider`): `void`

React hook that registers a signer for prefilled-share images.

Only communities configured to **forbid member pictures** need this: there, the server
rejects a prefilled post carrying an image unless the payload is signed. Hosts whose
community allows member pictures can skip the hook entirely — nothing else changes when it
is absent, and prefilled shares keep being sent unsigned.

The hook manages the subscription lifecycle and ensures the latest provider is always used,
exactly like [useUserTokenProvider](useUserTokenProvider.md). Register it once, high in the tree, before the
host calls [navigateToOctopusCreatePost](navigateToOctopusCreatePost.md) — the editor reads whether a signer exists
when it opens.

### Platform difference on a declined signature

Returning `null` (or throwing) means "I will not sign this one".

- **Android** publishes the post unsigned, and a pictures-off community then rejects it
  server-side.
- **iOS** fails the publish client-side instead: the native signing hook has no
  "proceed unsigned" channel, so the editor stays open with an error rather than sending an
  empty token.

Both end in a failed publish for the case that matters, but the error surfaces from a
different side. Return a real token for every request you intend to succeed.

## Parameters

### bridgeShareTokenProvider

[`BridgeShareTokenProvider`](../type-aliases/BridgeShareTokenProvider.md)

## Returns

`void`

## Example

```typescript
useBridgeShareTokenProvider(async (bridgeFingerprint) => {
  const response = await fetch(
    'https://your-backend.example/octopus/bridge-signature',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bridgeFingerprint }),
    }
  );
  if (!response.ok) return null;
  const { token } = await response.json();
  return token;
});
```
