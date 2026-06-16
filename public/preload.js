const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("leif", {
  getNotes: () => ipcRenderer.invoke("notes-get"),
  setNotes: (data) => ipcRenderer.invoke("notes-set", data),
  getConfig: () => ipcRenderer.invoke("config-get"),
  setConfig: (data) => ipcRenderer.invoke("config-set", data),
  openDataFolder: () => ipcRenderer.invoke("open-data-folder"),
  ask: (payload) => ipcRenderer.invoke("ask-claude", payload),
});
