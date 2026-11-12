import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { IpcRendererEvent } from 'electron';
import { EVENTS } from './events';
import type {
  Font,
  RevezoneFileTree,
  RevezoneFolder,
  RevezoneFile
} from '../renderer/src/types/file';
import type { TreeItem } from 'react-complex-tree';
import type { VersionHistoryBridge } from '../shared/versionHistory';
import { AI_CHANNELS } from '../shared/ai';
import type { AiBridge } from '../shared/ai';
import { COMMUNITY_SEARCH_CHANNEL } from '../shared/community';
import type { CommunityBridge } from '../shared/community';
import { MODEL_CHANNELS } from '../shared/modelConfig';
import type { ModelConfigBridge } from '../shared/modelConfig';
import { MAX_INLINE_NOTE_ASSET_BYTES, NOTE_ASSET_CHANNELS } from '../shared/noteAssets';
import type { NoteAssetsBridge } from '../shared/noteAssets';

type Callback<Args extends unknown[]> = (event: undefined, ...args: Args) => void;

function subscribe<Args extends unknown[]>(channel: string, callback: Callback<Args>) {
  // Keep the legacy callback shape without exposing the Electron event or its sender.
  const listener = (_event: IpcRendererEvent, ...args: unknown[]) =>
    callback(undefined, ...(args as Args));
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

// Custom APIs for renderer
export const api = {
  toggleTrafficLight: (isShow: boolean): void =>
    ipcRenderer.send(EVENTS.toggleTrafficLight, isShow),
  loadCustomFonts: (): void => ipcRenderer.send(EVENTS.loadCustomFont),
  removeCustomFont: (fontPath: string) => ipcRenderer.send(EVENTS.removeCustomFont, fontPath),
  fileDataChange: (fileId: string, value: string, fileTree: RevezoneFileTree) =>
    ipcRenderer.send(EVENTS.fileDataChange, fileId, value, fileTree),
  onLoadCustomFontSuccess: (cb: Callback<[Font[]]>) => subscribe(EVENTS.loadCustomFontSuccess, cb),
  onRemoveCustomFontSuccess: (cb: Callback<[Font[]]>) =>
    subscribe(EVENTS.removeCustomFontSuccess, cb),
  switchFontfamily: (fontName: string) => ipcRenderer.send(EVENTS.switchFontfamily, fontName),
  customStoragePath: () => ipcRenderer.send(EVENTS.customStoragePath),
  customStoragePathSuccess: (cb: Callback<[string]>) =>
    subscribe(EVENTS.customStoragePathSuccess, cb),
  openStoragePath: (storagePath?: string) => {
    if (storagePath) ipcRenderer.send(EVENTS.openStoragePath, storagePath);
  },
  showItemInFolder: (itemId: string, fileTree: RevezoneFileTree) =>
    ipcRenderer.send(EVENTS.showItemInFolder, itemId, fileTree),
  addFile: (fileId: string, value: string, fileTree: RevezoneFileTree) =>
    ipcRenderer.send(EVENTS.addFile, fileId, value, fileTree),
  deleteFileOrFolder: (item: RevezoneFile | RevezoneFolder, fileTree: RevezoneFileTree) =>
    ipcRenderer.send(EVENTS.deleteFileOrFolder, item, fileTree),
  renameFileOrFolder: (fileId: string, newName: string, fileTree: RevezoneFileTree) =>
    ipcRenderer.send(EVENTS.renameFileOrFolder, fileId, newName, fileTree),
  dragAndDrop: (
    items: TreeItem<RevezoneFile | RevezoneFolder>[],
    parentId: string,
    fileTree: RevezoneFileTree
  ) => {
    ipcRenderer.send(EVENTS.dragAndDrop, items, parentId, fileTree);
  },
  openFileSuccess: (cb: Callback<[string, string]>) => subscribe(EVENTS.openFileSuccess, cb),
  openRevezoneLinkSuccess: (cb: Callback<[string]>) =>
    subscribe(EVENTS.openRevezoneLinkSuccess, cb),
  removeAllRevezoneLinkListeners: () => {
    ipcRenderer.removeAllListeners(EVENTS.openRevezoneLinkSuccess);
  }
};

const versionHistory: VersionHistoryBridge = {
  list: (docId) => ipcRenderer.invoke(EVENTS.versionList, docId),
  get: (docId, versionId) => ipcRenderer.invoke(EVENTS.versionGet, docId, versionId),
  save: (input) => ipcRenderer.invoke(EVENTS.versionSave, input)
};

const noteAssets: NoteAssetsBridge = {
  save: async (file) => {
    const path = webUtils.getPathForFile(file);
    if (path) return ipcRenderer.invoke(NOTE_ASSET_CHANNELS.savePath, path, file.type);
    if (file.size > MAX_INLINE_NOTE_ASSET_BYTES) {
      throw new Error('This clipboard attachment is too large. Attach the file from disk.');
    }
    return ipcRenderer.invoke(NOTE_ASSET_CHANNELS.saveBytes, await file.arrayBuffer(), file.type);
  },
  saveBytes: (bytes, mime) => ipcRenderer.invoke(NOTE_ASSET_CHANNELS.saveBytes, bytes, mime),
  has: (url) => ipcRenderer.invoke(NOTE_ASSET_CHANNELS.has, url),
  open: (url, filename) => ipcRenderer.invoke(NOTE_ASSET_CHANNELS.open, url, filename)
};

const revezoneAi: AiBridge = {
  status: () => ipcRenderer.invoke(AI_CHANNELS.status),
  request: async (input, onMessage) => {
    if (!onMessage) return ipcRenderer.invoke(AI_CHANNELS.request, input);
    const requestId = crypto.randomUUID();
    const unsubscribe = subscribe<[string, string]>(AI_CHANNELS.preview, (_, id, text) => {
      if (id === requestId) onMessage(text);
    });
    try {
      return await ipcRenderer.invoke(AI_CHANNELS.request, input, requestId);
    } finally {
      unsubscribe();
    }
  }
};

const communitySearch: CommunityBridge = {
  search: (input) => ipcRenderer.invoke(COMMUNITY_SEARCH_CHANNEL, input)
};

const revezoneModel: ModelConfigBridge = {
  get: () => ipcRenderer.invoke(MODEL_CHANNELS.get),
  save: (input) => ipcRenderer.invoke(MODEL_CHANNELS.save, input),
  test: (input) => ipcRenderer.invoke(MODEL_CHANNELS.test, input)
};

if (process.isMainFrame) {
  const {
    USER_FILES_STORAGE_PATH,
    DEEP_LINKING_URL,
    OPEN_FILE_PATH,
    OPEN_FILE_DATA,
    registeredFonts
  } = process.env;
  const { electron, chrome, node, v8 } = process.versions;
  contextBridge.exposeInMainWorld('electron', {
    process: {
      env: {
        USER_FILES_STORAGE_PATH,
        DEEP_LINKING_URL,
        OPEN_FILE_PATH,
        OPEN_FILE_DATA,
        registeredFonts
      },
      versions: { electron, chrome, node, v8 }
    }
  });
  contextBridge.exposeInMainWorld('api', api);
  contextBridge.exposeInMainWorld('versionHistory', versionHistory);
  contextBridge.exposeInMainWorld('noteAssets', noteAssets);
  contextBridge.exposeInMainWorld('revezoneAi', revezoneAi);
  contextBridge.exposeInMainWorld('communitySearch', communitySearch);
  contextBridge.exposeInMainWorld('revezoneModel', revezoneModel);
}
