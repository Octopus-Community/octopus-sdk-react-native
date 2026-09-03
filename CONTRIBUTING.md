# Contributing

## Development workflow

This project is a monorepo managed using [Yarn workspaces](https://yarnpkg.com/features/workspaces). It contains the following packages:

- The library package in the root directory.
- An example app in the `example/` directory.

To get started with the project, run `yarn` in the root directory to install the required dependencies for each package:

```sh
yarn
```

> Since the project relies on Yarn workspaces, you cannot use [`npm`](https://github.com/npm/cli) for development.

The [example app](example/) demonstrates usage of the library. You need to run it to test any changes you make.

It is configured to use the local version of the library, so any changes you make to the library's source code will be reflected in the example app. Changes to the library's JavaScript code will be reflected in the example app without a rebuild, but native code changes will require a rebuild of the example app.

If you want to use Android Studio or XCode to edit the native code, you can open the `example/android` or `example/ios` directories respectively in those editors. To edit the Objective-C or Swift files, open `example/ios/OctopusReactNativeSdkExample.xcworkspace` in XCode and find the source files at `Pods > Development Pods > OctopusReactNativeSdk`.

To edit the Java or Kotlin files, open `example/android` in Android studio and find the source files at `octopus-community-octopus-react-native-sdk` under `Android`.

You can use various commands from the root directory to work with the project.

To start the packager:

```sh
yarn example start
```

To run the example app on Android:

```sh
yarn example android
```

To run the example app on iOS:

```sh
yarn example ios
```

Make sure your code passes TypeScript and ESLint. Run the following to verify:

```sh
yarn test:types
yarn test:lint
```

To fix formatting errors, run the following:

```sh
yarn test:lint --fix
```

Remember to add tests for your change if possible. Run the unit tests by:

```sh
yarn test:unit
```

### Verifying an iOS compile

A change to the native code has to be proven by a real iOS build — TypeScript passing says
nothing about the bridge. `yarn example ios` does that and launches the app; when you only
need the compile to be green, building the workspace directly is enough and needs no
simulator:

Both commands below run from the repo root — the subshell around `pod install` is what keeps
that true:

```sh
(cd example/ios && pod install)
```

```sh
xcodebuild -workspace example/ios/OctopusReactNativeSdkExample.xcworkspace \
  -scheme OctopusReactNativeSdkExample -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

Do not skip `pod install` on the grounds that `Pods/` already exists: the `post_install` hook
in [example/ios/Podfile](example/ios/Podfile) is what patches the vendored `fmt` sources so
they compile under the Clang in Xcode 26. A `Pods/` directory installed before that hook
existed still fails the build with `call to consteval function ... is not a constant
expression` while compiling `fmt/src/format.cc`, long before any project file is reached.
Re-running `pod install` is the fix for that specific failure.

`yarn example ios:pod` runs the same step through `bundle exec pod`, the way CI does. It needs
a Ruby matching the floor in [example/Gemfile](example/Gemfile); where the default Ruby is
older, bundler fails outright and the plain `pod` above is the way through. Whichever you use,
check `git diff example/ios/Podfile.lock` afterwards and keep the `COCOAPODS:` line as you
found it: `example/Gemfile.lock` pins an older CocoaPods than the one that generated the
committed lockfile, so the two invocations disagree about that line and no guard catches the
drift — `scripts/__tests__/podfileLock.test.ts` only checks `PODFILE CHECKSUM`.

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes into documentation, e.g. add usage example for the module..
- `test`: adding or updating tests, e.g. add integration tests using detox.
- `chore`: tooling changes, e.g. change CI config.

Our pre-commit hooks verify that your commit message matches this format when committing.

### Linting and tests

[ESLint](https://eslint.org/), [Prettier](https://prettier.io/), [TypeScript](https://www.typescriptlang.org/)

We use [TypeScript](https://www.typescriptlang.org/) for type checking, [ESLint](https://eslint.org/) with [Prettier](https://prettier.io/) for linting and formatting the code, and [Jest](https://jestjs.io/) for testing.

Our pre-commit hooks verify that the linter and tests pass when committing.

### Publishing to npm

Versioning is driven by [changesets](https://github.com/changesets/changesets); the npm publish is triggered by a GitHub Release:

1. In your pull request, add a changeset in `.changeset/` recording the bump level (patch, minor or major) and the changelog entry for your change. See [.changeset/README.md](.changeset/README.md) for the format.
2. Once merged into `main`, the release workflow (`.github/workflows/release.yml`) keeps a `chore(release): version packages` pull request up to date, consuming the pending changesets. A maintainer opens that pull request once per release cycle; it is then left open so the workflow has something to update.
3. That pull request already carries the version bump in `package.json` and the new `CHANGELOG.md` entries; merging it lands them on `main`.
4. Publish a new release on GitHub for the bumped version, tagged with the version number (e.g. `1.2.3`), that describes notable changes and documents breaking changes. This triggers the publish workflow (`.github/workflows/release-publish.yml`), which publishes to npm and picks the dist-tag: `next` for `rc`, `alpha` and `beta` tags, `latest` otherwise.

> Do not run `yarn release:publish` manually: no workflow invokes it, and publishing from a local machine sidesteps the publish workflow and the dist-tag routing above.

### Scripts

The `package.json` file contains various scripts for common tasks:

- `yarn`: setup project by installing dependencies.
- `yarn test:types`: type-check files with TypeScript.
- `yarn test:lint`: lint files with ESLint.
- `yarn test:unit`: run unit tests with Jest.
- `yarn prepare`: build the distributable (the `lib/` module and its type declarations) with
  [`react-native-builder-bob`](https://github.com/callstack/react-native-builder-bob), and
  regenerate the API reference under `docs/api` with TypeDoc. Those documentation pages are
  committed to the repository, so run this and commit the result whenever you change anything the
  reference covers — an export or its TSDoc comment. CI runs the same command and fails if the
  generated docs are out of date.
- `yarn changeset`: record a user-facing change for the next release.
- `yarn example start`: start the Metro server for the example app.
- `yarn example android`: run the example app on Android.
- `yarn example ios`: run the example app on iOS.

The example app reads its credentials from `example/.env` (see `example/.env.dist` for the
expected keys). Octopus-internal contributors can generate that file and launch in one step
with `scripts/run-sample.sh` (`android` by default, or `ios` / `env-only`), which fills every
key — demo API keys, named Config-picker keys, and the four pre-signed SSO tokens — from the
internal shared secrets file. That script is internal-only and deliberately excluded from the
public mirror; external contributors fill `example/.env` by hand from `.env.dist`. Values are
inlined at Babel time, so restart a running Metro with `yarn example start:reset` after
regenerating the file.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.
