const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Database Configuration & Management
  testDbConnection: (config) => ipcRenderer.invoke('db:testConnection', config),
  saveDbConfig: (config) => ipcRenderer.invoke('db:saveConfig', config),
  getDbConfig: () => ipcRenderer.invoke('db:getConfig'),
  initDatabase: () => ipcRenderer.invoke('db:init'),

  // Categories & Menu Items
  getCategories: () => ipcRenderer.invoke('menu:getCategories'),
  getMenuItems: (categoryId) => ipcRenderer.invoke('menu:getItems', categoryId),
  saveMenuItem: (itemData) => ipcRenderer.invoke('menu:saveItem', itemData),
  updateMenuItem: (itemData) => ipcRenderer.invoke('menu:updateItem', itemData),
  deleteMenuItem: (id) => ipcRenderer.invoke('menu:deleteItem', id),

  // Orders & Billing
  createOrder: (orderData) => ipcRenderer.invoke('orders:create', orderData),
  getOrders: (filter) => ipcRenderer.invoke('orders:getAll', filter),
  getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),

  // Tokens (Kitchen Order Queue)
  getTokens: () => ipcRenderer.invoke('tokens:getAll'),
  updateTokenStatus: (tokenId, status) => ipcRenderer.invoke('tokens:updateStatus', { tokenId, status }),

  // Expenses
  getExpenses: () => ipcRenderer.invoke('expenses:getAll'),
  addExpense: (expenseData) => ipcRenderer.invoke('expenses:add', expenseData),
  deleteExpense: (id) => ipcRenderer.invoke('expenses:delete', id),

  // Printing & Thermal Receipt
  printReceipt: (receiptData) => ipcRenderer.invoke('receipt:print', receiptData)
});
