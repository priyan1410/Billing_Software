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
  getNextOrderNumber: () => ipcRenderer.invoke('orders:getNextNumber'),
  getOrders: () => ipcRenderer.invoke('orders:getAll'),
  getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),

  // Tokens (KOT)
  getNextTokenSeq: () => ipcRenderer.invoke('tokens:getNextSeq'),
  saveToken: (tokenData: any) => ipcRenderer.invoke('tokens:save', tokenData),
  getActiveTokens: () => ipcRenderer.invoke('tokens:getActive'),
  deleteToken: (tokenNumber: string) => ipcRenderer.invoke('tokens:delete', tokenNumber),

  // Expenses
  getExpenses: () => ipcRenderer.invoke('expenses:getAll'),
  addExpense: (expenseData: any) => ipcRenderer.invoke('expenses:add', expenseData),
  deleteExpense: (id: number) => ipcRenderer.invoke('expenses:delete', id),

  // Thermal Receipt Printing
  printReceipt: (receiptHtml: string) => ipcRenderer.invoke('receipt:print', receiptHtml),

  // Database Management
  clearOrders: () => ipcRenderer.invoke('db:clearOrders'),
  clearExpenses: () => ipcRenderer.invoke('db:clearExpenses'),
  resetDefaults: () => ipcRenderer.invoke('db:resetDefaults'),
  importBackup: (backupData: any) => ipcRenderer.invoke('db:importBackup', backupData),

  // Restaurant Settings
  getRestaurantDetails: () => ipcRenderer.invoke('restaurant:getDetails'),
  saveRestaurantDetails: (data: any) => ipcRenderer.invoke('restaurant:saveDetails', data),
  updateWindowIcon: (dataUrl: string) => ipcRenderer.invoke('app:updateWindowIcon', dataUrl),

  // Auth
  register: (userData: any, restaurantData: any) => ipcRenderer.invoke('auth:register', { userData, restaurantData }),
  login: (emailOrPhone: string, password: string) => ipcRenderer.invoke('auth:login', { emailOrPhone, password }),
  hasUsers: () => ipcRenderer.invoke('auth:hasUsers'),
  verifyUser: (userId: number) => ipcRenderer.invoke('auth:verifyUser', userId)
});

