import { openDB, DBSchema, IDBPDatabase } from 'idb';
export interface RevezoneCommonDBSchema extends DBSchema {
  common: {
    key: string;
    value: string;
  };
}

export const INDEXEDDB_REVEZONE_COMMON_KEY = 'common';
export const INDEXEDDB_REVEZONE_COMMON = 'revezone_common';

class CommonIndexeddbStorage {
  constructor() {
    if (CommonIndexeddbStorage.instance) {
      return CommonIndexeddbStorage.instance;
    }

    CommonIndexeddbStorage.instance = this;

    (async () => {
      this.db = await this.initDB();
    })();
  }

  static instance: CommonIndexeddbStorage;
  db: IDBPDatabase<RevezoneCommonDBSchema> | undefined;

  async initDB(): Promise<IDBPDatabase<RevezoneCommonDBSchema>> {
    if (this.db) {
      return this.db;
    }

    const db = await openDB<RevezoneCommonDBSchema>(INDEXEDDB_REVEZONE_COMMON, 1, {
      upgrade: async (db) => {
        await this.initCommonStore(db);
      }
    });

    this.db = db;

    return db;
  }

  async initCommonStore(db: IDBPDatabase<RevezoneCommonDBSchema>) {
    const boardStore = await db.createObjectStore(INDEXEDDB_REVEZONE_COMMON_KEY, {
      autoIncrement: true
    });

    return boardStore;
  }

  async updateCommonData(key: string, data: string) {
    await this.initDB();
    await this.db?.put(INDEXEDDB_REVEZONE_COMMON_KEY, data, key);
  }

  async getCommonData(key: string) {
    await this.initDB();
    return await this.db?.get(INDEXEDDB_REVEZONE_COMMON_KEY, key);
  }

  async deleteCommonData(key: string) {
    await this.initDB();

    console.log('--- this.db ---', key, this.db);

    await this.db?.delete(INDEXEDDB_REVEZONE_COMMON_KEY, key);
  }
}

export const commonIndexeddbStorage = new CommonIndexeddbStorage();
