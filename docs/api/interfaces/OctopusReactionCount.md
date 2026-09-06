[**@octopus-community/react-native v1.13.3**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusReactionCount

# Interface: OctopusReactionCount

The number of reactions of a given kind on a post.

Mirrors the native `OctopusReactionCount`. A reaction kind absent from
[OctopusPost.reactions](OctopusPost.md#reactions) has a count of 0 — the native SDKs do not emit zero rows.

## Properties

### count

> `readonly` **count**: `number`

The number of reactions of [reactionKind](#reactionkind).

---

### reactionKind

> `readonly` **reactionKind**: [`OctopusReactionKind`](../type-aliases/OctopusReactionKind.md) \| `string` & `object`

The reaction this count is for.

Typed as an open string rather than a bare [OctopusReactionKind](../type-aliases/OctopusReactionKind.md): both native SDKs
model an `unknown` reaction kind for a server value they do not recognise, and this is a
**read** surface, so a value outside the union can genuinely arrive here. Such a kind is
delivered as the **raw server value** (the emoji the newer server sent), falling back to
the literal `'unknown'` only when that value is blank — so the field is never empty and no
information is dropped. [OctopusReactionKind](../type-aliases/OctopusReactionKind.md) itself stays closed because
[setReaction](../functions/setReaction.md) is a write surface where an unknown kind is simply refused.
