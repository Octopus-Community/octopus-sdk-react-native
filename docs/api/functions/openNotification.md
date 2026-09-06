[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / openNotification

# Function: openNotification()

> **openNotification**(`notification`, `options?`): `Promise`\<`void`\>

Opens the Octopus UI at the deep-linked content carried by the
notification (e.g. a specific post or comment).

Designed for push-tap handlers: combine with `isOctopusNotification` and
`getOctopusNotification` to parse the platform push payload first.

```ts
messaging().onNotificationOpenedApp((msg) => {
  if (!isOctopusNotification(msg.data)) return;
  const notif = getOctopusNotification(msg.data);
  if (notif) openNotification(notif);
});
```

## Parameters

### notification

[`OctopusNotification`](../type-aliases/OctopusNotification.md)

The parsed Octopus notification to open on.

### options?

[`OpenNotificationOptions`](../type-aliases/OpenNotificationOptions.md)

Optional; only [OpenUIOptions.onBackRequested](../interfaces/OpenUIOptions.md#onbackrequested) today, with the
same contract and the same last-write-wins registration as on `openUI` — the UI still
closes itself, and omitting it clears any previous registration.

## Returns

`Promise`\<`void`\>
