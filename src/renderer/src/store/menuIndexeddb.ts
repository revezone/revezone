import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment-timezone';
import { FileTree } from '../types/file';
import {
  RevenoteFile,
  RevenoteFolder,
  RevenoteFileType,
  RevenoteFolderFileMapping
} from '../types/file';

moment.tz.setDefault('Asia/Shanghai');

export interface RevenoteDBSchema extends DBSchema {
  folder: {
    key: string;
    value: RevenoteFolder;
  };
  file: {
    key: string;
    value: RevenoteFile;
  };
  folder_file_mapping: {
    key: number;
    value: RevenoteFolderFileMapping;
  };
}

export const INDEXEDDB_FOLDER_KEY = 'folder';
export const INDEXEDDB_FILE_KEY = 'file';
export const INDEXEDDB_FOLD_FILE_MAPPING_KEY = 'folder_file_mapping';
export const LOCALSTORAGE_FIRST_FOLDER_KEY = 'first_forlder_id';
export const LOCALSTORAGE_FIRST_FILE_KEY = 'first_file_id';
export const INDEXEDDB_REVENOTE_MENU = 'revenote_menu';

class MenuIndexeddbStorage {
  constructor() {
    if (MenuIndexeddbStorage.instance) {
      return MenuIndexeddbStorage.instance;
    }

    MenuIndexeddbStorage.instance = this;

    (async () => {
      this.db = await this.initDB();
    })();
  }

  static instance: MenuIndexeddbStorage;
  db: IDBPDatabase<RevenoteDBSchema> | undefined;

