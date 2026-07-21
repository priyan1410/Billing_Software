const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initialDbStore } = require('./db');

let mainWindow;
const db = initialDbStore;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    title: 'Kish Mandhi - Desktop Billing Software',
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC Handlers
ipcMain.handle('menu:getCategories', async () => {
  return { success: true, data: db.categories };
});

ipcMain.handle('menu:getItems', async (_evt: any, categoryId: any) => {
  let filtered = db.menuItems.filter((i: any) => i.isAvailable);
  if (categoryId && categoryId !== 'all') {
    filtered = filtered.filter((i: any) => String(i.categoryId) === String(categoryId));
  }
  return { success: true, data: filtered };
});

ipcMain.handle('menu:saveItem', async (_evt: any, itemData: any) => {
  const newItem = {
    id: db.menuItems.length + 1,
    categoryId: Number(itemData.category_id || itemData.categoryId),
    name: itemData.name,
    priceQuarter: Number(itemData.price_quarter || itemData.priceQuarter || 0),
    priceHalf: Number(itemData.price_half || itemData.priceHalf || 0),
    priceFull: Number(itemData.price_full || itemData.priceFull || 0),
    isAvailable: true
  };
  db.menuItems.push(newItem);
  return { success: true, data: newItem };
});

ipcMain.handle('menu:updateItem', async (_evt: any, itemData: any) => {
  const target = db.menuItems.find((i: any) => Number(i.id) === Number(itemData.id));
  if (target) {
    target.name = itemData.name;
    target.categoryId = Number(itemData.category_id || itemData.categoryId);
    target.priceQuarter = Number(itemData.price_quarter || itemData.priceQuarter || 0);
    target.priceHalf = Number(itemData.price_half || itemData.priceHalf || 0);
    target.priceFull = Number(itemData.price_full || itemData.priceFull || 0);
  }
  return { success: true };
});

ipcMain.handle('menu:deleteItem', async (_evt: any, id: any) => {
  db.menuItems = db.menuItems.filter((i: any) => Number(i.id) !== Number(id));
  return { success: true };
});

ipcMain.handle('orders:create', async (_evt: any, orderData: any) => {
  const nextSeq = db.orders.length + 1;
  const seqStr = String(nextSeq).padStart(3, '0');

  const orderNumber = orderData.order_number || orderData.orderNumber || `KMIV-${seqStr}`;

  const newOrder = {
    id: db.orders.length + 101,
    orderNumber,
    orderType: orderData.order_type || orderData.orderType || 'Dine-In',
    subtotal: orderData.subtotal,
    taxAmount: orderData.tax_amount || orderData.taxAmount,
    discountAmount: orderData.discount_amount || orderData.discountAmount,
    grandTotal: orderData.grand_total || orderData.grandTotal,
    paymentMode: orderData.payment_mode || orderData.paymentMode || 'Cash',
    items: orderData.items || [],
    shippingCharges: orderData.shipping_charges || orderData.shippingCharges || 0,
    roundOff: orderData.round_off || orderData.roundOff || 0,
    orderDate: orderData.order_date || orderData.orderDate || new Date().toISOString().split('T')[0],
    dueDate: orderData.due_date || orderData.dueDate || '',
    customerName: orderData.customer_name || orderData.customerName || '',
    customerPhone: orderData.customer_phone || orderData.customerPhone || '',
    createdAt: new Date().toISOString()
  };

  db.orders.unshift(newOrder);
  return { success: true, data: newOrder };
});

ipcMain.handle('orders:getAll', async () => {
  return { success: true, data: db.orders };
});

ipcMain.handle('orders:getByDateRange', async (_evt: any, { startDate, endDate }: any) => {
  let filtered = db.orders;
  if (startDate) {
    const start = new Date(startDate).setHours(0, 0, 0, 0);
    filtered = filtered.filter((o: any) => new Date(o.createdAt).getTime() >= start);
  }
  if (endDate) {
    const end = new Date(endDate).setHours(23, 59, 59, 999);
    filtered = filtered.filter((o: any) => new Date(o.createdAt).getTime() <= end);
  }
  return { success: true, data: filtered };
});

ipcMain.handle('dashboard:getStats', async () => {
  const totalRevenue = db.orders.reduce((sum: number, o: any) => sum + Number(o.grandTotal || 0), 0);
  const totalOrdersCount = db.orders.length;
  const totalExpenseSum = db.expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenseSum;

  return {
    success: true,
    data: {
      totalRevenue,
      totalOrdersCount,
      totalExpenseSum,
      netProfit,
      recentOrders: db.orders.slice(0, 5)
    }
  };
});

