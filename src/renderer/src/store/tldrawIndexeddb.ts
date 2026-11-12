import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { RevezoneFileTree } from '../types/file';
import { sendFileDataChangeToMainDebounceFn } from '../utils/file';
import type { StoreSnapshot, TLInstance, TLRecord } from '@tldraw/tldraw';

export type TLDrawData = StoreSnapshot<TLRecord> & { instanceState?: Partial<TLInstance> };

export interface RevezoneTldrawDBSchema extends DBSchema {
  tldraw: {
    key: string;
    value: TLDrawData;
  };
}

export const INDEXEDDB_TLDRAW_FILE_KEY = 'tldraw';
export const INDEXEDDB_REVEZONE_TLDRAW = 'revezone_tldraw';

const TLDRAW_INITIAL_DATA: TLDrawData = {
  store: {},
  schema: {
    schemaVersion: 1,
    storeVersion: 4,
    recordVersions: {}
  },
  instanceState: {
    isDebugMode: false
  }
};

class TldrawIndexeddbStorage {
  private database?: Promise<IDBPDatabase<RevezoneTldrawDBSchema>>;
  private readonly writes = new Map<string, Promise<void>>();

  private getDatabase() {
    if (!this.database) {
      this.database = openDB<RevezoneTldrawDBSchema>(INDEXEDDB_REVEZONE_TLDRAW, 1, {
        upgrade(db) {
          db.createObjectStore(INDEXEDDB_TLDRAW_FILE_KEY, { autoIncrement: true });
        }
      }).catch((error) => {
        this.database = undefined;
        throw error;
      });
    }
    return this.database;
  }

  private enqueueWrite(id: string, write: () => Promise<void>) {
    const operation = (this.writes.get(id) ?? Promise.resolve()).catch(() => undefined).then(write);
    this.writes.set(id, operation);
    const clear = () => {
      if (this.writes.get(id) === operation) this.writes.delete(id);
    };
    operation.then(clear, clear);
    return operation;
  }

  updateTldraw(id: string, tldrawData: TLDrawData, fileTree: RevezoneFileTree) {
    return this.enqueueWrite(id, async () => {
      const db = await this.getDatabase();
      const tx = db.transaction(INDEXEDDB_TLDRAW_FILE_KEY, 'readwrite', { durability: 'strict' });
      if (!(await tx.store.getKey(id))) {
        await tx.done;
        throw new Error('This Tldraw board is no longer in the workspace.');
      }
      await Promise.all([tx.store.put(tldrawData, id), tx.done]);
      if (fileTree[id]?.data.type === 'tldraw') {
        sendFileDataChangeToMainDebounceFn(id, JSON.stringify(tldrawData), fileTree);
      }
    });
  }

  addTldraw(id: string, tldrawData: TLDrawData = TLDRAW_INITIAL_DATA) {
    return this.enqueueWrite(id, async () => {
      const db = await this.getDatabase();
      await db.add(INDEXEDDB_TLDRAW_FILE_KEY, tldrawData, id);
    });
  }

  async getTldraw(id: string) {
    await this.writes.get(id)?.catch(() => undefined);
    return (await this.getDatabase()).get(INDEXEDDB_TLDRAW_FILE_KEY, id);
  }

  async getAllTldrawIds(): Promise<string[]> {
    return (await this.getDatabase()).getAllKeys(INDEXEDDB_TLDRAW_FILE_KEY);
  }

  deleteTldraw(id: string) {
    return this.enqueueWrite(id, async () => {
      const db = await this.getDatabase();
      await db.delete(INDEXEDDB_TLDRAW_FILE_KEY, id);
    });
  }
}

export const tldrawIndexeddbStorage = new TldrawIndexeddbStorage();