  async initDB(): Promise<IDBPDatabase<RevenoteDBSchema>> {
    if (this.db) {
      return this.db;
    }

    const db = await openDB<RevenoteDBSchema>(INDEXEDDB_REVENOTE_MENU, 1, {
      upgrade: async (db) => {
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

    localStorage.setItem(LOCALSTORAGE_FIRST_FOLDER_KEY, id);

    await folderStore.add(
      {
        id,
        name: 'Default Folder',
        gmtCreate: moment().toLocaleString(),
        gmtModified: moment().toLocaleString()
      },
      id
    );

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
    await folderFileMappingStore.createIndex('fileId', 'fileId', { unique: true });

    const mapping = {
      folderId: localStorage.getItem(LOCALSTORAGE_FIRST_FOLDER_KEY),
      fileId: localStorage.getItem(LOCALSTORAGE_FIRST_FILE_KEY)
    };

    await folderFileMappingStore.add(mapping);

    return folderFileMappingStore;
  }

  async initFileStore(db): Promise<IDBObjectStore> {
    const fileStore: IDBObjectStore = await db.createObjectStore(INDEXEDDB_FILE_KEY, {
      autoIncrement: true
    });

    await fileStore.createIndex('id', 'id', { unique: true });
    await fileStore.createIndex('type', 'type', { unique: false });

    const firstFileId = uuidv4();

    localStorage.setItem(LOCALSTORAGE_FIRST_FILE_KEY, firstFileId);

    await fileStore.add(
      {
        id: firstFileId,
        name: 'Default File',
        type: 'note',
        gmtCreate: moment().toLocaleString(),
        gmtModified: moment().toLocaleString()
      },
      firstFileId
    );

    return fileStore;
  }

  async addFolder() {
    await this.initDB();
    const id = `folder_${uuidv4()}`;

    const folderInfo = {
      id,
      name: 'Untitled',
      gmtCreate: moment().toLocaleString(),
      gmtModified: moment().toLocaleString()
    };

    await this.db?.add(INDEXEDDB_FOLDER_KEY, folderInfo, id);

    return folderInfo;
  }

  async getFolder(folderId: string): Promise<RevenoteFolder | undefined> {
    await this.initDB();
    // @ts-ignore
    const value = await this.db?.get(INDEXEDDB_FOLDER_KEY, folderId);
    return value;
  }

  async getFolders(): Promise<RevenoteFolder[]> {
    await this.initDB();
    const folders = await this.db?.getAll('folder');
    const sortFn = (a: RevenoteFolder, b: RevenoteFolder) =>
      new Date(a.gmtCreate).getTime() < new Date(b.gmtCreate).getTime() ? 1 : -1;
    return folders?.sort(sortFn) || [];
  }

  async addFile(folderId: string, type: RevenoteFileType = 'note'): Promise<RevenoteFile> {
    await this.initDB();

    const fileId = `file_${uuidv4()}`;

    const fileInfo = {
      id: fileId,
      name: 'Untitled',
      type,
      gmtCreate: moment().toLocaleString(),
      gmtModified: moment().toLocaleString()
    };

    await this.db?.add(INDEXEDDB_FILE_KEY, fileInfo, fileId);

    await this.db?.add(INDEXEDDB_FOLD_FILE_MAPPING_KEY, {
      folderId,
      fileId,
      gmtCreate: moment().toLocaleString(),
      gmtModified: moment().toLocaleString()
    });

    return fileInfo;
  }

  async getFile(fileId: string): Promise<RevenoteFile | undefined> {
    await this.initDB();
    const value = await this.db?.get(INDEXEDDB_FILE_KEY, fileId);
    return value;
  }

  async deleteFile(fileId: string) {
    await this.initDB();

    fileId && (await this.db?.delete(INDEXEDDB_FILE_KEY, fileId));

    const folderFileMappingKeys = await this.db?.getAllKeysFromIndex(
      INDEXEDDB_FOLD_FILE_MAPPING_KEY,
      // @ts-ignore
      'fileId',
      fileId
    );

    const deleteFolderFileMappingPromises = folderFileMappingKeys?.map(async (key) =>
      this.db?.delete(INDEXEDDB_FOLD_FILE_MAPPING_KEY, key)
    );

    deleteFolderFileMappingPromises && (await Promise.all(deleteFolderFileMappingPromises));
  }

  async getFiles(): Promise<RevenoteFile[]> {
    await this.initDB();
    const files = await this.db?.getAll(INDEXEDDB_FILE_KEY);
    const sortFn = (a: RevenoteFile, b: RevenoteFile) =>
      new Date(a.gmtCreate).getTime() < new Date(b.gmtCreate).getTime() ? 1 : -1;
    return files?.sort(sortFn) || [];
  }

  async getAllFileFolderMappings(): Promise<RevenoteFolderFileMapping[]> {
    await this.initDB();
    const mappings = await this.db?.getAll(INDEXEDDB_FOLD_FILE_MAPPING_KEY);
    return mappings || [];
  }

  async getFileTree(): Promise<FileTree> {
    await this.initDB();
    const folders = await this.getFolders();
    const files = await this.getFiles();
    const mappings = await this.getAllFileFolderMappings();

    const tree = folders.map((folder) => {
      const children: RevenoteFile[] = [];

      const mappingsCertainFolder = mappings.filter((map) => map.folderId === folder.id);

      files.forEach((file) => {
        const _file = mappingsCertainFolder.find((map) => map.fileId === file.id);
        if (_file) {
          children.push(file);
        }
      });

      return { ...folder, children };
    });

    return tree;
  }

  async getFilesInFolder(folderId: string): Promise<RevenoteFile[] | undefined> {
    await this.initDB();

    const mappings = await this.db?.getAllFromIndex(
      INDEXEDDB_FOLD_FILE_MAPPING_KEY,
      // @ts-ignore
      'folderId',
      folderId
    );

    const reversed = mappings?.reverse();

    const promises = reversed
      ?.map(async (item) => this.getFile(item.fileId))
      .filter((item) => !!item);

    const files = mappings && promises && (await Promise.all(promises)).filter((item) => !!item);

    // @ts-ignore
    return files;
  }

  async updateFileName(file: RevenoteFile, name: string) {
    await this.initDB();

    if (name === file?.name) return;

    console.log('updateFileName', name, file);

    file && this.db?.put(INDEXEDDB_FILE_KEY, { ...file, name }, file.id);
  }

  async updateFolderName(folder: RevenoteFolder, name: string) {
    await this.initDB();

    if (name === folder?.name) return;

    folder && this.db?.put(INDEXEDDB_FOLDER_KEY, { ...folder, name }, folder.id);
  }

  async deleteFolder(folderId: string) {
    await this.initDB();

    if (!folderId) return;

    await this.db?.delete(INDEXEDDB_FOLDER_KEY, folderId);

    const folderFileMappingKeys = await this.db?.getAllKeysFromIndex(
      INDEXEDDB_FOLD_FILE_MAPPING_KEY,
      // @ts-ignore
      'folderId',
      folderId
    );

    const deleteFolderFileMappingPromises = folderFileMappingKeys?.map(async (key) =>
      this.db?.delete(INDEXEDDB_FOLD_FILE_MAPPING_KEY, key)
    );

    deleteFolderFileMappingPromises && (await Promise.all(deleteFolderFileMappingPromises));
  }
}

export const menuIndexeddbStorage = new MenuIndexeddbStorage();
