import { openDB, DBSchema, IDBPDatabase } from 'idb';
import moment from 'moment-timezone';

moment.tz.setDefault('Asia/Shanghai');

export interface RevenoteCanvasDBSchema extends DBSchema {
  canvas: {
    key: number;
    value: string;
  };
}

export const INDEXEDDB_CANVAS_FILE_KEY = 'canvas';
export const INDEXEDDB_REVENOTE_CANVAS = 'revenote_canvas';

class CanvasIndexeddbStorage {
  constructor() {
    if (CanvasIndexeddbStorage.instance) {
      return CanvasIndexeddbStorage.instance;
    }

    CanvasIndexeddbStorage.instance = this;

    (async () => {
      this.db = await this.initDB();
    })();
  }

  static instance: CanvasIndexeddbStorage;
  db: IDBPDatabase<RevenoteCanvasDBSchema> | undefined;

  async initDB(): Promise<IDBPDatabase<RevenoteCanvasDBSchema>> {
    if (this.db) {
      return this.db;
    }

    const db = await openDB<RevenoteCanvasDBSchema>(INDEXEDDB_REVENOTE_CANVAS, 1, {
      upgrade: async (db) => {
        await this.initCanvasFileStore(db);
      }
    });

    this.db = db;

    return db;
  }

  async initCanvasFileStore(db): Promise<IDBObjectStore> {
    const canvasStore: IDBObjectStore = await db.createObjectStore(INDEXEDDB_CANVAS_FILE_KEY, {
      autoIncrement: true
    });

    await canvasStore.createIndex('id', 'id', { unique: true });

    return canvasStore;
  }

  async addCanvas(id, canvasInfo) {
    await this.initDB();
    await this.db?.add(INDEXEDDB_CANVAS_FILE_KEY, canvasInfo, id);
  }

  async getCanvas(id) {
    await this.initDB();
    return await this.db?.get(INDEXEDDB_CANVAS_FILE_KEY, id);
  }
}

export const canvasIndexeddbStorage = new CanvasIndexeddbStorage();
