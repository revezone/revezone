import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { debounce } from '../utils/debounce';
import { RevezoneFileTree } from '../types/file';

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

  async initBoardFileStore(db: IDBPDatabase<RevezoneBoardDBSchema>) {
    const boardStore = await db.createObjectStore(INDEXEDDB_BOARD_FILE_KEY, {
      autoIncrement: true
    });

    return boardStore;
  }

  async addOrUpdateBoard(id: string, boardData: string, fileTree: RevezoneFileTree) {
    await this.initDB();
    await this.db?.put(INDEXEDDB_BOARD_FILE_KEY, boardData, id);

    const file = fileTree[id].data;

    this.getFileDataChangeFn()(id, file.name, boardData);
  }

  async addBoard(id: string, boardData: string) {
    await this.initDB();
    await this.db?.add(INDEXEDDB_BOARD_FILE_KEY, boardData, id);
  }

  async getBoard(id: string) {
    await this.initDB();
    return await this.db?.get(INDEXEDDB_BOARD_FILE_KEY, id);
  }

  async getAllBoardIds(): Promise<string[]> {
    await this.initDB();
    return (await this.db?.getAllKeys(INDEXEDDB_BOARD_FILE_KEY)) || [];
  }

  async deleteBoard(id: string) {
    await this.initDB();

    console.log('--- this.db ---', id, this.db);

    await this.db?.delete(INDEXEDDB_BOARD_FILE_KEY, id);
  }

  getFileDataChangeFn() {
    return debounce((id, name, boardData) => {
      console.log('--- send fileDataChange ---', id, JSON.parse(boardData));
      window.api.fileDataChange(id, 'board', name, boardData);
    }, 1000);
  }
}

export const boardIndexeddbStorage = new BoardIndexeddbStorage();
