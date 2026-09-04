[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / SetReactionErrorCode

# Type Alias: SetReactionErrorCode

> **SetReactionErrorCode** = `"UNKNOWN_REACTION"` \| `"POST_NOT_FOUND"` \| `"NO_NETWORK"` \| `"NOT_CONNECTED"` \| `"SERVER_ERROR"` \| `"SET_REACTION_ERROR"`

Reason a [setReaction](../functions/setReaction.md) call was refused, carried as the `code` of the rejected error.

| Code                 | Meaning                                                                                         | Emitted on   |
| -------------------- | ----------------------------------------------------------------------------------------------- | ------------ |
| `UNKNOWN_REACTION`   | The reaction kind is not one of the values [OctopusReactionKind](OctopusReactionKind.md) lists. | Android, iOS |
| `POST_NOT_FOUND`     | The post id does not exist, or the current user has no read access to it.                       | Android, iOS |
| `NO_NETWORK`         | No network connection was available. Retryable.                                                 | Android, iOS |
| `NOT_CONNECTED`      | No user is connected (or the backend refused the call as unauthenticated / unauthorised).       | Android, iOS |
| `SERVER_ERROR`       | The Octopus backend answered with an error.                                                     | Android, iOS |
| `SET_REACTION_ERROR` | Anything else, including an unclassified native failure.                                        | Android, iOS |

## See

- [SetReactionError](../interfaces/SetReactionError.md) – the shape of the rejected error.
- [isSetReactionError](../functions/isSetReactionError.md) – narrow an unknown caught value.
