import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import * as Y from 'yjs';
import type { JsonValue } from '../../../shared/versionHistory';

const REVEZONE_EDITOR_KEY = 'revezone_blocksuite';
const SNAPSHOT_FORMAT = 'revezone-note-yjs-v1';

interface LegacyDatabase extends DBSchema {
  updates: { key: number; value: Uint8Array | ArrayBuffer };
  blob: { key: string; value: Uint8Array | ArrayBuffer | Blob };
}

async function openExistingDatabase(
  name: string
): Promise<IDBPDatabase<LegacyDatabase> | undefined> {
  if (typeof indexedDB.databases === 'function') {
    const databases = await indexedDB.databases();
    if (!databases.some((database) => database.name === name)) return undefined;
  }
  let creating = false;
  try {
    return await openDB<LegacyDatabase>(name, undefined, {
      upgrade(_db, oldVersion, _version, transaction) {
        if (oldVersion === 0) {
          creating = true;
          transaction.abort();
        }
      }
    });
  } catch (error) {
    if (creating) return undefined;
    throw error;
  }
}

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (let start = 0; start < bytes.length; start += 8192) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
  }
  return btoa(binary);
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function copyYValue(value: unknown): unknown {
  if (value instanceof Y.Map) {
    const copy = new Y.Map();
    for (const key of [...value.keys()].sort()) copy.set(key, copyYValue(value.get(key)));
    return copy;
  }
  if (value instanceof Y.Array) {
    const copy = new Y.Array();
    copy.push(value.toArray().map(copyYValue));
    return copy;
  }
  if (value instanceof Y.Text) {
    const copy = new Y.Text();
    const attributes = value.getAttributes();
    for (const key of Object.keys(attributes).sort()) {
      copy.setAttribute(key, copyYValue(attributes[key]));
    }
    copy.applyDelta(
      value.toDelta().map((operation) => ({ ...operation, insert: copyYValue(operation.insert) }))
    );
    return copy;
  }
  return value instanceof Y.AbstractType ? value.clone() : value;
}

function encodePage(source: Y.Map<unknown>) {
  const doc = new Y.Doc();
  // The snapshot document is never merged into the legacy store. Stable ordering
  // and client ID keep equal page content byte-identical across captures.
  doc.clientID = 1;
  try {
    const blocks = doc.getMap('blocks');
    doc.transact(() => {
      for (const id of [...source.keys()].sort()) blocks.set(id, copyYValue(source.get(id)));
    });
    return toBase64(Y.encodeStateAsUpdate(doc));
  } finally {
    doc.destroy();
  }
}

function assetIds(blocks: Y.Map<unknown>) {
  const ids = new Set<string>();
  for (const block of blocks.values()) {
    const id = block instanceof Y.Map && block.get('prop:sourceId');
    if (typeof id === 'string' && id) ids.add(id);
  }
  return [...ids].sort();
}

function object(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

class BlocksuiteStorage {
  private doc = new Y.Doc();
  private loading?: Promise<void>;

  ready(): Promise<void> {
    if (!this.loading) {
      this.loading = this.read().catch((error) => {
        this.loading = undefined;
        throw error;
      });
    }
    return this.loading;
  }

  private async read() {
    const database = await openExistingDatabase(REVEZONE_EDITOR_KEY);
    if (!database) return;
    const doc = new Y.Doc();
    try {
      const updates = await database.getAll('updates');
      Y.transact(
        doc,
        () => {
          for (const update of updates) {
            if (!(update instanceof Uint8Array) && !(update instanceof ArrayBuffer)) {
              throw new Error('The legacy note store contains an unreadable update.');
            }
            Y.applyUpdate(doc, update instanceof Uint8Array ? update : new Uint8Array(update));
          }
        },
        this,
        false
      );
      this.doc.destroy();
      this.doc = doc;
    } catch (error) {
      doc.destroy();
      throw error;
    } finally {
      database.close();
    }
  }

  getPageBlocks(docId: string): Y.Map<unknown> | undefined {
    const key = 'space:' + docId;
    return this.doc.share.has(key) ? this.doc.getMap(key) : undefined;
  }

  private pageMetas() {
    if (!this.doc.share.has('space:meta')) return [];
    const pages = this.doc.getMap('space:meta').get('pages');
    return pages instanceof Y.Array ? pages.toArray() : [];
  }

  getPageTitle(docId: string): string | undefined {
    for (const page of this.pageMetas()) {
      if (!(page instanceof Y.Map) || page.get('id') !== docId) continue;
      const title = page.get('title');
      return typeof title === 'string' ? title : undefined;
    }
    return undefined;
  }

  async getAllPageIds(): Promise<string[]> {
    await this.ready();
    return this.pageMetas().flatMap((page) => {
      const id = page instanceof Y.Map && page.get('id');
      return typeof id === 'string' ? [id] : [];
    });
  }

  async getBlob(id: string): Promise<Blob | undefined> {
    const database = await openExistingDatabase(REVEZONE_EDITOR_KEY + '_blob');
    if (!database) return undefined;
    try {
      const value = await database.get('blob', id);
      if (value === undefined) return undefined;
      if (value instanceof Blob) return value;
      if (value instanceof ArrayBuffer || value instanceof Uint8Array) return new Blob([value]);
      throw new Error('The legacy note store contains an unreadable attachment.');
    } finally {
      database.close();
    }
  }

  async capturePage(id: string): Promise<JsonValue> {
    await this.ready();
    const blocks = this.getPageBlocks(id);
    if (!blocks?.size) throw new Error('This legacy note could not be found.');
    const update = encodePage(blocks);
    const blobs = await Promise.all(
      assetIds(blocks).map(async (assetId) => {
        const blob = await this.getBlob(assetId);
        if (!blob) throw new Error('An attachment could not be read for the note version.');
        return {
          id: assetId,
          mime: blob.type,
          data: toBase64(new Uint8Array(await blob.arrayBuffer()))
        };
      })
    );
    return { format: SNAPSHOT_FORMAT, pageId: id, update, blobs };
  }

  previewPage(snapshot: JsonValue): string[] {
    if (
      !object(snapshot) ||
      snapshot.format !== SNAPSHOT_FORMAT ||
      typeof snapshot.update !== 'string'
    ) {
      return [];
    }
    const saved = new Y.Doc();
    try {
      Y.applyUpdate(saved, fromBase64(snapshot.update));
      const blocks = saved.getMap<unknown>('blocks');
      const root = [...blocks.values()].find(
        (block) => block instanceof Y.Map && block.get('sys:flavour') === 'affine:page'
      );
      const pending = root instanceof Y.Map ? [root] : [];
      const visited = new Set<Y.Map<unknown>>();
      const lines: string[] = [];
      while (pending.length && lines.length < 40) {
        const block = pending.pop()!;
        if (visited.has(block)) continue;
        visited.add(block);
        const text = block.get('prop:title') ?? block.get('prop:text');
        if (text instanceof Y.Text && text.length) lines.push(text.toString().slice(0, 600));
        if (block.get('prop:sourceId') && lines.length < 40) lines.push('[Attachment]');
        const children = block.get('sys:children');
        if (children instanceof Y.Array) {
          for (let index = children.length - 1; index >= 0; index--) {
            const child = blocks.get(children.get(index));
            if (child instanceof Y.Map) pending.push(child);
          }
        }
      }
      return lines;
    } catch {
      return [];
    } finally {
      saved.destroy();
    }
  }
}

export const blocksuiteStorage = new BlocksuiteStorage();
