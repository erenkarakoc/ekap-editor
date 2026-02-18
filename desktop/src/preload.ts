import { contextBridge, ipcRenderer } from 'electron';

// Expose a minimal API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizeChange: (callback: (maximized: boolean) => void) => {
    const onMaximize = () => callback(true);
    const onUnmaximize = () => callback(false);
    ipcRenderer.on('window-maximized', onMaximize);
    ipcRenderer.on('window-unmaximized', onUnmaximize);
    return () => {
      ipcRenderer.removeListener('window-maximized', onMaximize);
      ipcRenderer.removeListener('window-unmaximized', onUnmaximize);
    };
  },
  onUpdateAvailable: (
    callback: (info: { version: string; releaseNotes: string | null }) => void,
  ) => {
    const handler = (
      _: Electron.IpcRendererEvent,
      info: { version: string; releaseNotes: string | null },
    ) => callback(info);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateProgress: (callback: (info: { percent: number }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, info: { percent: number }) => callback(info);
    ipcRenderer.on('update-progress', handler);
    return () => ipcRenderer.removeListener('update-progress', handler);
  },
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update-downloaded', callback);
    return () => {
      ipcRenderer.removeListener('update-downloaded', callback);
    };
  },
  installUpdate: () => ipcRenderer.invoke('install-update'),
  startDownload: () => ipcRenderer.invoke('start-download'),
});
