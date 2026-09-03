[**@octopus-community/react-native v1.13.1**](../README.md)

---

[@octopus-community/react-native](../README.md) / ClientPostErrorCode

# Type Alias: ClientPostErrorCode

> **ClientPostErrorCode** = `"TEXT_MISSING"` \| `"TEXT_TOO_LONG"` \| `"FILE_EMPTY"` \| `"FILE_TOO_LARGE"` \| `"FILE_BAD_FORMAT"` \| `"FILE_UPLOAD"` \| `"FILE_DOWNLOAD"` \| `"MISSING_OBJECT_ID"` \| `"MISSING_CTA"` \| `"POST_UNAVAILABLE"` \| `"POST_NOT_FOUND"` \| `"POST_ALREADY_EXISTS"` \| `"INVALID_GROUP_ID"` \| `"INVALID_AUTHOR"` \| `"TOKEN_INVALID"` \| `"TOKEN_EXPIRED"` \| `"NO_NETWORK"` \| `"NOT_CONNECTED"` \| `"SERVER_ERROR"` \| `"CLIENT_POST_ERROR"` \| `"INVALID_ARGS"` \| `"START_OBSERVING_CLIENT_OBJECT_POST_ERROR"`

Reason a client-object bridge call was refused, carried as the `code` of the rejected
error.

The first sixteen codes are content/validation failures produced by the native
`ClientPostError` hierarchy. Then come the connection-level outcomes both bridges flatten
into the same rejection, following the [SetReactionErrorCode](SetReactionErrorCode.md) precedent, and finally
the two the bridge raises itself: `INVALID_ARGS`, and the one code that belongs to
[addClientObjectRelatedPostListener](../functions/addClientObjectRelatedPostListener.md) rather than to
[fetchOrCreateClientObjectRelatedPost](../functions/fetchOrCreateClientObjectRelatedPost.md).

| Code                                       | Meaning                                                                                                                                                                                                                                                                               | Emitted on   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `TEXT_MISSING`                             | The post text is missing or empty.                                                                                                                                                                                                                                                    | Android      |
| `TEXT_TOO_LONG`                            | The post text exceeds the maximum character limit (5000).                                                                                                                                                                                                                             | Android      |
| `FILE_EMPTY`                               | The attached image file is empty.                                                                                                                                                                                                                                                     | Android      |
| `FILE_TOO_LARGE`                           | The attached image exceeds the maximum allowed size.                                                                                                                                                                                                                                  | Android      |
| `FILE_BAD_FORMAT`                          | The attached image format is unsupported or the file is corrupted.                                                                                                                                                                                                                    | Android      |
| `FILE_UPLOAD`                              | Uploading the attached image failed.                                                                                                                                                                                                                                                  | Android      |
| `FILE_DOWNLOAD`                            | Downloading the remote image failed.                                                                                                                                                                                                                                                  | Android      |
| `MISSING_OBJECT_ID`                        | `objectId` is missing or empty.                                                                                                                                                                                                                                                       | Android      |
| `MISSING_CTA`                              | `viewObjectButtonText` is required for this community and was not supplied.                                                                                                                                                                                                           | Android      |
| `POST_UNAVAILABLE`                         | The post exists but is unavailable — moderated, or deleted.                                                                                                                                                                                                                           | Android      |
| `POST_NOT_FOUND`                           | No post exists yet for this object and it could not be created.                                                                                                                                                                                                                       | Android      |
| `POST_ALREADY_EXISTS`                      | A post already exists for this object.                                                                                                                                                                                                                                                | Android      |
| `INVALID_GROUP_ID`                         | `groupId` does not match a group of your community.                                                                                                                                                                                                                                   | Android      |
| `INVALID_AUTHOR`                           | The connected user is not authorised to create posts for this object.                                                                                                                                                                                                                 | Android      |
| `TOKEN_INVALID`                            | The bridge signature returned by your token provider is invalid or malformed.                                                                                                                                                                                                         | Android      |
| `TOKEN_EXPIRED`                            | The bridge signature returned by your token provider has expired.                                                                                                                                                                                                                     | Android      |
| `NO_NETWORK`                               | No network connection was available. Retryable.                                                                                                                                                                                                                                       | Android, iOS |
| `NOT_CONNECTED`                            | No user is connected, or the backend refused the call as unauthenticated / unauthorised.                                                                                                                                                                                              | Android      |
| `SERVER_ERROR`                             | The Octopus backend answered with an error.                                                                                                                                                                                                                                           | Android, iOS |
| `CLIENT_POST_ERROR`                        | Anything else, including every failure iOS does not classify.                                                                                                                                                                                                                         | Android, iOS |
| `INVALID_ARGS`                             | The `clientPost` argument is unusable — `objectId` or `text` missing or blank, or an `attachment` that resolves to no image. Rejected by the bridge before the native SDK is called, so no post is created.                                                                           | Android, iOS |
| `START_OBSERVING_CLIENT_OBJECT_POST_ERROR` | [addClientObjectRelatedPostListener](../functions/addClientObjectRelatedPostListener.md) could not start its observation — in practice, `initialize()` has not run yet. Not produced by [fetchOrCreateClientObjectRelatedPost](../functions/fetchOrCreateClientObjectRelatedPost.md). | Android, iOS |

## Why the "Emitted on" column is lopsided

The two native SDKs do not expose the same amount of detail, and this wrapper reports what
each one actually gives rather than inventing a classification.

- **Android** returns the full `ClientPostError` hierarchy — 21 leaf types, which the bridge
  folds onto the 16 content codes above (the four `…Unknown` leaves and `OtherError` all
  collapse to `CLIENT_POST_ERROR`, exactly as the Flutter plugin folds them onto its `other`
  wire tag).
- **iOS** publishes only four `ClientPostError` cases, and the fields of its
  `ValidationError` are not public — only a debug description is reachable. So every
  validation failure surfaces as `CLIENT_POST_ERROR` with the native description as its
  message, and only `NO_NETWORK` / `SERVER_ERROR` / `CLIENT_POST_ERROR` are ever produced.

Write the `catch` against `CLIENT_POST_ERROR` as the always-possible outcome, and treat the
fine-grained codes as extra information you get on Android.

## See

- [ClientPostError](../interfaces/ClientPostError.md) – the shape of the rejected error.
- [isClientPostError](../functions/isClientPostError.md) – narrow an unknown caught value.
