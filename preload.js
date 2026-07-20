const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Menu & Dishes
  getCategories: () => ipcRenderer.invoke('menu:getCategories'),
  getMenuItems: (categoryId) => ipcRenderer.invoke('menu:getItems', categoryId),
  saveMenuItem: (itemData) => ipcRenderer.invoke('menu:saveItem', itemData),
  updateMenuItem: (itemData) => ipcRenderer.invoke('menu:updateItem', itemData),
  deleteMenuItem: (id) => ipcRenderer.invoke('menu:deleteItem', id),

  // Orders & POS Billing
  createOrder: (orderData) => ipcRenderer.invoke('orders:create', orderData),
  getOrders: (filter) => ipcRenderer.invoke('orders:getAll', filter),
  getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),

  // Expenses
  getExpenses: () => ipcRenderer.invoke('expenses:getAll'),
  addExpense: (expenseData) => ipcRenderer.invoke('expenses:add', expenseData),
  deleteExpense: (id) => ipcRenderer.invoke('expenses:delete', id),

  // Database Management
  testDbConnection: (config) => ipcRenderer.invoke('db:testConnection', config),
  saveDbConfig: (config) => ipcRenderer.invoke('db:saveConfig', config),
  getDbConfig: () => ipcRenderer.invoke('db:getConfig'),
  getTableData: (tableName) => ipcRenderer.invoke('db:getTableData', tableName),
  clearOrders: () => ipcRenderer.invoke('db:clearOrders'),
  clearExpenses: () => ipcRenderer.invoke('db:clearExpenses'),
  resetDefaults: () => ipcRenderer.invoke('db:resetDefaults'),
  importBackup: (backupData) => ipcRenderer.invoke('db:importBackup', backupData),

  // Thermal Receipt Printing
  printReceipt: (receiptHtml) => ipcRenderer.invoke('receipt:print', receiptHtml)
});
