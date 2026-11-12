import type { JsonValue, VersionKind, VersionSummary } from '../../../shared/versionHistory';
import type { AiContext, AiOperation } from '../../../shared/ai';

export type { AiContext, AiOperation };

export type AiEditorAdapter = {
  docId: string;
  kind: VersionKind;
  context(): AiContext;
  capture(): Promise<JsonValue>;
  validate?(operations: AiOperation[], base: AiContext): void;
  apply(operations: AiOperation[], base: AiContext): void;
  restore(snapshot: JsonValue): Promise<void>;
  preview?(snapshot: JsonValue): string[];
  subscribe(listener: () => void): () => void;
  flush(): Promise<void>;
  locate?(ids: string[]): void;
};

type EditorEntry = {
  adapter: AiEditorAdapter;
  lastSnapshot?: string;
  timer?: ReturnType<typeof setTimeout>;
  dirty: boolean;
  change: number;
};

export class AppliedSaveError extends Error {
  constructor(cause: unknown) {
    super('The editor changed, but the save could not be confirmed.', { cause });
  }
}

export class AiEditValidationError extends Error {
  constructor(
    readonly reason: 'target' | 'range' | 'format' | 'stale' | 'unchanged' | 'invalid',
    message: string
  ) {
    super(message);
  }
}

const editors = new Map<string, EditorEntry>();
const writes = new Map<string, Promise<unknown>>();
const listeners = new Set<() => void>();
const historyListeners = new Set<(docId: string) => void>();

export function subscribeAiEditors(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeVersionHistory(listener: (docId: string) => void) {
  historyListeners.add(listener);
  return () => {
    historyListeners.delete(listener);
  };
}

export function lookupAiEditor(docId: string) {
  return editors.get(docId)?.adapter;
}

function enqueue<T>(docId: string, operation: () => Promise<T>): Promise<T> {
  const queued = (writes.get(docId) ?? Promise.resolve()).catch(() => undefined).then(operation);
  writes.set(docId, queued);
  const clear = () => {
    if (writes.get(docId) === queued) writes.delete(docId);
  };
  queued.then(clear, clear);
  return queued;
}

async function save(
  entry: EditorEntry,
  snapshot: JsonValue,
  source: 'manual' | 'before-ai' | 'ai' | 'before-restore' | 'restore',
  label?: string
) {
  const { docId, kind } = entry.adapter;
  if (!window.versionHistory) throw new Error('Local history is available in the desktop app.');
  const result = await window.versionHistory.save({ docId, kind, source, label, snapshot });
  entry.lastSnapshot = JSON.stringify(snapshot);
  for (const listener of historyListeners) listener(docId);
  return result;
}

function checkpointManual(entry: EditorEntry) {
  return enqueue(entry.adapter.docId, async () => {
    if (!entry.dirty || !window.versionHistory) return;
    const change = entry.change;
    const snapshot = await entry.adapter.capture();
    if (JSON.stringify(snapshot) !== entry.lastSnapshot) {
      await save(entry, snapshot, 'manual');
    }
    entry.dirty = entry.change !== change;
  });
}

export function registerAiEditor(adapter: AiEditorAdapter) {
  const entry: EditorEntry = { adapter, dirty: false, change: 0 };
  editors.set(adapter.docId, entry);
  const unsubscribe = adapter.subscribe(() => {
    if (!window.versionHistory) return;
    entry.change++;
    entry.dirty = true;
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      void checkpointManual(entry).catch((error) =>
        console.error('Could not save local history', error)
      );
    }, 3500);
  });
  for (const listener of listeners) listener();
  return () => {
    unsubscribe();
    clearTimeout(entry.timer);
    if (editors.get(adapter.docId) === entry) {
      editors.delete(adapter.docId);
      for (const listener of listeners) listener();
    }
    // Capture synchronously on the adapter side before its editor instance is detached.
    if (entry.dirty && window.versionHistory) {
      const pending = adapter.capture();
      pending.catch(() => undefined);
      void enqueue(adapter.docId, async () => {
        const snapshot = await pending;
        if (JSON.stringify(snapshot) !== entry.lastSnapshot) await save(entry, snapshot, 'manual');
      }).catch((error) => console.error('Could not close local history checkpoint', error));
    }
  };
}

