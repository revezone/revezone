import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment-timezone';
import {
  RevezoneFile,
  RevezoneFolder,
  RevezoneFileType,
  RevezoneFolderFileMapping,
  RevezoneFileTree
} from '../types/file';
import { submitUserEvent } from '../utils/statistics';
import { menuIndexeddbStorage } from './_menuIndexeddb';

moment.tz.setDefault('Asia/Shanghai');

export interface RevezoneDBSchema extends DBSchema {
  file: {
    key: string;
    value: RevezoneFile;
  };
  file_tree: {
    key: string;
    value: RevezoneFileTree;
  };
  folder: {
    key: string;
    value: RevezoneFolder;
  };
  folder_file_mapping: {
    key: number;
    value: RevezoneFolderFileMapping;
  };
}

export const INDEXEDDB_REVEZONE_FILE_TREE_STORAGE = 'revezone_file_tree';
export const INDEXEDDB_FILE = 'file';
export const INDEXEDDB_FILE_TREE = 'file_tree';

class FileTreeIndexeddbStorage {
  constructor() {
    if (FileTreeIndexeddbStorage.instance) {
      return FileTreeIndexeddbStorage.instance;
    }

    FileTreeIndexeddbStorage.instance = this;

    (async () => {
      this.db = await this.initDB();
    })();
  }

  static instance: FileTreeIndexeddbStorage;
  static oldDBSynced = false;

  db: IDBPDatabase<RevezoneDBSchema> | undefined;

  async initDB(): Promise<IDBPDatabase<RevezoneDBSchema>> {
    if (this.db) {
      return this.db;
    }

    const db = await openDB<RevezoneDBSchema>(INDEXEDDB_REVEZONE_FILE_TREE_STORAGE, 1, {
      upgrade: async (db) => {
        await this.initFileStore(db);
        await this.initFileTreeStore(db);
      }
    });

    this.db = db;

    return db;
  }

  async initFileStore(db): Promise<IDBObjectStore> {
    const fileStore: IDBObjectStore = await db.createObjectStore(INDEXEDDB_FILE, {
      autoIncrement: true
    });

    await fileStore.createIndex('type', 'type', { unique: false });

    return fileStore;
  }

  async initFileTreeStore(db): Promise<IDBObjectStore> {
    const fileTreeStore: IDBObjectStore = await db.createObjectStore(INDEXEDDB_FILE_TREE, {
      autoIncrement: true
    });

    return fileTreeStore;
  }

  async addFolder(name?: string) {
    await this.initDB();
    const id = `folder_${uuidv4()}`;

    const folderInfo = {
      id,
      name: name || '',
      gmtCreate: moment().toLocaleString(),
      gmtModified: moment().toLocaleString()
    };

    // await this.db?.add(INDEXEDDB_FOLDER_KEY, folderInfo, id);

    submitUserEvent('create_folder', folderInfo);

    return folderInfo;
  }

  async getFolder(folderId: string): Promise<RevezoneFolder | undefined> {
    await this.initDB();
    // @ts-ignore
    const value = await this.db?.get(INDEXEDDB_FOLDER_KEY, folderId);
    return value;
  }

  async getFolders(): Promise<RevezoneFolder[]> {
    await this.initDB();
    const folders = await this.db?.getAll('folder');
    const sortFn = (a: RevezoneFolder, b: RevezoneFolder) =>
      new Date(a.gmtCreate).getTime() < new Date(b.gmtCreate).getTime() ? 1 : -1;
    return folders?.sort(sortFn) || [];
  }

  async addFile(
    folderId: string,
    type: RevezoneFileType = 'note',
    name?: string
  ): Promise<RevezoneFile> {
    await this.initDB();

    const fileId = `file_${uuidv4()}`;

    const fileInfo = {
      id: fileId,
      name: name || '',
      type,
      gmtCreate: moment().toLocaleString(),
      gmtModified: moment().toLocaleString()
    };

    await this.db?.add(INDEXEDDB_FILE, fileInfo, fileId);

    // await this.db?.add(INDEXEDDB_FOLD_FILE_MAPPING_KEY, {
    //   folderId,
    //   fileId,
    //   gmtCreate: moment().toLocaleString(),
    //   gmtModified: moment().toLocaleString()
    // });

    submitUserEvent(`create_${type}`, fileInfo);

    return fileInfo;
  }

  async updateFileTree(fileTree: RevezoneFileTree) {
    await this.db?.put(INDEXEDDB_FILE_TREE, fileTree, INDEXEDDB_FILE_TREE);

    return fileTree;
  }

