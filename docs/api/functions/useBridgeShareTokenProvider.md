[**@octopus-community/react-native v1.16.0**](../README.md)

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

### Declining a signature

Returning `null`, throwing, or not answering within 60 seconds means "I will not sign this
one". On both platforms the post is then sent unsigned and the server decides: a community
that allows member pictures publishes it with its images, one that forbids them refuses it
and the editor shows an error. Return a real token for every request that must succeed in a
pictures-off community.

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
