const { app, BrowserWindow, ipcMain, session } = require('electron')
const path = require('path')

const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 900,
    minHeight: 500,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Spoof user-agent to Chrome so YouTube and other sites work properly
  const chromeUA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36`
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = chromeUA
    callback({ cancel: false, requestHeaders: details.requestHeaders })
  })

  // Allow webview to use permissions (camera, microphone, etc.)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true)
  })

  // Load from Vite dev server in dev, from built files in prod
  if (isDev) {
    win.loadURL('http://localhost:5173')
    // win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, 'renderer', 'dist', 'index.html'))
  }

  // Show window when ready to avoid white flash
  win.once('ready-to-show', () => {
    win.show()
  })

  // Window controls via IPC
  ipcMain.on('window-minimize', () => win.minimize())
  ipcMain.on('window-maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })
  ipcMain.on('window-close', () => win.close())

  // Report window state back to renderer
  win.on('maximize', () => {
    win.webContents.send('window-state-changed', true)
  })
  win.on('unmaximize', () => {
    win.webContents.send('window-state-changed', false)
  })
}

// Handle webview sessions — set Chrome user-agent on webview partitions too
app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    const chromeUA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36`
    contents.setUserAgent(chromeUA)

    // Allow new windows to open within the webview
    contents.setWindowOpenHandler(({ url }) => {
      contents.loadURL(url)
      return { action: 'deny' }
    })
  }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
