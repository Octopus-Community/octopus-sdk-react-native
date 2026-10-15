# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).
It is how we record user-facing changes and drive version bumps + the
`CHANGELOG.md`.

## Adding a changeset

When your PR changes the public API or runtime behaviour, add a changeset:

```sh
yarn changeset
```

It asks for the bump level and the summary, then writes the
`.changeset/<name>.md` file. Commit that file with your PR.

Bump levels:

- **patch** — bug fix, no API change.
- **minor** — additive API (new method, new optional param, new event).
- **major** — breaking change (signature change, removal, behaviour change).

The file is plain markdown, so you can also write it by hand when answering an
interactive prompt isn't an option:

```md
---
'@octopus-community/react-native': patch
---

Fix `OctopusUIView` ignoring `interceptUrls` prop updates on Android.
```

Only changes that never reach the public mirror skip the changeset: `.claude/**`, `CLAUDE.md`
and `.github/**` (except the two templates) — the exemption list in
`.claude/rules/definition-of-done.md` is the authority. `CONTRIBUTING.md`, the READMEs and
`.changeset/**` are mirrored, so a change to them carries a `patch` changeset.

### Sample-only changes

A user-visible change to the example app is filed against
`@octopus-community/react-native` too, with a name starting `example-` and a
summary ending **"Sample only."** — so it lands in the library changelog,
clearly marked. The example workspace (`@octopus-community/react-native-example`)
is in `ignore` in `config.json` and is never versioned, so a changeset naming
only that package would reach no changelog. The sample ships to the public
mirror and to Play Internal Testing, so its changes are recorded where hosts
read, rather than lost.

## How a release happens

1. PRs land on `main`, each carrying its changeset(s).
2. The **Release** workflow automatically creates or updates a
   `chore(release): version packages` PR when changesets are pending — it consumes
   them, bumping `version` in `package.json` and prepending the entries to
   `CHANGELOG.md`. With no pending changesets, it creates no PR. Manual creation
   is a fallback only after a verified workflow or permissions error.
3. Merging that PR lands the version bump. Cutting a GitHub Release for the new
   tag triggers the npm publish (`release-publish.yml`).
