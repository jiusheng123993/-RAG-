import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServerProcessCommand } from './server-process.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverProcess: ChildProcess | null = null;

const rendererUrl = process.env.ELECTRON_RENDERER_URL;

function startBackend() {
  const command = createServerProcessCommand({
    isPackaged: app.isPackaged,
    dirname: __dirname,
    cwd: process.cwd(),
    execPath: process.env.LOCAL_PROJECT_MEMORY_NODE_PATH ?? process.execPath,
  });

  serverProcess = spawn(command.command, command.args, {
    cwd: command.cwd,
    stdio: 'inherit',
    env: process.env,
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (event) => {
    if (tray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示', click: () => mainWindow?.show() },
    { label: '退出', click: () => { tray = null; app.quit(); } }
  ]);

  tray.setToolTip('Local Project Memory');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow?.show());
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
  createTray();
});

app.on('before-quit', () => {
  serverProcess?.kill();
  serverProcess = null;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
