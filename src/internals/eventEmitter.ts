import { NativeEventEmitter } from 'react-native';
import { OctopusReactNativeSdk } from './nativeModule';

export const eventEmitter = new NativeEventEmitter(OctopusReactNativeSdk);
