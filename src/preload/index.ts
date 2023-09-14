import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { EVENTS } from './events';
import { RevezoneFileTree, RevezoneFolder, RevezoneFile } from '../renderer/src/types/file';
import { TreeItem } from 'react-complex-tree';

type Callback = () => void;

// Custom APIs for renderer
const api = {
  toggleTrafficLight: (isShow: boolean): void =>
    ipcRenderer.send(EVENTS.toggleTrafficLight, isShow),
  loadCustomFonts: (): void => ipcRenderer.send(EVENTS.loadCustomFont),
  removeCustomFont: (fontPath: string) => ipcRenderer.send(EVENTS.removeCustomFont, fontPath),
  fileDataChange: (fileId: string, value: string, fileTree: RevezoneFileTree) =>
    ipcRenderer.send(EVENTS.fileDataChange, fileId, value, fileTree),
  onLoadCustomFontSuccess: (cb: Callback) => ipcRenderer.on(EVENTS.loadCustomFontSuccess, cb),
  onRemoveCustomFontSuccess: (cb: Callback) => ipcRenderer.on(EVENTS.removeCustomFontSuccess, cb),
  switchFontfamily: (fontName: string) => ipcRenderer.send(EVENTS.switchFontfamily, fontName),
  customStoragePath: () => ipcRenderer.send(EVENTS.customStoragePath),
  customStoragePathSuccess: (cb: Callback) => ipcRenderer.on(EVENTS.customStoragePathSuccess, cb),
  openStoragePath: () => ipcRenderer.send(EVENTS.openStoragePath),
  addFile: (fileId: string, value: string, fileTree: RevezoneFileTree) =>
    ipcRenderer.send(EVENTS.addFile, fileId, value, fileTree),
  deleteFileOrFolder: (fileId: string, fileTree: RevezoneFileTree) =>
    ipcRenderer.send(EVENTS.deleteFileOrFolder, fileId, fileTree),
  renameFileOrFolder: (fileId: string, newName: string, fileTree: RevezoneFileTree) =>
    ipcRenderer.send(EVENTS.renameFileOrFolder, fileId, newName, fileTree),
  dragAndDrop: (
    items: TreeItem<RevezoneFile | RevezoneFolder>[],
    parentId: string,
    fileTree: RevezoneFileTree
  ) => {
    ipcRenderer.send(EVENTS.dragAndDrop, items, parentId, fileTree);
  },
  openFileSuccess: (cb: Callback) => ipcRenderer.on(EVENTS.openFileSuccess, cb)
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
