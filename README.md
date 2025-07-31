# @octopus-community/react-native

React Native module for the Octopus Community [Android](https://github.com/Octopus-Community/octopus-sdk-android) and [Swift](https://github.com/Octopus-Community/octopus-sdk-swift) SDKs

- [Installation](#installation)
  - [iOS setup](#ios-setup)
  - [Compatibility table](#compatibility-table)
- [Usage](#usage)
  - [Initialization](#initialization)
  - [Show the UI](#show-the-ui)
  - [API docs](./docs/api/README.md)
  - [Example app](./example)
- [Troubleshooting](#troubleshooting)

## Installation

```sh
npm install @octopus-community/react-native
```

### iOS setup

Make sure to `use_frameworks` in your `Podfile`.

```ruby
# Podfile
linkage = :static # or :dynamic
if linkage != nil
  Pod::UI.puts "Configuring Pod with #{linkage}ally linked Frameworks".green
  use_frameworks! :linkage => linkage.to_sym
end
```

Due to a bug in XCode 15, you might need to set `ENABLE_USER_SCRIPT_SANDBOXING` to YES and then to NO in order to compile (see [this issue](https://github.com/CocoaPods/CocoaPods/issues/11946#issuecomment-1948423786)).

### Compatibility table

| React Native version(s) | Android | iOS   | Old arch | New arch      | Supporting version(s) |
|-------------------------| ------- |-------| -------- | ------------- | --------------------- |
| v0.78+                  | 5.0+    | 14.0+ | ✅       | Interop layer | v1+                   |

* Older React Native versions might be supported but were untested
* New arch is currently supported with the interoperability layer
* Other requirements for current version:
  * Android
    * Kotlin version 2
  * iOS
    * XCode 16.0+

### Expo

An expo plugin will be available shortly.

## Usage

### Initialization

Initialize the SDK with your API key with [`initialize`](./docs/api/functions/initialize.md).

Choose whether your app or Octopus handles user authentification:

#### Octopus-handled authentification

```ts
import { initialize } from '@octopus-community/react-native';

await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: { type: 'octopus' }
});
```

#### Single Sign-On (SSO)

For SSO mode:

* your app manages user authentication and certain profile fields. You specify which profile fields your app will handle directly
* you need to provide a token provider function that returns a valid JWT token for the authenticated user.
  * use the `useUserTokenProvider` hook in React components:

```ts
import {
  initialize,
  addEditUserListener,
  addLoginRequiredListener,
  connectUser,
  disconnectUser,
  useUserTokenProvider,
  closeUI,
} from '@octopus-community/react-native';

// Initialize with SSO mode
await initialize({
  apiKey: 'YOUR_OCTOPUS_API_KEY',
  connectionMode: {
    type: 'sso',
    appManagedFields: ['username', 'profilePicture', 'biography']
  }
});

// Listen for when authentication is required
const loginRequiredSubscription = addLoginRequiredListener(() => {
  // Navigate to your app's login screen
  console.log('User needs to log in');
  closeUI();
});

// Listen for when users want to edit their profile
const editUserSubscription = addEditUserListener(({ fieldToEdit }) => {
  // Navigate to your app's profile editing screen
  // for the specific field (username, profilePicture, etc.)
  console.log(`User wants to edit: ${fieldToEdit}`);
  closeUI();
});

// Set up token provider (in a React component)
useUserTokenProvider(async () => {
  const token = await refreshUserToken();
  return token;
});

// Connect a user after they log in
await connectUser({
  userId: 'unique-user-id',
  profile: {
    username: 'john_doe',
    profilePicture: 'https://example.com/avatar.jpg',
    biography: 'Software developer',
    legalAgeReached: true,
  },
});

// Disconnect the user when they log out
await disconnectUser();

// Cleanup listeners when appropriate (eg. in return of a useEffect)
loginRequiredSubscription.remove();
editUserSubscription.remove();
```

### Show the UI

Show the Octopus home screen with the [`openUI()`](./docs/api/functions/openUI.md) method.

Future versions of this React Native module will let you show the UI in your React components. Please reach out if you need this prioritized.

### API docs

For details about the Typescript API, head to the [API docs](./docs/api/README.md).

### Example app

Take a look at our [example app](./example/src/App.tsx).

## Troubleshooting

Any error that might be intercepted by the React Native module will be rejected in the methods you call. If it cannot be intercepted, you may see the underlying SDK's logs in your native logs.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.
