import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { RevezoneFileTree } from '../types/file';
import { sendFileDataChangeToMainDebounceFn } from '../utils/file';
import { ExcalidrawDataSource } from 'revemate/es/Revedraw/types';

export interface RevezoneBoardDBSchema extends DBSchema {
  board: {
    key: string;
    value: ExcalidrawDataSource;
  };
}

export const INDEXEDDB_BOARD_FILE_KEY = 'board';
export const INDEXEDDB_REVEZONE_BOARD = 'revezone_board';

const EXCALIDRAW_INITIAL_DATA: ExcalidrawDataSource = {
  elements: []
};

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

  async updateBoard(id: string, boardData: ExcalidrawDataSource, fileTree: RevezoneFileTree) {
    await this.initDB();

    await this.db?.put(INDEXEDDB_BOARD_FILE_KEY, boardData, id);

    sendFileDataChangeToMainDebounceFn(id, JSON.stringify(boardData), fileTree);
  }

  async addBoard(id: string, boardData: ExcalidrawDataSource = EXCALIDRAW_INITIAL_DATA) {
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
}

export const boardIndexeddbStorage = new BoardIndexeddbStorage();
