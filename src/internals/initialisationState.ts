// Parity wave — lifecycle
//
// Client-side, optimistic mirror of the SDK's initialised state. Mirrors the Flutter
// bridge's own `_lastIsInitialised` static field: there is no native round-trip, so this
// is deliberately best-effort — it reflects the last `initialize` / `switchCommunity` /
// `stop` call this JS instance made, not a live query of the native SDK.
//
// Flipped to `true` right after `initialize` / `switchCommunity` resolve, to `false` right
// after `stop` resolves. `reset()` does not touch it (the native SDK stays initialised
// after a reset).

let isInitialisedFlag = false;

/** @internal */
export function getIsInitialised(): boolean {
  return isInitialisedFlag;
}

/** @internal */
export function setIsInitialised(value: boolean): void {
  isInitialisedFlag = value;
}
