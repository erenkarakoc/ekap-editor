import { app, BrowserWindow, dialog, ipcMain, shell, session } from 'electron';
import path from 'node:path';
import { startServer, stopServer } from './server';

const isDev = !app.isPackaged;
const DEV_SERVER_URL = 'http://localhost:3000';

let mainWindow: BrowserWindow | null = null;
let serverUrl: string = DEV_SERVER_URL;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'EKAP Editör',
    backgroundColor: '#000000',
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev,
    },
  });

  mainWindow.loadURL(serverUrl);

  // Show window when content is ready (avoids white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Notify renderer of maximize/unmaximize state changes
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized');
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-unmaximized');
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Navigate external links in default browser instead of in-app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    const appUrl = new URL(serverUrl);
    if (parsedUrl.origin !== appUrl.origin) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Security: Set CSP headers based on actual server origin
function setupCSP(): void {
  const origin = new URL(serverUrl);
  const httpOrigin = origin.origin;
  const wsOrigin = httpOrigin.replace(/^http/, 'ws');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self' ${httpOrigin} ${wsOrigin}; ` +
            `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${httpOrigin}; ` +
            `style-src 'self' 'unsafe-inline' ${httpOrigin} https://fonts.googleapis.com; ` +
            `font-src 'self' https://fonts.gstatic.com; ` +
            `img-src 'self' data: blob: ${httpOrigin}; ` +
            `connect-src 'self' ${httpOrigin} ${wsOrigin} https://*.supabase.co wss://*.supabase.co`,
        ],
      },
    });
  });
}

// Window control IPC handlers
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false);

app.whenReady().then(async () => {
  if (!isDev) {
    try {
      serverUrl = await startServer(process.resourcesPath);
    } catch (err) {
      console.error('Failed to start Next.js server:', err);
      dialog.showErrorBox(
        'EKAP Editör',
        `Sunucu başlatılamadı:\n${err instanceof Error ? err.message : String(err)}`,
      );
      app.quit();
      return;
    }
  }

  setupCSP();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  stopServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
