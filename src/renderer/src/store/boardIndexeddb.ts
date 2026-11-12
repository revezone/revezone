import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { RevezoneFileTree } from '../types/file';
import { sendFileDataChangeToMainDebounceFn } from '../utils/file';
import { ExcalidrawDataSource } from 'revemate/es/Revedraw/types';

export type StoredBoard = Partial<Omit<ExcalidrawDataSource, 'appState'>> & {
  appState?: Partial<ExcalidrawDataSource['appState']>;
};

export interface RevezoneBoardDBSchema extends DBSchema {
  board: {
    key: string;
    value: StoredBoard;
  };
}

export const INDEXEDDB_BOARD_FILE_KEY = 'board';
export const INDEXEDDB_REVEZONE_BOARD = 'revezone_board';

const EXCALIDRAW_INITIAL_DATA: StoredBoard = {
  elements: []
};

class BoardIndexeddbStorage {
  private writes = new Map<string, Promise<void>>();
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

  updateBoard(id: string, boardData: StoredBoard, fileTree: RevezoneFileTree) {
    const operation = (this.writes.get(id) ?? Promise.resolve())
      .catch(() => undefined)
      .then(async () => {
        const db = await this.initDB();
        const tx = db.transaction(INDEXEDDB_BOARD_FILE_KEY, 'readwrite');
        if (!(await tx.store.get(id))) {
          await tx.done;
          throw new Error('This board is no longer in the workspace.');
        }
        await tx.store.put(boardData, id);
        await tx.done;
        sendFileDataChangeToMainDebounceFn(id, JSON.stringify(boardData), fileTree);
      });
    this.writes.set(id, operation);
    const clear = () => {
      if (this.writes.get(id) === operation) this.writes.delete(id);
    };
    operation.then(clear, clear);
    return operation;
  }

  async addBoard(id: string, boardData: StoredBoard = EXCALIDRAW_INITIAL_DATA) {
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

    await this.db?.delete(INDEXEDDB_BOARD_FILE_KEY, id);
  }
}

export const boardIndexeddbStorage = new BoardIndexeddbStorage();
