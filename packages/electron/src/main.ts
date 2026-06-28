import { app, BrowserWindow } from "electron"
import path from "node:path"
import url from "node:url"
import { spawn, type ChildProcess } from "node:child_process"

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

const isDev = !app.isPackaged

let backendProcess: ChildProcess | null = null
let frontendProcess: ChildProcess | null = null

function startServers() {
  const rootDir = isDev 
    ? path.join(__dirname, "../../..") 
    : path.join(process.resourcesPath, "..") // Fallback for production if needed

  // Start Backend
  console.log("Starting backend server...")
  backendProcess = spawn("bun", ["run", "./packages/opencode/src/index.ts", "serve", "--port", "4098"], {
    cwd: rootDir,
    shell: true,
    stdio: "pipe"
  })

  backendProcess.stdout?.on("data", (data) => console.log(`[Backend]: ${data}`))
  backendProcess.stderr?.on("data", (data) => console.error(`[Backend ERR]: ${data}`))

  // Start Frontend dev server only in development
  if (isDev) {
    console.log("Starting frontend server...")
    frontendProcess = spawn("bun", ["--cwd", "packages/app", "dev", "--", "--port", "4444"], {
      cwd: rootDir,
      shell: true,
      stdio: "pipe"
    })
    
    frontendProcess.stdout?.on("data", (data) => console.log(`[Frontend]: ${data}`))
    frontendProcess.stderr?.on("data", (data) => console.error(`[Frontend ERR]: ${data}`))
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
    mainWindow.loadFile(path.join(__dirname, "../../app/dist/index.html"))
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
