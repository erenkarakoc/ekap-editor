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
  onUpdateAvailable: (callback: () => void) => {
    ipcRenderer.on('update-available', callback);
    return () => {
      ipcRenderer.removeListener('update-available', callback);
    };
  },
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update-downloaded', callback);
    return () => {
      ipcRenderer.removeListener('update-downloaded', callback);
    };
  },
  installUpdate: () => ipcRenderer.invoke('install-update'),
});
