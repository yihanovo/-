import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import {
  initDatabase,
  getCategories,
  addExpense,
  getExpenses,
  addCategory,
  renameCategory,
  deleteCategory
} from './db'

// 关闭硬件加速，避免部分 Windows 电脑的显卡兼容问题导致界面白屏
app.disableHardwareAcceleration()

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 900,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    title: '十一记账',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 界面准备好后再显示，避免白屏闪烁
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 外部链接用系统浏览器打开，不在应用内打开新窗口
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 开发环境加载 Vite 开发服务器，生产环境加载打包后的页面
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  try {
    await initDatabase()
  } catch (error) {
    console.error('数据库初始化失败：', error)
  }

  // 注册「读分类」接口，供界面调用
  ipcMain.handle('db:getCategories', () => {
    try {
      return getCategories()
    } catch (error) {
      console.error('读取分类失败：', error)
      return []
    }
  })

  // 注册「记一笔花销」接口
  ipcMain.handle('db:addExpense', (_event, input) => {
    try {
      return addExpense(input)
    } catch (error) {
      console.error('保存花销失败：', error)
      throw error
    }
  })

  // 注册「查询账单」接口
  ipcMain.handle('db:getExpenses', () => {
    try {
      return getExpenses()
    } catch (error) {
      console.error('查询账单失败：', error)
      return []
    }
  })

  // 注册「分类管理」接口
  ipcMain.handle('db:addCategory', (_event, parentId, name, icon) => {
    try {
      return addCategory(parentId, name, icon ?? null)
    } catch (error) {
      console.error('添加分类失败：', error)
      throw error
    }
  })
  ipcMain.handle('db:renameCategory', (_event, id, name) => {
    try {
      renameCategory(id, name)
    } catch (error) {
      console.error('重命名分类失败：', error)
      throw error
    }
  })
  ipcMain.handle('db:deleteCategory', (_event, id) => {
    try {
      deleteCategory(id)
    } catch (error) {
      console.error('删除分类失败：', error)
      throw error
    }
  })

  createWindow()

  app.on('activate', () => {
    // macOS：点击 Dock 图标且没有窗口时，重新创建窗口
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // macOS 之外，关闭所有窗口即退出应用
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
