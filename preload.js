const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Menu & Dishes
  getCategories: () => ipcRenderer.invoke('menu:getCategories'),
  saveCategory: (categoryData) => ipcRenderer.invoke('menu:saveCategory', categoryData),
  updateCategory: (categoryData) => ipcRenderer.invoke('menu:updateCategory', categoryData),
  deleteCategory: (id) => ipcRenderer.invoke('menu:deleteCategory', id),
  getMenuItems: (categoryId) => ipcRenderer.invoke('menu:getItems', categoryId),
  saveMenuItem: (itemData) => ipcRenderer.invoke('menu:saveItem', itemData),
  updateMenuItem: (itemData) => ipcRenderer.invoke('menu:updateItem', itemData),
  deleteMenuItem: (id) => ipcRenderer.invoke('menu:deleteItem', id),

  // Orders & POS Billing
  createOrder: (orderData) => ipcRenderer.invoke('orders:create', orderData),
  updateOrder: (orderData) => ipcRenderer.invoke('orders:update', orderData),
  getNextOrderNumber: () => ipcRenderer.invoke('orders:getNextNumber'),
  getOrders: (filter) => ipcRenderer.invoke('orders:getAll', filter),
  getOrdersByDateRange: (dateRange) => ipcRenderer.invoke('orders:getByDateRange', dateRange),
  getOrderItems: (orderId) => ipcRenderer.invoke('orders:getItems', orderId),
  getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),
  getPnLSummary: (dateRange) => ipcRenderer.invoke('dashboard:getPnLSummary', dateRange),
  getFoodSalesReport: (filter) => ipcRenderer.invoke('reports:getFoodSales', filter),

  // Tokens (KOT)
  getNextTokenSeq: () => ipcRenderer.invoke('tokens:getNextSeq'),
  saveToken: (tokenData) => ipcRenderer.invoke('tokens:save', tokenData),
  getActiveTokens: () => ipcRenderer.invoke('tokens:getActive'),
  deleteToken: (tokenNumber) => ipcRenderer.invoke('tokens:delete', tokenNumber),

  // Expenses
  getExpenses: () => ipcRenderer.invoke('expenses:getAll'),
  addExpense: (expenseData) => ipcRenderer.invoke('expenses:add', expenseData),
  deleteExpense: (id) => ipcRenderer.invoke('expenses:delete', id),

  // Database Management
  testDbConnection: (config) => ipcRenderer.invoke('db:testConnection', config),
  saveDbConfig: (config) => ipcRenderer.invoke('db:saveConfig', config),
  getDbConfig: () => ipcRenderer.invoke('db:getConfig'),
  getStorageSize: () => ipcRenderer.invoke('db:getStorageSize'),
  getTableData: (tableName) => ipcRenderer.invoke('db:getTableData', tableName),
  clearOrders: () => ipcRenderer.invoke('db:clearOrders'),
  clearExpenses: () => ipcRenderer.invoke('db:clearExpenses'),
  resetDefaults: () => ipcRenderer.invoke('db:resetDefaults'),
  importBackup: (backupData) => ipcRenderer.invoke('db:importBackup', backupData),
  exportFullSystem: () => ipcRenderer.invoke('db:exportFullSystem'),
  importFullSystem: (fullBackupData) => ipcRenderer.invoke('db:importFullSystem', fullBackupData),

  // Auto-Backup & Data Protection
  createBackup: (customPath) => ipcRenderer.invoke('backup:create', customPath),
  listBackups: (customPath) => ipcRenderer.invoke('backup:list', customPath),
  getBackupConfig: () => ipcRenderer.invoke('backup:getConfig'),
  saveBackupConfig: (config) => ipcRenderer.invoke('backup:saveConfig', config),

  // Thermal Receipt & Dual Printing
  printReceipt: (receiptHtml, options) => ipcRenderer.invoke('receipt:print', receiptHtml, options),
  getSystemPrinters: () => ipcRenderer.invoke('system:getPrinters'),
  getPrinters: () => ipcRenderer.invoke('system:getPrinters'),

  // Auth & Restaurant Details
  register: (userData, restaurantData) => ipcRenderer.invoke('auth:register', { userData, restaurantData }),
  login: (emailOrPhone, password) => ipcRenderer.invoke('auth:login', { emailOrPhone, password }),
  hasUsers: () => ipcRenderer.invoke('auth:hasUsers'),
  verifyUser: (userId) => ipcRenderer.invoke('auth:verifyUser', userId),
  getRestaurantDetails: () => ipcRenderer.invoke('restaurant:getDetails'),
  saveRestaurantDetails: (data) => ipcRenderer.invoke('restaurant:saveDetails', data),
  updateWindowIcon: (dataUrl) => ipcRenderer.invoke('app:updateWindowIcon', dataUrl),

  // Cloud Sync (Phase 5 + 6) — works with any cloud MySQL provider
  getCloudConfig: () => ipcRenderer.invoke('cloud:getConfig'),
  saveCloudConfig: (config) => ipcRenderer.invoke('cloud:saveConfig', config),
  testCloudConnection: (config) => ipcRenderer.invoke('cloud:testConnection', config),
  getSyncStatus: () => ipcRenderer.invoke('cloud:getSyncStatus'),
  triggerSync: () => ipcRenderer.invoke('cloud:triggerSync'),
  saveSslCert: (certContent) => ipcRenderer.invoke('cloud:saveSslCert', certContent),
  cloudGetOrders: (options) => ipcRenderer.invoke('cloud:getOrders', options),
  cloudGetExpenses: (options) => ipcRenderer.invoke('cloud:getExpenses', options)
});

