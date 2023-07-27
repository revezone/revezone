import { openDB, DBSchema, IDBPDatabase } from 'idb';
import moment from 'moment-timezone';

moment.tz.setDefault('Asia/Shanghai');

export interface RevenoteBoardDBSchema extends DBSchema {
  board: {
    key: number;
    value: string;
  };
}

export const INDEXEDDB_BOARD_FILE_KEY = 'board';
export const INDEXEDDB_REVENOTE_BOARD = 'revenote_board';

class BoardIndexeddbStorage {
  constructor() {
    if (BoardIndexeddbStorage.instance) {
      return BoardIndexeddbStorage.instance;
    }

    BoardIndexeddbStorage.instance = this;

    (async () => {
      this.db = await this.initDB();
    })();
  }

  static instance: BoardIndexeddbStorage;
  db: IDBPDatabase<RevenoteBoardDBSchema> | undefined;

  async initDB(): Promise<IDBPDatabase<RevenoteBoardDBSchema>> {
    if (this.db) {
      return this.db;
    }

    const db = await openDB<RevenoteBoardDBSchema>(INDEXEDDB_REVENOTE_BOARD, 1, {
      upgrade: async (db) => {
        await this.initBoardFileStore(db);
      }
    });

    this.db = db;

    return db;
  }

  async initBoardFileStore(db): Promise<IDBObjectStore> {
    const boardStore: IDBObjectStore = await db.createObjectStore(INDEXEDDB_BOARD_FILE_KEY, {
      autoIncrement: true
    });

    await boardStore.createIndex('id', 'id', { unique: true });

    return boardStore;
  }

  async addOrUpdateBoard(id, boardInfo) {
    await this.initDB();
    await this.db?.put(INDEXEDDB_BOARD_FILE_KEY, boardInfo, id);
  }

  async addBoard(id, boardInfo) {
    await this.initDB();
    await this.db?.add(INDEXEDDB_BOARD_FILE_KEY, boardInfo, id);
  }

  async getBoard(id) {
    await this.initDB();
    return await this.db?.get(INDEXEDDB_BOARD_FILE_KEY, id);
  }
}

export const boardIndexeddbStorage = new BoardIndexeddbStorage();
