import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', () => {
    console.log('Update available, downloading...');
    mainWindow.webContents.send('update-available');
  });

  autoUpdater.on('update-not-available', () => {
    console.log('No updates available.');
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded, ready to install.');
    mainWindow.webContents.send('update-downloaded');
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('Failed to check for updates:', err);
    });
  }, 3000);
}
