import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("api", {
  openDirectory: (opts: any) => ipcRenderer.invoke("dialog:openDirectory", opts),
  toggleDevTools: () => ipcRenderer.invoke("window:toggleDevTools")
})