ipcMain.handle('dashboard:getPnLSummary', async (_evt: any, { startDate, endDate }: any) => {
  let filteredOrders = db.orders;
  let filteredExpenses = db.expenses;

  if (startDate) {
    const start = new Date(startDate).setHours(0, 0, 0, 0);
    filteredOrders = filteredOrders.filter((o: any) => new Date(o.createdAt).getTime() >= start);
    filteredExpenses = filteredExpenses.filter((e: any) => new Date(e.createdAt || e.expenseDate).getTime() >= start);
  }
  if (endDate) {
    const end = new Date(endDate).setHours(23, 59, 59, 999);
    filteredOrders = filteredOrders.filter((o: any) => new Date(o.createdAt).getTime() <= end);
    filteredExpenses = filteredExpenses.filter((e: any) => new Date(e.createdAt || e.expenseDate).getTime() <= end);
  }

  const totalRevenue = filteredOrders.reduce((sum: number, o: any) => sum + Number(o.grandTotal || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  return {
    success: true,
    data: {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      orderCount: filteredOrders.length,
      expenseCount: filteredExpenses.length,
      orders: filteredOrders,
      expenses: filteredExpenses
    }
  };
});

ipcMain.handle('expenses:getAll', async () => {
  return { success: true, data: db.expenses };
});

ipcMain.handle('expenses:add', async (_evt: any, expData: any) => {
  const newExp = {
    id: db.expenses.length + 1,
    category: expData.category,
    description: expData.description,
    amount: Number(expData.amount),
    expenseDate: expData.expense_date || expData.expenseDate,
    paidTo: expData.paid_to || expData.paidTo || '',
    paymentMode: expData.payment_mode || expData.paymentMode || 'Cash',
    createdAt: new Date().toISOString()
  };
  db.expenses.unshift(newExp);
  return { success: true, data: newExp };
});

ipcMain.handle('expenses:delete', async (_evt: any, id: any) => {
  db.expenses = db.expenses.filter((e: any) => Number(e.id) !== Number(id));
  return { success: true };
});

ipcMain.handle('receipt:print', async (_evt: any, receiptHtml: string) => {
  try {
    const printWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
    printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(receiptHtml)}`);
    printWin.webContents.on('did-finish-load', () => {
      printWin.webContents.print({ silent: false, printBackground: true }, () => {
        printWin.close();
      });
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
});

// Database Management Controls
ipcMain.handle('db:clearOrders', async () => {
  db.orders = [];
  return { success: true };
});

ipcMain.handle('db:clearExpenses', async () => {
  db.expenses = [];
  return { success: true };
});

ipcMain.handle('db:resetDefaults', async () => {
  db.orders = [];
  db.expenses = [];
  db.menuItems = [
    { id: 1, categoryId: 1, name: 'Special Chicken Mandhi', priceQuarter: 220, priceHalf: 420, priceFull: 790, isAvailable: true },
    { id: 2, categoryId: 1, name: 'Mutton Raan Mandhi', priceQuarter: 350, priceHalf: 680, priceFull: 1290, isAvailable: true },
    { id: 3, categoryId: 1, name: 'Beef Ribs Mandhi', priceQuarter: 280, priceHalf: 520, priceFull: 980, isAvailable: true },
    { id: 4, categoryId: 2, name: 'Peri Peri Alfaham', priceQuarter: 160, priceHalf: 310, priceFull: 590, isAvailable: true },
    { id: 5, categoryId: 2, name: 'Honey Chili Alfaham', priceQuarter: 170, priceHalf: 330, priceFull: 620, isAvailable: true },
    { id: 6, categoryId: 3, name: 'Kubboos - 2 Pcs', priceQuarter: 30, priceHalf: 30, priceFull: 30, isAvailable: true },
    { id: 7, categoryId: 3, name: 'Special Garlic Sauce', priceQuarter: 40, priceHalf: 40, priceFull: 40, isAvailable: true },
    { id: 8, categoryId: 4, name: 'Mint Lime Mojito', priceQuarter: 70, priceHalf: 70, priceFull: 70, isAvailable: true },
    { id: 9, categoryId: 4, name: 'Avocado Milkshake', priceQuarter: 110, priceHalf: 110, priceFull: 110, isAvailable: true },
    { id: 10, categoryId: 5, name: 'Turkish Kunafa', priceQuarter: 180, priceHalf: 180, priceFull: 180, isAvailable: true }
  ];
  return { success: true };
});

ipcMain.handle('db:importBackup', async (_evt: any, backupData: any) => {
  if (backupData.menuItems && Array.isArray(backupData.menuItems)) {
    db.menuItems = backupData.menuItems;
  }
  if (backupData.orders && Array.isArray(backupData.orders)) {
    db.orders = backupData.orders;
  }
  if (backupData.expenses && Array.isArray(backupData.expenses)) {
    db.expenses = backupData.expenses;
  }
  return { success: true };
});
