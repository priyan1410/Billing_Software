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
  const timestamp = Date.now().toString().slice(-4);
  const tokenNumber = Math.floor(100 + Math.random() * 900);
  const orderNumber = `KM-${timestamp}`;

  const newOrder = {
    id: db.orders.length + 101,
    orderNumber,
    tokenNumber,
    orderType: orderData.order_type || orderData.orderType || 'Dine-In',
    subtotal: orderData.subtotal,
    taxAmount: orderData.tax_amount || orderData.taxAmount,
    discountAmount: orderData.discount_amount || orderData.discountAmount,
    grandTotal: orderData.grand_total || orderData.grandTotal,
    paymentMode: orderData.payment_mode || orderData.paymentMode || 'Cash',
    createdAt: new Date().toISOString()
  };

  db.orders.unshift(newOrder);
  return { success: true, data: newOrder };
});

ipcMain.handle('orders:getAll', async () => {
  return { success: true, data: db.orders };
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
