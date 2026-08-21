[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusConnectionState

# Type Alias: OctopusConnectionState

> **OctopusConnectionState** = [`OctopusNotConnected`](../interfaces/OctopusNotConnected.md) \| [`OctopusConnected`](../interfaces/OctopusConnected.md)

Reactive snapshot of the SDK's user-connection state.

Exposed via [addConnectionStateListener](../functions/addConnectionStateListener.md) / [getConnectionState](../functions/getConnectionState.md). Mirrors the native
Android `ConnectionState` sealed interface (`NotConnected` / `Connected`). On iOS it is derived
from the native `profile` publisher, and the guest flag is read from the profile (native iOS
1.12.6+).

Discriminate on `connected`:

```typescript
if (state.connected) {
  console.log(state.isGuest ? 'guest session' : 'authenticated user');
}
```
