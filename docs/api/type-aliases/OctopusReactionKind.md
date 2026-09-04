[**@octopus-community/react-native v1.13.2**](../README.md)

---

[@octopus-community/react-native](../README.md) / OctopusReactionKind

# Type Alias: OctopusReactionKind

> **OctopusReactionKind** = `"heart"` \| `"joy"` \| `"mouthOpen"` \| `"clap"` \| `"cry"` \| `"rage"`

The reactions a member can leave on a post.

Mirrors the native `OctopusReactionKind` values on both platforms (Android's
`OctopusReactionKind.{Heart,Joy,MouthOpen,Clap,Cry,Rage}` companion constants, iOS's
`OctopusReactionKind.{heart,joy,mouthOpen,clap,cry,rage}` enum cases) — this wrapper never
introduces its own reaction set.

## See

[setReaction](../functions/setReaction.md) – apply or remove a reaction on a post.
