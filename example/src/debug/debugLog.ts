import { useEffect, useState } from 'react';

/** Whether an entry came from the SDK's event stream or from a call the sample made. */
export type DebugEntryKind = 'event' | 'api';

/** One line of the in-app debug console. */
export interface DebugEntry {
  id: number;
  kind: DebugEntryKind;
  /** Short headline — the event name, or the API method the sample called. */
  label: string;
  /** Payload / outcome, rendered under the label and copied verbatim. */
  detail: string;
  /** Epoch millis, formatted as a wall clock by the console. */
  at: number;
}

/**
 * Process-wide recorder behind the Debug console — the reference sample's
 * `debugLog`.
 *
 * One merged, reverse-chronological buffer of SDK events and of the API calls
 * the sample fires, so a QA run has a single place to read what happened. It
 * lives outside React so a call logged from an effect or a promise callback is
 * never lost to an unmounted component, and it is bounded: only the most recent
 * {@link DebugLog.maxEntries} lines are kept, which keeps a long session from
 * growing without limit.
 */
class DebugLog {
  readonly maxEntries = 300;

  private entries: DebugEntry[] = [];
  private nextId = 1;
  private listeners = new Set<() => void>();

  /** The buffer, newest first. */
  get all(): DebugEntry[] {
    return this.entries;
  }

  /** Records an SDK event. */
  event(label: string, detail: string) {
    this.push('event', label, detail);
  }

  /** Records a call the sample made, and its outcome. */
  apiCall(label: string, detail: string) {
    this.push('api', label, detail);
  }

  clear() {
    this.entries = [];
    this.notify();
  }

  /**
   * The whole buffer as a JSON array, oldest first — what Copy as JSON puts on the
   * clipboard.
   *
   * JSON rather than the plain text above because the export's reader is a bug report or a
   * QA run: a structured payload can be diffed, filtered and pasted into a ticket without
   * anyone re-parsing timestamps out of a prose line. `at` stays ISO-8601 UTC (the rows on
   * screen are local time, which is a different job) and the internal `id` is dropped —
   * it is a React key, not information about the session.
   */
  exportJson(): string {
    return JSON.stringify(
      this.entries
        .slice()
        .reverse()
        .map((e) => ({
          at: new Date(e.at).toISOString(),
          source: e.kind === 'api' ? 'HOST' : 'SDK',
          label: e.label,
          detail: e.detail,
        })),
      null,
      2
    );
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private push(kind: DebugEntryKind, label: string, detail: string) {
    this.entries = [
      { id: this.nextId++, kind, label, detail, at: Date.now() },
      ...this.entries,
    ].slice(0, this.maxEntries);
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

/** The single recorder every screen writes to and the Debug console reads. */
export const debugLog = new DebugLog();

/** Subscribes a component to {@link debugLog}, re-rendering on every write. */
export function useDebugLog(): DebugEntry[] {
  const [entries, setEntries] = useState<DebugEntry[]>(debugLog.all);
  useEffect(() => debugLog.subscribe(() => setEntries(debugLog.all)), []);
  return entries;
}
