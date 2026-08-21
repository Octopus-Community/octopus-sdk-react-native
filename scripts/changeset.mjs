#!/usr/bin/env node
// Wrapper around the `changeset` CLI — every changesets command goes through it.
//
// The SDK lives in the root package.json, but changesets only sees packages
// matched by the `workspaces` globs — and turborepo rejects "." as a permanent
// workspace (the root turbo.json would be read as an invalid package-level
// config). Bridge the two: widen the workspace view to include the root only
// while the command runs, then restore it.
//
// Without this, `changeset add` fails with "No versionable packages found" and
// `changeset version` has nothing to bump.
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const PKG = new URL('../package.json', import.meta.url);
const PKG_TMP = new URL('../package.json.changeset-tmp', import.meta.url);

const read = () => JSON.parse(readFileSync(PKG, 'utf8'));

// Write through a sibling temp file and rename: `rename(2)` is atomic within a
// filesystem, so package.json is never observed truncated. Both matter — jest
// suites read it from parallel workers while this runs, and a crash between a
// truncate and a write would leave the release scripts with invalid JSON.
const write = (pkg) => {
  writeFileSync(PKG_TMP, JSON.stringify(pkg, null, 2) + '\n');
  renameSync(PKG_TMP, PKG);
};

// A bare `changeset` means `add`; spell it out so what we forward is explicit.
const forwarded = process.argv.slice(2);
const command = forwarded.length > 0 ? forwarded : ['add'];

const before = read();
const hadWorkspaces = 'workspaces' in before;
const workspaces = before.workspaces ?? [];

let pkg = read();
pkg.workspaces = ['.', ...workspaces];
write(pkg);

// `changeset add` prompts on stdin and stdio is inherited, so a Ctrl+C reaches
// this process too. Swallow it here and let the child exit on its own —
// otherwise we die before the `finally` below restores package.json. The cost
// is that only SIGKILL stops the wrapper itself while a command is running.
const swallow = () => {};
process.on('SIGINT', swallow);
process.on('SIGTERM', swallow);

let status = 1;
try {
  // `yarn exec` runs the binary directly. Going through `yarn changeset` would
  // re-enter the package.json script that invokes this wrapper.
  status =
    spawnSync('yarn', ['exec', 'changeset', ...command], { stdio: 'inherit' })
      .status ?? 1;
} finally {
  // Re-read before restoring: `changeset version` rewrites package.json
  // (version bump) and that change must survive.
  pkg = read();
  if (hadWorkspaces) {
    pkg.workspaces = workspaces;
  } else {
    delete pkg.workspaces;
  }
  write(pkg);
  process.off('SIGINT', swallow);
  process.off('SIGTERM', swallow);
}

process.exit(status);
