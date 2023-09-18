import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { RevezoneFileTree } from '../types/file';
import { sendFileDataChangeToMainDebounceFn } from '../utils/file';
import type { StoreSnapshot, TLRecord } from '@tldraw/tldraw';

export interface RevezoneTldrawDBSchema extends DBSchema {
  tldraw: {
    key: string;
    value: StoreSnapshot<TLRecord>;
  };
}

export const INDEXEDDB_TLDRAW_FILE_KEY = 'tldraw';
export const INDEXEDDB_REVEZONE_TLDRAW = 'revezone_tldraw';

const TLDRAW_INITIAL_DATA: StoreSnapshot<TLRecord> = {
  store: {},
  schema: {
    schemaVersion: 1,
    storeVersion: 4,
    recordVersions: {}
  }
};

class TldrawIndexeddbStorage {
  constructor() {
    if (TldrawIndexeddbStorage.instance) {
      return TldrawIndexeddbStorage.instance;
    }

    TldrawIndexeddbStorage.instance = this;

    (async () => {
      this.db = await this.initDB();
    })();
  }

  static instance: TldrawIndexeddbStorage;
  db: IDBPDatabase<RevezoneTldrawDBSchema> | undefined;

  async initDB(): Promise<IDBPDatabase<RevezoneTldrawDBSchema>> {
    if (this.db) {
      return this.db;
    }

    const db = await openDB<RevezoneTldrawDBSchema>(INDEXEDDB_REVEZONE_TLDRAW, 1, {
      upgrade: async (db) => {
        await this.initTldrawFileStore(db);
      }
    });

    this.db = db;

    return db;
  }

  async initTldrawFileStore(db: IDBPDatabase<RevezoneTldrawDBSchema>) {
    const tldrawStore = await db.createObjectStore(INDEXEDDB_TLDRAW_FILE_KEY, {
      autoIncrement: true
    });

    return tldrawStore;
  }

  async updateTldraw(id: string, tldrawData: StoreSnapshot<TLRecord>, fileTree: RevezoneFileTree) {
    await this.initDB();

    await this.db?.put(INDEXEDDB_TLDRAW_FILE_KEY, tldrawData, id);

    sendFileDataChangeToMainDebounceFn(id, JSON.stringify(tldrawData), fileTree);
  }

  async addTldraw(id: string, tldrawData: StoreSnapshot<TLRecord> = TLDRAW_INITIAL_DATA) {
    await this.initDB();
    await this.db?.add(INDEXEDDB_TLDRAW_FILE_KEY, tldrawData, id);
  }

  async getTldraw(id: string) {
    await this.initDB();
    return await this.db?.get(INDEXEDDB_TLDRAW_FILE_KEY, id);
  }

  async getAllTldrawIds(): Promise<string[]> {
    await this.initDB();
    return (await this.db?.getAllKeys(INDEXEDDB_TLDRAW_FILE_KEY)) || [];
  }

  async deleteTldraw(id: string) {
    await this.initDB();

    console.log('--- this.db ---', id, this.db);

    await this.db?.delete(INDEXEDDB_TLDRAW_FILE_KEY, id);
  }
}

export const tldrawIndexeddbStorage = new TldrawIndexeddbStorage();
