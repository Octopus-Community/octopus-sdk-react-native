[**@octopus-community/react-native v1.13.0**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusInitialScreenProfile

# Interface: OctopusInitialScreenProfile

A member's Octopus profile, or — with `clientUserId` omitted — the
connected user's own, editable profile.

## Properties

### clientUserId?

> `optional` **clientUserId**: `string`

Your app's own id for the member whose profile to display (the id passed
to [connectUser](../functions/connectUser.md)), resolved through the SDK's client-user-id lookup
(requires the community to expose client user ids). An id that does not
resolve shows an error / unavailable state — it never falls back to the
connected user's own profile.

Omit it — or pass a blank / whitespace-only string, which counts as no id
at all — for the connected user's **own** profile, with its edit
affordances (the `editUser` event fires your edit flow).

There is deliberately no Octopus-profile-id variant: the iOS native
profile screen has no such form. Holding only an Octopus id, open the
member's posts instead with `{ type: 'activity', member: { profileId } }`.

---

### type

> **type**: `"profile"`
