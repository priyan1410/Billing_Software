import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Menu & Dishes
  getCategories: () => ipcRenderer.invoke('menu:getCategories'),
  saveCategory: (categoryData: any) => ipcRenderer.invoke('menu:saveCategory', categoryData),
  updateCategory: (categoryData: any) => ipcRenderer.invoke('menu:updateCategory', categoryData),
  deleteCategory: (id: number) => ipcRenderer.invoke('menu:deleteCategory', id),
  getMenuItems: (categoryId: string | number) => ipcRenderer.invoke('menu:getItems', categoryId),
  saveMenuItem: (itemData: any) => ipcRenderer.invoke('menu:saveItem', itemData),
  updateMenuItem: (itemData: any) => ipcRenderer.invoke('menu:updateItem', itemData),
  deleteMenuItem: (id: number) => ipcRenderer.invoke('menu:deleteItem', id),

  // Orders & POS Billing
  createOrder: (orderData: any) => ipcRenderer.invoke('orders:create', orderData),
  updateOrder: (orderData: any) => ipcRenderer.invoke('orders:update', orderData),
  deleteOrder: (payload: any) => ipcRenderer.invoke('orders:delete', payload),
  getNextOrderNumber: () => ipcRenderer.invoke('orders:getNextNumber'),
  getOrders: () => ipcRenderer.invoke('orders:getAll'),
  getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),
  getFoodSalesReport: (filter?: any) => ipcRenderer.invoke('reports:getFoodSales', filter),

  // Pre-Orders
  getPreorders: () => ipcRenderer.invoke('preorders:getAll'),
  createPreorder: (payload: any) => ipcRenderer.invoke('preorders:create', payload),
  updatePreorderStatus: (payload: any) => ipcRenderer.invoke('preorders:updateStatus', payload),
  deletePreorder: (id: number) => ipcRenderer.invoke('preorders:delete', id),
  clearPastPreorders: () => ipcRenderer.invoke('preorders:clearPastDates'),

  // Tokens (KOT)
  getNextTokenSeq: () => ipcRenderer.invoke('tokens:getNextSeq'),
  saveToken: (tokenData: any) => ipcRenderer.invoke('tokens:save', tokenData),
  getActiveTokens: () => ipcRenderer.invoke('tokens:getActive'),
  deleteToken: (tokenNumber: string) => ipcRenderer.invoke('tokens:delete', tokenNumber),

  // Expenses
  getExpenses: () => ipcRenderer.invoke('expenses:getAll'),
  addExpense: (expenseData: any) => ipcRenderer.invoke('expenses:add', expenseData),
  deleteExpense: (id: number) => ipcRenderer.invoke('expenses:delete', id),


  // Database Management
  getDbConfig: () => ipcRenderer.invoke('db:getConfig'),
  getStorageSize: () => ipcRenderer.invoke('db:getStorageSize'),
  testDbConnection: (config?: any) => ipcRenderer.invoke('db:testConnection', config),
  saveDbConfig: (config: any) => ipcRenderer.invoke('db:saveConfig', config),
  clearOrders: () => ipcRenderer.invoke('db:clearOrders'),

  clearExpenses: () => ipcRenderer.invoke('db:clearExpenses'),
  resetDefaults: () => ipcRenderer.invoke('db:resetDefaults'),
  importBackup: (backupData: any) => ipcRenderer.invoke('db:importBackup', backupData),

  // Restaurant Settings & Printing
  getRestaurantDetails: () => ipcRenderer.invoke('restaurant:getDetails'),
  saveRestaurantDetails: (data: any) => ipcRenderer.invoke('restaurant:saveDetails', data),
  updateWindowIcon: (dataUrl: string) => ipcRenderer.invoke('app:updateWindowIcon', dataUrl),
  printReceipt: (receiptHtml: string, options?: any) => ipcRenderer.invoke('receipt:print', receiptHtml, options),
  getSystemPrinters: () => ipcRenderer.invoke('system:getPrinters'),
  getPrinters: () => ipcRenderer.invoke('system:getPrinters'),

  // Auth
  register: (userData: any, restaurantData: any) => ipcRenderer.invoke('auth:register', { userData, restaurantData }),
  login: (emailOrPhone: string, password: string) => ipcRenderer.invoke('auth:login', { emailOrPhone, password }),
  hasUsers: () => ipcRenderer.invoke('auth:hasUsers'),
  verifyUser: (userId: number) => ipcRenderer.invoke('auth:verifyUser', userId),

  // Cloud Sync (Phase 5 + 6) — works with any cloud MySQL provider
  getCloudConfig: () => ipcRenderer.invoke('cloud:getConfig'),
  saveCloudConfig: (config: any) => ipcRenderer.invoke('cloud:saveConfig', config),
  testCloudConnection: (config: any) => ipcRenderer.invoke('cloud:testConnection', config),
  getSyncStatus: () => ipcRenderer.invoke('cloud:getSyncStatus'),
  triggerSync: () => ipcRenderer.invoke('cloud:triggerSync'),
  saveSslCert: (certContent: string) => ipcRenderer.invoke('cloud:saveSslCert', certContent),
  cloudGetOrders: (options?: any) => ipcRenderer.invoke('cloud:getOrders', options),
  cloudGetExpenses: (options?: any) => ipcRenderer.invoke('cloud:getExpenses', options)
});

