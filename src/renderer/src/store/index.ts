import { Workspace } from '@blocksuite/store';
import { createIndexedDBProvider } from '@toeverything/y-indexeddb';
import { atom, useAtom } from 'jotai';
import { openDB, DBSchema, IDBPDatabase, IDBPTransaction } from 'idb';
import { v4 as uuidv4 } from 'uuid';

export interface RevenoteFolder {
  id: string;
  name: string;
}

export interface FolderFileMapping {
  folderId: string;
  fileId: string;
}

export interface RevenoteFile {
  id: string;
  name: string;
  type: 'note' | 'canvas';
}

export interface RevenoteDBSchema extends DBSchema {
  folder: {
    key: number;
    value: RevenoteFolder;
  };
  file: {
    key: number;
    value: RevenoteFile;
  };
  folder_file_mapping: {
    key: number;
    value: FolderFileMapping;
  };
}

const INDEXEDDB_FOLDER_KEY = 'folder';
const INDEXEDDB_FILE_KEY = 'file';
const INDEXEDDB_FOLD_FILE_MAPPING_KEY = 'folder_file_mapping';

const INITIAL_ATOM = {
  folders: [
    {
      id: 'default',
      name: 'default'
    }
  ],
  folderFileMapping: { default: 'default_page' }
};

export const revenoteAtom = atom(INITIAL_ATOM);

class IndexeddbStorage {
  constructor() {
    console.log('--- constructor ---', IndexeddbStorage.instance);

    if (IndexeddbStorage.instance) {
      return IndexeddbStorage.instance;
    }

    IndexeddbStorage.instance = this;

    (async () => {
      this.db = await this.initDB();
    })();
  }

  static instance: IndexeddbStorage;
  db: IDBPDatabase<RevenoteDBSchema> | undefined;
  firstFolderId: string | undefined;
  firstFileId: string | undefined;

  async initDB(): Promise<IDBPDatabase<RevenoteDBSchema>> {
    if (this.db) {
      return this.db;
    }

    const db = await openDB<RevenoteDBSchema>('revenote-indexeddb', 1, {
      upgrade: async (db) => {
        console.log('--- init indexed db ---');

        await this.initFolderStore(db);
        await this.initFileStore(db);
        await this.initFolderFileMappingStore(db);
      }
    });

    this.db = db;

    return db;
  }

  async initFolderStore(db): Promise<IDBObjectStore> {
    const folderStore: IDBObjectStore = await db.createObjectStore(INDEXEDDB_FOLDER_KEY, {
      autoIncrement: true
    });

    await folderStore.createIndex('id', 'id', { unique: true });

    const id = uuidv4();

    this.firstFolderId = id;

    await folderStore.add({ id, name: 'default' });

    return folderStore;
  }

  async initFolderFileMappingStore(db): Promise<IDBObjectStore> {
    const folderFileMappingStore: IDBObjectStore = await db.createObjectStore(
      INDEXEDDB_FOLD_FILE_MAPPING_KEY,
      {
        autoIncrement: true
      }
    );

    await folderFileMappingStore.createIndex('folderId', 'folderId', { unique: false });

    console.log('--- add ---', {
      folderId: this.firstFolderId,
      fileId: this.firstFileId
    });

    await folderFileMappingStore.add({
      folderId: this.firstFolderId,
      fileId: this.firstFileId
    });

    return folderFileMappingStore;
  }

  async initFileStore(db): Promise<IDBObjectStore> {
    const fileStore: IDBObjectStore = await db.createObjectStore(INDEXEDDB_FILE_KEY, {
      autoIncrement: true
    });

    await fileStore.createIndex('id', 'id', { unique: true });
    await fileStore.createIndex('type', 'type', { unique: false });

    const firstFileId = uuidv4();

    this.firstFileId = firstFileId;

    await fileStore.add({ id: firstFileId, name: 'default' });

    return fileStore;
  }

  async getFolder(folderId: string): Promise<RevenoteFolder | undefined> {
    await this.initDB();
    // @ts-ignore
    const value = await this.db?.getFromIndex(INDEXEDDB_FOLDER_KEY, 'id', folderId);
    return value;
  }

  async getFolders(): Promise<RevenoteFolder[] | undefined> {
    await this.initDB();
    return await indexeddbStorage.db?.getAll('folder');
  }

  async getFile(fileId: string): Promise<RevenoteFile | undefined> {
    await this.initDB();
    // @ts-ignore
    const value = await this.db?.getFromIndex(INDEXEDDB_FILE_KEY, 'id', fileId);
    return value;
  }

  async getFilesInFolder(folderId: string): Promise<RevenoteFile[] | undefined> {
    await this.initDB();

    const mappings = await this.db?.getAllFromIndex(
      INDEXEDDB_FOLD_FILE_MAPPING_KEY,
      // @ts-ignore
      'folderId',
      folderId
    );

    console.log('--- mapping ---', mappings);

    const promises = mappings
      ?.map(async (item) => this.getFile(item.fileId))
      .filter((item) => !!item);

    const files = mappings && promises && (await Promise.all(promises)).filter((item) => !!item);

    console.log('--- files ---', files);

    // @ts-ignore
    return files;
  }
}

export const indexeddbStorage = new IndexeddbStorage();

class BlocksuiteStorage {
  constructor() {
    if (BlocksuiteStorage.instance) {
      return BlocksuiteStorage.instance;
    }
    BlocksuiteStorage.instance = this;
    this.connect2indexeddb();
  }

  workspace = new Workspace({
    id: 'revenote-workspace'
  });

  static instance: BlocksuiteStorage;

  connect2indexeddb = async (): Promise<void> => {
    const persistence = createIndexedDBProvider(this.workspace.doc);
    persistence.connect();
    await persistence.whenSynced.then(() => {
      persistence.disconnect();
    });
  };
}

export const blocksuiteStorage = new BlocksuiteStorage();
