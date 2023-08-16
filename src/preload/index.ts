import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { EVENTS } from './events';

// Custom APIs for renderer
const api = {
  toggleTrafficLight: (isShow: boolean): void =>
    ipcRenderer.send(EVENTS.toggleTrafficLight, isShow),
  loadCustomFonts: (): void => ipcRenderer.send(EVENTS.loadCustomFont),
  removeCustomFont: (fontPath: string) => ipcRenderer.send(EVENTS.removeCustomFont, fontPath),
  onLoadCustomFontSuccess: (cb) => ipcRenderer.on(EVENTS.loadCustomFontSuccess, cb),
  onRemoveCustomFontSuccess: (cb) => ipcRenderer.on(EVENTS.removeCustomFontSuccess, cb)
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
