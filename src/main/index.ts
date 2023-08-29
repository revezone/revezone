import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { isMacOS } from './utils/platform';
import { loadCustomFont, batchRegisterCustomFonts, removeCustomFont } from './utils/customFonts';
import { registerAppMenu } from './utils/menu';
import { EVENTS } from '../preload/events';
import Store from 'electron-store';
import './utils/os';

// import { autoUpdater } from 'electron-updater';
// import { notify } from './utils/notification';

const DEFAULT_WINDOW_WIDTH = 1200;
const DEFAULT_WINDOW_HEIGHT = 770;

// 创建一个新的存储实例
const store = new Store();

// IMPORTANT: to fix file save problem in excalidraw: The request is not allowed by the user agent or the platform in the current context
app.commandLine.appendSwitch('enable-experimental-web-platform-features');

function createWindow(): void {
  const savedSize = store.get('windowSize', {
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT
  }) as { width: number; height: number };

  // Create the browser window.
  let mainWindow: BrowserWindow | null = new BrowserWindow({
    titleBarStyle: isMacOS() ? 'hiddenInset' : 'default',
    titleBarOverlay: isMacOS() ? false : true,
    width: savedSize.width,
    height: savedSize.height,
    show: false,
    frame: true,
    trafficLightPosition: { x: 20, y: 10 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  });

  registerAppMenu();
  batchRegisterCustomFonts(mainWindow);

  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow?.removeAllListeners();
    mainWindow = null;
    ipcMain.removeAllListeners();
  });

  mainWindow.on('resize', () => {
    const [width, height] = mainWindow?.getSize() || [DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT];

    store.set('windowSize', { width, height });
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // mainWindow.webContents.openDevTools();

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  if (isMacOS()) {
    ipcMain.on(EVENTS.toggleTrafficLight, (event, isShow) => {
      mainWindow?.setWindowButtonVisibility(isShow);
    });
  }

  ipcMain.on(EVENTS.loadCustomFont, async () => {
    loadCustomFont(mainWindow);
  });

  ipcMain.on(EVENTS.removeCustomFont, async (event, fontPath: string) => {
    removeCustomFont(fontPath, mainWindow);
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  // autoUpdater.checkForUpdatesAndNotify();

  // autoUpdater.on('update-available', (info) => {
  //   notify(`update avilable: ${info && JSON.stringify(info)} `);
  // });

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
