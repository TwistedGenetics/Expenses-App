// Safe bridge between the app page and the desktop wrapper (folder access only)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('htsNative', {
  getFolder: () => ipcRenderer.invoke('folder:get'),
  chooseFolder: () => ipcRenderer.invoke('folder:choose'),
  openFolder: () => ipcRenderer.invoke('folder:open'),
  readData: () => ipcRenderer.invoke('data:read'),
  writeData: text => ipcRenderer.invoke('data:write', text),
  listReceipts: () => ipcRenderer.invoke('receipts:list'),
  writeReceipt: (name, base64) => ipcRenderer.invoke('receipts:write', name, base64),
  readReceipt: name => ipcRenderer.invoke('receipts:read', name),
  info: () => ipcRenderer.invoke('app:info'),
});
