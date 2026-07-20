import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Menu & Dishes
  getCategories: () => ipcRenderer.invoke('menu:getCategories'),
  getMenuItems: (categoryId: string | number) => ipcRenderer.invoke('menu:getItems', categoryId),
  saveMenuItem: (itemData: any) => ipcRenderer.invoke('menu:saveItem', itemData),
  updateMenuItem: (itemData: any) => ipcRenderer.invoke('menu:updateItem', itemData),
  deleteMenuItem: (id: number) => ipcRenderer.invoke('menu:deleteItem', id),

  // Orders & POS Billing
  createOrder: (orderData: any) => ipcRenderer.invoke('orders:create', orderData),
  getOrders: () => ipcRenderer.invoke('orders:getAll'),
  getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),

  // Expenses
  getExpenses: () => ipcRenderer.invoke('expenses:getAll'),
  addExpense: (expenseData: any) => ipcRenderer.invoke('expenses:add', expenseData),
  deleteExpense: (id: number) => ipcRenderer.invoke('expenses:delete', id),

  // Thermal Receipt Printing
  printReceipt: (receiptHtml: string) => ipcRenderer.invoke('receipt:print', receiptHtml)
});
