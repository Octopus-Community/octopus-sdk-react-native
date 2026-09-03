[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / ConnectUserErrorCode

# Type Alias: ConnectUserErrorCode

> **ConnectUserErrorCode** = `"USER_BANNED"` \| `"MISSING_TOKEN"` \| `"INVALID_TOKEN"` \| `"PROFILE_ERROR"` \| `"COMMUNITY_ACCESS_DENIED"` \| `"NO_NETWORK"` \| `"SERVER_ERROR"` \| `"USER_NOT_AUTHENTICATED"` \| `"PERMISSION_DENIED"` \| `"CONTENT_UNAVAILABLE"` \| `"TOKEN_REQUEST_CANCELLED"` \| `"TOKEN_REQUEST_TIMEOUT"` \| `"CONNECT_USER_ERROR"`

Reason a [connectUser](../functions/connectUser.md) call was refused, carried as the `code` of the rejected error.

A failed connection leaves the user **unauthenticated**: the community keeps showing the
anonymous profile and every action that requires an account keeps asking for a login. Handle
these codes — a swallowed rejection is indistinguishable from a successful connection.

The two native SDKs classify failures differently, so a code is not necessarily reachable on
both platforms. Branch on the codes you care about and treat anything else as a generic
failure rather than assuming a platform emits a specific one:

| Code                      | Meaning                                                                                                                                                                                                                                                                                                                                                | Emitted on               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| `USER_BANNED`             | The user is banned from the community. The error `message` is the backend's reason and is meant to be displayed.                                                                                                                                                                                                                                       | Android, iOS             |
| `MISSING_TOKEN`           | The token provider returned nothing usable — including an **empty string**, which the native SDK treats as no token.                                                                                                                                                                                                                                   | Android                  |
| `INVALID_TOKEN`           | The JWT was rejected: bad signature or algorithm. Usually a backend signing problem.                                                                                                                                                                                                                                                                   | iOS                      |
| `PROFILE_ERROR`           | The profile sent alongside the user was rejected (banned word, name taken, picture too big…).                                                                                                                                                                                                                                                          | Android, iOS             |
| `COMMUNITY_ACCESS_DENIED` | The user has no access to this community.                                                                                                                                                                                                                                                                                                              | iOS                      |
| `NO_NETWORK`              | No network connection was available. Retryable.                                                                                                                                                                                                                                                                                                        | Android, iOS             |
| `SERVER_ERROR`            | The Octopus backend answered with an error. This is a catch-all for statuses the native SDK does not classify further, so it covers both transient failures and permanent ones (a malformed request, an unimplemented call) — read `message` before deciding to retry.                                                                                 | Android, iOS             |
| `USER_NOT_AUTHENTICATED`  | The backend refused the call as unauthenticated.                                                                                                                                                                                                                                                                                                       | Android                  |
| `PERMISSION_DENIED`       | The backend refused the call as unauthorised.                                                                                                                                                                                                                                                                                                          | Android                  |
| `CONTENT_UNAVAILABLE`     | The requested content was unavailable.                                                                                                                                                                                                                                                                                                                 | Android                  |
| `TOKEN_REQUEST_CANCELLED` | No token was ever signed, because `cancelUserTokenRequest` was called — or because `disconnectUser` cancelled the pending request while the connection was still in flight.                                                                                                                                                                            | Android, iOS (see below) |
| `TOKEN_REQUEST_TIMEOUT`   | The `userTokenRequest` event went unanswered for 60 s. Nothing is listening, or a listener received the request and never called `completeUserTokenRequest` / `cancelUserTokenRequest`. Register the listener **before** calling `connectUser`: the native event channel has no buffer, so a request emitted while no listener is attached is dropped. | Android, iOS (see below) |
| `CONNECT_USER_ERROR`      | Anything else, including an unclassified native failure and — on iOS — calling `connectUser` before `initialize`.                                                                                                                                                                                                                                      | Android, iOS             |

### iOS: a token that never arrives does not always reject

On Android the two token-request codes are the only possible outcome of an unanswered or declined
request. On iOS they are best-effort: when the request fails and no user is connected yet, the
native SDK falls back to connecting as a guest, and a successful guest connection makes
`connectUser` **resolve** even though your SSO user was not connected. The rejection does arrive
when a connection was already established — reconnecting a user after a previous failure, for
instance.

A resolved promise therefore means "the SDK is usable", not "your SSO user is authenticated", and
this version exposes no connection-state accessor to tell the two apart. What is actionable is the
cause: answer every `userTokenRequest`, and register the listener before calling `connectUser`.

## See

- [ConnectUserError](../interfaces/ConnectUserError.md) – the shape of the rejected error.
- [isConnectUserError](../functions/isConnectUserError.md) – narrow an unknown caught value.
