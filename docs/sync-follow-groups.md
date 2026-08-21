# `syncFollowGroups`

Batch follow / unfollow groups in a single round-trip.

For a single group at a time, see [`followGroup`](./api/functions/followGroup.md) /
[`unfollowGroup`](./api/functions/unfollowGroup.md) instead — on iOS they are a thin wrapper
around this same call with one action, so the statuses and errors documented below apply to
them too.

```ts
import {
  syncFollowGroups,
  SyncFollowGroupStatus,
} from '@octopus-community/react-native';

const results = await syncFollowGroups([
  { groupId: 'g1', followed: true,  actionDate: new Date() },
  { groupId: 'g2', followed: false, actionDate: new Date() },
]);

for (const r of results) {
  switch (r.status) {
    case SyncFollowGroupStatus.Applied: /* ... */ break;
    case SyncFollowGroupStatus.Skipped: /* server has a newer timestamp */ break;
    case SyncFollowGroupStatus.GroupNotFound: /* ... */ break;
    // ...
  }
}
```

## Contract

- Requires a connected user — rejects with code `not_connected` otherwise.
- Each action carries its own `actionDate`. The backend rejects (status:
  `skipped`) actions older than the most recent action it has stored for the
  same group.
- Match results to inputs by `groupId` — order is **not** guaranteed.
- An empty `actions` list resolves to `[]` immediately without crossing the bridge.

## Statuses

| Status (TS enum) | Wire value | Meaning |
|---|---|---|
| `Applied` | `applied` | Action was applied. |
| `Skipped` | `skipped` | Server has a newer action for this group. |
| `GroupNotFound` | `group_not_found` | Group does not exist. |
| `NotFollowable` | `not_followable` | Group cannot be followed (e.g. private). |
| `NotUnfollowable` | `not_unfollowable` | Essential / force-followed group. |
| `AlreadyFollowed` | `already_followed` | No-op — already in this state. |
| `AlreadyUnfollowed` | `already_unfollowed` | No-op — already in this state. |
| `UnknownError` | `unknown_error` | Native returned a status this SDK doesn't recognize (forward-compat fallback). |

## Errors

RPC-level failures reject the promise with a native error code:

- `not_connected` — no connected user.
- `no_network` — offline.
- `server` — backend returned an error.
- `other` — anything else.
