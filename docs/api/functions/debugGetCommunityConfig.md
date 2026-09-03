[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / debugGetCommunityConfig

# Function: debugGetCommunityConfig()

> **debugGetCommunityConfig**(): `Promise`\<[`OctopusDebugCommunityConfig`](../type-aliases/OctopusDebugCommunityConfig.md) \| `null`\>

Debug-only read of the community config the backend currently serves, so a
test app can display the live server state next to the API key it runs on.

Resolves `null` while no config has been fetched yet. That window is shorter
on Android, where the native SDK also serves the config persisted by a
previous run — treat a value here as "the last config the SDK fetched", not
as proof of a round-trip in this session. Not part of the stable public API
surface and not for use in production apps.

## Returns

`Promise`\<[`OctopusDebugCommunityConfig`](../type-aliases/OctopusDebugCommunityConfig.md) \| `null`\>
