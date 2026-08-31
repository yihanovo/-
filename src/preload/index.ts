import { contextBridge, ipcRenderer } from 'electron'

// 这个对象会通过 contextBridge 暴露给界面（renderer），
// 后续阶段会在这里加入数据库操作等能力。
const api = {
  getCategories: () => ipcRenderer.invoke('db:getCategories'),
  addExpense: (input: { amount: number; categoryId: number; date: string; note?: string }) =>
    ipcRenderer.invoke('db:addExpense', input),
  getExpenses: () => ipcRenderer.invoke('db:getExpenses'),
  addCategory: (parentId: number | null, name: string, icon?: string) =>
    ipcRenderer.invoke('db:addCategory', parentId, name, icon ?? null),
  renameCategory: (id: number, name: string) => ipcRenderer.invoke('db:renameCategory', id, name),
  deleteCategory: (id: number) => ipcRenderer.invoke('db:deleteCategory', id),
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
}

contextBridge.exposeInMainWorld('api', api)
