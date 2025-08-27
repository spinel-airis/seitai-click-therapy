const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    title: '整体クリック・セラピー',
    resizable: true,
    minWidth: 800,
    minHeight: 600
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // 日本語メニューを設定
  const template = [
    {
      label: 'メニュー',
      submenu: [
        {
          label: 'タイトルに戻る',
          accelerator: 'CmdOrCtrl+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.reload();
          }
        },
        {
          type: 'separator'
        },
        {
          label: '開発者ツール',
          accelerator: 'F12',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.webContents.toggleDevTools();
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'ゲーム終了',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

ipcMain.handle('readText', async (_, relPath) => {
  try {
    const fullPath = path.join(__dirname, 'renderer', relPath);
    const buf = fs.readFileSync(fullPath);
    let text = buf.toString('utf8');
    
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }
    
    text = text.replace(/\r\n/g, '\n');
    return text;
  } catch (error) {
    console.error('Failed to read file:', relPath, error);
    throw error;
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});