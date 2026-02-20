const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

let mainWindow = null
let pythonProcess = null
const pendingRequests = new Map()

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function getPythonPath() {
  if (isDev) {
    return path.join(__dirname, '../python/main.py')
  }
  return path.join(process.resourcesPath, 'python/main.py')
}

function getModelsPath() {
  if (isDev) {
    return path.join(__dirname, '../models')
  }
  return path.join(process.resourcesPath, 'models')
}

function getDataPath() {
  return path.join(app.getPath('userData'), 'data')
}

function startPythonBackend() {
  const pythonScript = getPythonPath()
  const modelsDir = getModelsPath()
  const dataDir = getDataPath()

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const pythonEnv = {
    ...process.env,
    MODELS_DIR: modelsDir,
    DATA_DIR: dataDir,
  }

  const pythonBin = process.platform === 'win32' ? 'python' : 'python3'
  pythonProcess = spawn(pythonBin, [pythonScript], {
    env: pythonEnv,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  let buffer = ''
  pythonProcess.stdout.on('data', (data) => {
    buffer += data.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const message = JSON.parse(trimmed)
        const { id, result, error } = message
        const pending = pendingRequests.get(id)
        if (pending) {
          pendingRequests.delete(id)
          if (error) {
            pending.reject(new Error(error))
          } else {
            pending.resolve(result)
          }
        }
      } catch (e) {
        console.error('[Python stdout parse error]', trimmed)
      }
    }
  })

  pythonProcess.stderr.on('data', (data) => {
    console.error('[Python]', data.toString())
  })

  pythonProcess.on('exit', (code) => {
    console.log(`Python process exited with code ${code}`)
    for (const [, pending] of pendingRequests) {
      pending.reject(new Error('Python process exited'))
    }
    pendingRequests.clear()
  })
}

function invokePython(channel, data) {
  return new Promise((resolve, reject) => {
    if (!pythonProcess || pythonProcess.killed) {
      reject(new Error('Python backend not running'))
      return
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    pendingRequests.set(id, { resolve, reject })

    const request = JSON.stringify({ id, channel, data }) + '\n'
    pythonProcess.stdin.write(request, (err) => {
      if (err) {
        pendingRequests.delete(id)
        reject(err)
      }
    })

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id)
        reject(new Error(`Python request timed out: ${channel}`))
      }
    }, 60000)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

ipcMain.handle('python:invoke', async (_event, { channel, data }) => {
  return invokePython(channel, data)
})

ipcMain.handle('dialog:selectFiles', async (_event, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: filters || [
      { name: 'All Supported', extensions: ['txt', 'md', 'pdf', 'jpg', 'jpeg', 'png', 'webp', 'mp3', 'wav', 'ogg', 'm4a'] },
      { name: 'Text Files', extensions: ['txt', 'md', 'rst'] },
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'] },
    ],
  })
  return result.filePaths
})

ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  return result.filePaths[0] || null
})

ipcMain.handle('shell:openExternal', async (_event, url) => {
  await shell.openExternal(url)
})

ipcMain.handle('app:getDataPath', () => {
  return getDataPath()
})

ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window:close', () => mainWindow?.close())

app.whenReady().then(() => {
  startPythonBackend()
  createWindow()
})

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill()
    pythonProcess = null
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
