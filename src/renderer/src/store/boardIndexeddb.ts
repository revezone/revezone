import { openDB, DBSchema, IDBPDatabase } from 'idb';
import moment from 'moment-timezone';

moment.tz.setDefault('Asia/Shanghai');

export interface RevezoneBoardDBSchema extends DBSchema {
  board: {
    key: string;
    value: string;
  };
}

export const INDEXEDDB_BOARD_FILE_KEY = 'board';
export const INDEXEDDB_REVEZONE_BOARD = 'revezone_board';

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
  db: IDBPDatabase<RevezoneBoardDBSchema> | undefined;

  async initDB(): Promise<IDBPDatabase<RevezoneBoardDBSchema>> {
    if (this.db) {
      return this.db;
    }

    const db = await openDB<RevezoneBoardDBSchema>(INDEXEDDB_REVEZONE_BOARD, 1, {
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

    return boardStore;
  }

  async addOrUpdateBoard(id: string, boardData: string) {
    await this.initDB();
    await this.db?.put(INDEXEDDB_BOARD_FILE_KEY, boardData, id);
  }

  async addBoard(id, boardData) {
    await this.initDB();
    await this.db?.add(INDEXEDDB_BOARD_FILE_KEY, boardData, id);
  }

  async getBoard(id) {
    await this.initDB();
    return await this.db?.get(INDEXEDDB_BOARD_FILE_KEY, id);
  }

  async deleteBoard(id) {
    await this.initDB();

    console.log('--- this.db ---', id, this.db);

    await this.db?.delete(INDEXEDDB_BOARD_FILE_KEY, id);
  }
}

export const boardIndexeddbStorage = new BoardIndexeddbStorage();
