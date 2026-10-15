// Use the package's self export so this resolves in both src/ and the built lib/ tree.
// Changesets updates this value through package.json without regenerating native code.
import { version } from '@octopus-community/react-native/package.json';

export const sdkVersion = version;
