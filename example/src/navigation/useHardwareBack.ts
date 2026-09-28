import { useEffect, useLayoutEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import {
  appBackDispatcher,
  type BackDispatcher,
  type BackHandlerFn,
  type BackLevel,
} from './backDispatcher';

/**
 * Registers what this component's own on-screen Back would do with the sample's one Back
 * dispatcher, for as long as the component is mounted.
 *
 * The handler is read through a ref, so it always sees the render's current state: a
 * registration that captured the first render's closure would keep answering "nothing to pop"
 * after the user had opened a sub-page. The ref is refreshed in a layout effect (every commit,
 * before any input event can reach the dispatcher) rather than during render, so a render React
 * throws away never leaves its closure behind.
 */
export function useHardwareBack(
  level: BackLevel,
  handler: BackHandlerFn,
  dispatcher: BackDispatcher = appBackDispatcher
): void {
  const handlerRef = useRef(handler);
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });
  useEffect(
    () => dispatcher.register(level, () => handlerRef.current()),
    [dispatcher, level]
  );
}

/**
 * Installs the ONE platform listener that routes the Android hardware / gesture Back into the
 * dispatcher. Mounted once, by `App`. A no-op on iOS, which has no hardware Back.
 */
export function useHardwareBackListener(
  dispatcher: BackDispatcher = appBackDispatcher
): void {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () =>
      dispatcher.dispatch()
    );
    return () => subscription.remove();
  }, [dispatcher]);
}
