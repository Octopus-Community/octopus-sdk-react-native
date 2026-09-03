[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / connectUser

# Function: connectUser()

> **connectUser**(`params`): `Promise`\<`void`\>

Connects a user using SSO authentication.

This function establishes a connection between your app's user and Octopus. It requires that you
have configured SSO mode during SDK initialization and have set up a token provider using
`useUserTokenProvider` or `addUserTokenRequestListener`. The token is obtained via your token
provider; you do not pass it directly to `connectUser`. Call `connectUser` after the user logs in;
call `disconnectUser` when they log out.

The returned promise settles on the **outcome** of the connection, not on the request being
sent: it resolves once the native SDK has authenticated the user, and rejects with a
[ConnectUserErrorCode](../type-aliases/ConnectUserErrorCode.md) when the connection is refused — a banned user, a token the
backend will not accept, no network. Always handle the rejection: a swallowed one leaves the
user anonymous while your app believes it connected them, which shows up as a login screen
that "does nothing" and a community that keeps asking for an account.

Because the promise waits for that outcome, the token provider must already be registered
when you call this — the native SDK requests the JWT during the call, and the request is
dropped if nothing is listening for it. An unanswered request fails the call with
`TOKEN_REQUEST_TIMEOUT` after 60 s rather than hanging.

## Parameters

### params

[`ConnectUserParams`](../interfaces/ConnectUserParams.md)

User id and optional profile (username, profilePicture, biography). See [ConnectUserParams](../interfaces/ConnectUserParams.md).

## Returns

`Promise`\<`void`\>

A promise that resolves when the user is connected.

## Throws

A [ConnectUserError](../interfaces/ConnectUserError.md) carrying a [ConnectUserErrorCode](../type-aliases/ConnectUserErrorCode.md) — `USER_BANNED`,
`MISSING_TOKEN`, `INVALID_TOKEN`, `NO_NETWORK`, … — when the native SDK refuses the
connection, the SDK is not initialized, or SSO is not configured. Narrow it with
[isConnectUserError](isConnectUserError.md).

## See

- [useUserTokenProvider](useUserTokenProvider.md) – provide JWT from React components.
- [addUserTokenRequestListener](addUserTokenRequestListener.md) – provide JWT without React.
- [disconnectUser](disconnectUser.md) – disconnect the current user.
- [ConnectUserErrorCode](../type-aliases/ConnectUserErrorCode.md) – every refusal reason, and which platform reports it.

## Example

```typescript
try {
  await connectUser({
    userId: 'unique-user-id-from-your-backend',
    profile: {
      username: 'john_doe',
      profilePicture: 'https://example.com/avatar.jpg',
      biography: 'Software developer',
    },
  });
} catch (error) {
  if (isConnectUserError(error) && error.code === 'USER_BANNED') {
    // `message` is the backend's reason and can be shown as-is.
    showBlockingMessage(error.message);
  } else {
    // Still anonymous — tell the user, and do not send them back to the login screen
    // expecting a different result.
    showRetryableError();
  }
}
```
