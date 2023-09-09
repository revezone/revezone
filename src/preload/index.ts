import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { EVENTS } from './events';

type Callback = () => void;

// Custom APIs for renderer
const api = {
  toggleTrafficLight: (isShow: boolean): void =>
    ipcRenderer.send(EVENTS.toggleTrafficLight, isShow),
  loadCustomFonts: (): void => ipcRenderer.send(EVENTS.loadCustomFont),
  removeCustomFont: (fontPath: string) => ipcRenderer.send(EVENTS.removeCustomFont, fontPath),
  fileDataChange: (fileId: string, fileType: 'note' | 'board', name: string, value: string) =>
    ipcRenderer.send(EVENTS.fileDataChange, fileId, fileType, name, value),
  onLoadCustomFontSuccess: (cb: Callback) => ipcRenderer.on(EVENTS.loadCustomFontSuccess, cb),
  onRemoveCustomFontSuccess: (cb: Callback) => ipcRenderer.on(EVENTS.removeCustomFontSuccess, cb),
  switchFontfamily: (fontName: string) => ipcRenderer.send(EVENTS.switchFontfamily, fontName),
  customStoragePath: () => ipcRenderer.send(EVENTS.customStoragePath),
  customStoragePathSuccess: (cb: Callback) => ipcRenderer.on(EVENTS.customStoragePathSuccess, cb),
  openStoragePath: () => ipcRenderer.send(EVENTS.openStoragePath)
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
