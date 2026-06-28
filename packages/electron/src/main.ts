import { app, BrowserWindow } from "electron"
import path from "node:path"
import url from "node:url"

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, "../assets/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL("http://localhost:4444")
    mainWindow.webContents.openDevTools()
  } else {
    // In production, we assume the app package builds to `packages/app/dist`
    // However, since we are packaging, we should copy `app/dist` to our package or rely on electron-builder including it.
    // Assuming electron-builder copies the workspace `app` to our resources.
    mainWindow.loadFile(path.join(__dirname, "../../app/dist/index.html"))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit()
})