  // TODO: NOT FINISHED, DO NOT USE
  async _copyFile(copyFileId: string, folderId: string) {
    await this.initDB();

    if (!(copyFileId && folderId)) return;

    const copyFile = await this.db?.get(INDEXEDDB_FILE, copyFileId);

    await this.addFile(folderId, copyFile?.type);

    // await blocksuiteStorage.copyPage();
  }

  async getFile(fileId: string): Promise<RevezoneFile | undefined> {
    await this.initDB();
    const value = await this.db?.get(INDEXEDDB_FILE, fileId);
    return value;
  }

  async deleteFile(file: RevezoneFile) {
    await this.initDB();

    file && (await this.db?.delete(INDEXEDDB_FILE, file.id));

    // const folderFileMappingKeys = await this.db?.getAllKeysFromIndex(
    //   INDEXEDDB_FOLD_FILE_MAPPING_KEY,
    //   // @ts-ignore
    //   'fileId',
    //   file.id
    // );

    // const deleteFolderFileMappingPromises = folderFileMappingKeys?.map(async (key) =>
    //   this.db?.delete(INDEXEDDB_FOLD_FILE_MAPPING_KEY, key)
    // );

    // deleteFolderFileMappingPromises && (await Promise.all(deleteFolderFileMappingPromises));

    submitUserEvent(`delete_${file.type}`, file);
  }

  async getFiles(): Promise<RevezoneFile[]> {
    await this.initDB();
    const files = await this.db?.getAll(INDEXEDDB_FILE);
    const sortFn = (a: RevezoneFile, b: RevezoneFile) =>
      new Date(a.gmtCreate).getTime() < new Date(b.gmtCreate).getTime() ? 1 : -1;
    return files?.sort(sortFn) || [];
  }

  async transferDataFromMenuIndexedDB(oldFileTree) {
    if (FileTreeIndexeddbStorage.oldDBSynced) return;

    FileTreeIndexeddbStorage.oldDBSynced = true;

    this.updateFileTree(oldFileTree);

    const oldFiles = await menuIndexeddbStorage.getFiles();

    oldFiles.forEach((oldFile) => {
      this.db?.add(INDEXEDDB_FILE, oldFile, oldFile.id);
    });
  }

  async getFileTree(): Promise<RevezoneFileTree | undefined> {
    await this.initDB();
    const fileTree = await this.db?.get(INDEXEDDB_FILE_TREE, INDEXEDDB_FILE_TREE);

    console.log('--- fileTree db ---', fileTree);

    let oldFileTree;

    if (!fileTree) {
      oldFileTree = await menuIndexeddbStorage.getFileTreeFromOlderData();

      this.transferDataFromMenuIndexedDB(oldFileTree);
    }

    return fileTree || oldFileTree;
  }

  async getFilesInFolder(folderId: string): Promise<RevezoneFile[] | undefined> {
    await this.initDB();

    // const mappings = await this.db?.getAllFromIndex(
    //   INDEXEDDB_FOLD_FILE_MAPPING_KEY,
    //   // @ts-ignore
    //   'folderId',
    //   folderId
    // );

    // const promises = mappings
    //   ?.map(async (item) => this.getFile(item.fileId))
    //   .filter((item) => !!item);

    // const files = mappings && promises && (await Promise.all(promises)).filter((item) => !!item);

    // // @ts-ignore
    // return files;
  }

  async updateFileName(file: RevezoneFile, name: string) {
    await this.initDB();

    if (name === file?.name) return;

    file &&
      (await this.db?.put(
        INDEXEDDB_FILE,
        { ...file, name, gmtModified: moment().toLocaleString() },
        file.id
      ));
  }

  async updateFileGmtModified(file: RevezoneFile) {
    await this.initDB();

    file &&
      (await this.db?.put(
        INDEXEDDB_FILE,
        { ...file, gmtModified: moment().toLocaleString() },
        file.id
      ));
  }

  async updateFolderName(folder: RevezoneFolder, name: string) {
    await this.initDB();

    if (name === folder?.name) return;

    // folder && this.db?.put(INDEXEDDB_FOLDER_KEY, { ...folder, name }, folder.id);
  }

  async deleteFolder(folderId: string) {
    await this.initDB();

    if (!folderId) return;

    // await this.db?.delete(INDEXEDDB_FOLDER_KEY, folderId);

    // const filesInFolder = await this.getFilesInFolder(folderId);

    // const deleteFilesPromise = filesInFolder?.map(async (file) => this.deleteFile(file));

    // deleteFilesPromise && (await Promise.all(deleteFilesPromise));

    // submitUserEvent('delete_folder', { id: folderId });
  }
}

export const fileTreeIndexeddbStorage = new FileTreeIndexeddbStorage();