function requireActive(adapter: AiEditorAdapter) {
  const entry = editors.get(adapter.docId);
  if (!entry || entry.adapter !== adapter)
    throw new Error('Reopen the original document and try again.');
  return entry;
}

async function saveBefore(
  entry: EditorEntry,
  source: 'before-ai' | 'before-restore',
  label?: string,
  expected?: JsonValue
) {
  const change = entry.change;
  const snapshot = await entry.adapter.capture();
  const serialized = JSON.stringify(snapshot);
  if (expected !== undefined && serialized !== JSON.stringify(expected)) {
    throw new Error(
      'The document has later edits. Use version history to review before restoring.'
    );
  }
  const previous = await save(entry, snapshot, source, label);
  requireActive(entry.adapter);
  if (JSON.stringify(await entry.adapter.capture()) !== serialized || entry.change !== change) {
    throw new Error('The document changed while saving the recovery point. Try again.');
  }
  requireActive(entry.adapter);
  return previous;
}

async function saveAfter(entry: EditorEntry, source: 'ai' | 'restore', label?: string) {
  const change = entry.change;
  try {
    const [snapshot] = await Promise.all([entry.adapter.capture(), entry.adapter.flush()]);
    const result = await save(entry, snapshot, source, label);
    entry.dirty = entry.change !== change;
    return result;
  } catch (error) {
    entry.dirty = true;
    throw new AppliedSaveError(error);
  }
}

export function applyAiOperations(
  adapter: AiEditorAdapter,
  operations: AiOperation[],
  base: AiContext,
  label: string,
  canApply?: () => boolean
): Promise<{ before: VersionSummary; after: VersionSummary; changedIds: string[] }> {
  return enqueue(adapter.docId, async () => {
    const entry = requireActive(adapter);
    if (canApply && !canApply())
      throw new Error('The active document changed. Reopen it and try again.');
    adapter.validate?.(operations, base);
    const before = await saveBefore(entry, 'before-ai', label);
    if (canApply && !canApply())
      throw new Error('The active document changed. Reopen it and try again.');
    const original = new Map(
      adapter.context().items.map((item) => [item.id, JSON.stringify(item)])
    );
    adapter.apply(operations, base);
    const changedIds = adapter
      .context()
      .items.filter((item) => JSON.stringify(item) !== original.get(item.id))
      .map((item) => item.id);
    const after = await saveAfter(entry, 'ai', label);
    return { before, after, changedIds };
  });
}

export function restoreAiVersion(
  adapter: AiEditorAdapter,
  versionId: string,
  expectedCurrentId?: string
): Promise<VersionSummary> {
  return enqueue(adapter.docId, async () => {
    const entry = requireActive(adapter);
    const history = window.versionHistory;
    if (!history) throw new Error('Local history is available in the desktop app.');
    const target = await history.get(adapter.docId, versionId);
    if (!target || target.kind !== adapter.kind)
      throw new Error('This version could not be loaded.');
    const expected = expectedCurrentId
      ? await history.get(adapter.docId, expectedCurrentId)
      : undefined;
    if (expectedCurrentId && !expected) throw new Error('This version could not be loaded.');
    await saveBefore(entry, 'before-restore', undefined, expected?.snapshot);
    await adapter.restore(target.snapshot);
    return saveAfter(entry, 'restore', target.createdAt);
  });
}

export function saveManualVersion(adapter: AiEditorAdapter, label: string) {
  return enqueue(adapter.docId, async () => {
    const entry = requireActive(adapter);
    const change = entry.change;
    await adapter.flush();
    const version = await save(entry, await adapter.capture(), 'manual', label);
    entry.dirty = entry.change !== change;
    return version;
  });
}
