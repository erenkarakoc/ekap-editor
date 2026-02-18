import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log('Update available, downloading...');
    const notes = Array.isArray(info.releaseNotes)
      ? info.releaseNotes.map((n) => n.note ?? '').join('\n\n')
      : (info.releaseNotes ?? null);
    mainWindow.webContents.send('update-available', { version: info.version, releaseNotes: notes });
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    mainWindow.webContents.send('update-progress', { percent: Math.round(progress.percent) });
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

  ipcMain.handle('start-download', () => {
    autoUpdater.downloadUpdate();
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('Failed to check for updates:', err);
    });
  }, 3000);
}
