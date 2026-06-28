import { app, BrowserWindow, ipcMain, dialog } from "electron"
import path from "node:path"
import url from "node:url"
import { spawn, type ChildProcess } from "node:child_process"
import fs from "node:fs"

ipcMain.handle("dialog:openDirectory", async (_, opts) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: opts?.title,
    properties: ["openDirectory", ...(opts?.multiple ? ["multiSelections" as const] : [])]
  })
  if (canceled || filePaths.length === 0) return null
  return opts?.multiple ? filePaths : filePaths[0]
})

ipcMain.handle("window:toggleDevTools", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    win.webContents.toggleDevTools()
  }
})


const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

const isDev = !app.isPackaged

let backendProcess: ChildProcess | null = null
let frontendProcess: ChildProcess | null = null

function getBackendExecutablePath() {
  const platform = process.platform === "win32" ? "windows" : process.platform;
  const arch = process.arch;
  const binaryName = process.platform === "win32" ? "opencode.exe" : "opencode";
  
  const names = [
    `opencode-${platform}-${arch}`,
    `opencode-${platform}-${arch}-baseline`
  ]

  for (const name of names) {
    const fullPath = path.join(process.resourcesPath, "backend-binaries", name, "bin", binaryName)
    if (fs.existsSync(fullPath)) {
      return fullPath
    }
  }
  return null;
}

function startServers() {
  if (isDev) {
    const rootDir = path.join(__dirname, "../../..")
    console.log("Starting backend server...")
    backendProcess = spawn("bun", ["run", "./packages/opencode/src/index.ts", "serve", "--port", "4098"], {
      cwd: rootDir,
      shell: true,
      stdio: "pipe"
    })
    backendProcess.stdout?.on("data", (data) => console.log(`[Backend]: ${data}`))
    backendProcess.stderr?.on("data", (data) => console.error(`[Backend ERR]: ${data}`))

    console.log("Starting frontend server...")
    frontendProcess = spawn("bun", ["--cwd", "packages/app", "dev", "--", "--port", "4444"], {
      cwd: rootDir,
      shell: true,
      stdio: "pipe"
    })
    frontendProcess.stdout?.on("data", (data) => console.log(`[Frontend]: ${data}`))
    frontendProcess.stderr?.on("data", (data) => console.error(`[Frontend ERR]: ${data}`))
  } else {
    const backendPath = getBackendExecutablePath();
    if (backendPath) {
      console.log("Starting packaged backend server at:", backendPath)
      backendProcess = spawn(backendPath, ["serve", "--port", "4098"], {
        cwd: path.join(process.resourcesPath, ".."),
        stdio: "pipe"
      })
      backendProcess.stdout?.on("data", (data) => console.log(`[Backend]: ${data}`))
      backendProcess.stderr?.on("data", (data) => console.error(`[Backend ERR]: ${data}`))
    } else {
      console.error("CRITICAL ERROR: Packaged backend binary not found!")
    }
  }
}

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
    // Wait slightly to ensure frontend dev server is up
    setTimeout(() => {
      mainWindow.loadURL("http://localhost:4444")
      mainWindow.webContents.openDevTools()
    }, 2000)
  } else {
    mainWindow.loadFile(path.join(process.resourcesPath, "app-dist/index.html"))
  }
}

app.whenReady().then(() => {
  startServers()
  createWindow()

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit()
})

app.on("before-quit", () => {
  if (backendProcess) {
    console.log("Killing backend process...")
    backendProcess.kill()
  }
  if (frontendProcess) {
    console.log("Killing frontend process...")
    frontendProcess.kill()
  }
})
