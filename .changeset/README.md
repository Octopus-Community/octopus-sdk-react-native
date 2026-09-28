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

Docs-only, CI, and other non-user-facing changes don't need a changeset.

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
2. The **Release** workflow keeps a `chore(release): version packages` PR up to
   date — it consumes the pending changesets, bumping `version` in `package.json`
   and prepending the entries to `CHANGELOG.md`. A maintainer opens that PR once
   per release cycle; it is then left open so the workflow has something to
   update.
3. Merging that PR lands the version bump. Cutting a GitHub Release for the new
   tag triggers the npm publish (`release-publish.yml`).
