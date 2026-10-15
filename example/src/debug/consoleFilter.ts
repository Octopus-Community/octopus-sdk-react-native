import type { DebugEntry, DebugEntryKind } from './debugLog';

export function filterConsoleEntries(
  entries: readonly DebugEntry[],
  query: string,
  kinds: readonly DebugEntryKind[]
): DebugEntry[] {
  const search = query.trim().toLowerCase();
  return entries.filter(
    (entry) =>
      kinds.includes(entry.kind) &&
      `${entry.label} ${entry.detail}`.toLowerCase().includes(search)
  );
}
