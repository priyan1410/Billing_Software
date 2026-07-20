const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const db = {
  categories: [
    { id: 1, name: 'Mandhi Special', icon: 'utensils' },
    { id: 2, name: 'Alfaham & Grill', icon: 'fire' },
    { id: 3, name: 'Starters & Sides', icon: 'drumstick-bite' },
    { id: 4, name: 'Beverages', icon: 'glass-martini-alt' },
    { id: 5, name: 'Desserts', icon: 'ice-cream' }
  ],
  menuItems: [
    { id: 1, categoryId: 1, name: 'Special Chicken Mandhi', priceQuarter: 220, priceHalf: 420, priceFull: 790, isAvailable: true },
    { id: 2, categoryId: 1, name: 'Mutton Raan Mandhi', priceQuarter: 350, priceHalf: 680, priceFull: 1290, isAvailable: true },
    { id: 3, categoryId: 1, name: 'Beef Ribs Mandhi', priceQuarter: 280, priceHalf: 520, priceFull: 980, isAvailable: true },
    { id: 4, categoryId: 2, name: 'Peri Peri Alfaham', priceQuarter: 160, priceHalf: 310, priceFull: 590, isAvailable: true },
    { id: 5, categoryId: 2, name: 'Honey Chili Alfaham', priceQuarter: 170, priceHalf: 330, priceFull: 620, isAvailable: true },
    { id: 6, categoryId: 3, name: 'Kubboos (2 Pcs)', priceQuarter: 30, priceHalf: 30, priceFull: 30, isAvailable: true },
    { id: 7, categoryId: 3, name: 'Special Garlic Sauce', priceQuarter: 40, priceHalf: 40, priceFull: 40, isAvailable: true },
    { id: 8, categoryId: 4, name: 'Fresh Mint Lime Mojito', priceQuarter: 70, priceHalf: 70, priceFull: 70, isAvailable: true },
    { id: 9, categoryId: 4, name: 'Avocado Milkshake', priceQuarter: 110, priceHalf: 110, priceFull: 110, isAvailable: true },
    { id: 10, categoryId: 5, name: 'Turkish Kunafa with Ice Cream', priceQuarter: 180, priceHalf: 180, priceFull: 180, isAvailable: true }
  ],
  orders: [
    {
      id: 101,
      orderNumber: 'KM-1001',
      tokenNumber: 101,
      orderType: 'Dine-In',
      subtotal: 790,
      taxAmount: 39.5,
      discountAmount: 0,
      grandTotal: 829.5,
      paymentMode: 'UPI',
      createdAt: new Date().toISOString()
    },
    {
      id: 102,
      orderNumber: 'KM-1002',
      tokenNumber: 102,
      orderType: 'Takeaway',
      subtotal: 420,
      taxAmount: 21,
      discountAmount: 20,
      grandTotal: 421,
      paymentMode: 'Cash',
      createdAt: new Date().toISOString()
    }
  ],
  expenses: [
    { id: 1, category: 'Raw Material', description: 'Basmati Rice & Premium Arabic Spices', amount: 4500, expenseDate: new Date().toISOString().split('T')[0], paidTo: 'Malabar Traders', paymentMode: 'UPI' },
    { id: 2, category: 'Raw Material', description: 'Fresh Farm Chicken & Mutton Raan', amount: 8200, expenseDate: new Date().toISOString().split('T')[0], paidTo: 'City Poultry & Meats', paymentMode: 'Cash' },
    { id: 3, category: 'Utilities', description: 'Cooking Gas Cylinders (Commercial)', amount: 3600, expenseDate: new Date().toISOString().split('T')[0], paidTo: 'Indane Gas Agency', paymentMode: 'Card' }
  ]
};

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1340,
    height: 880,
    minWidth: 1024,
    minHeight: 720,
    title: 'Kish Mandhi - Desktop Billing Software',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  });

  const fs = require('fs');
  const distPath = path.join(__dirname, 'dist/index.html');
  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('menu:getCategories', async () => {
  return { success: true, data: db.categories };
});

ipcMain.handle('menu:getItems', async (evt, categoryId) => {
  let filtered = db.menuItems.filter(i => i.isAvailable);
  if (categoryId && categoryId !== 'all') {
    filtered = filtered.filter(i => String(i.categoryId) === String(categoryId));
  }
  return { success: true, data: filtered };
});

ipcMain.handle('menu:saveItem', async (evt, itemData) => {
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

ipcMain.handle('menu:updateItem', async (evt, itemData) => {
  const target = db.menuItems.find(i => Number(i.id) === Number(itemData.id));
  if (target) {
    target.name = itemData.name;
    target.categoryId = Number(itemData.category_id || itemData.categoryId);
    target.priceQuarter = Number(itemData.price_quarter || itemData.priceQuarter || 0);
    target.priceHalf = Number(itemData.price_half || itemData.priceHalf || 0);
    target.priceFull = Number(itemData.price_full || itemData.priceFull || 0);
  }
  return { success: true };
});

ipcMain.handle('menu:deleteItem', async (evt, id) => {
  db.menuItems = db.menuItems.filter(i => Number(i.id) !== Number(id));
  return { success: true };
});

ipcMain.handle('orders:create', async (evt, orderData) => {
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
  const totalRevenue = db.orders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
  const totalOrdersCount = db.orders.length;
  const totalExpenseSum = db.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
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

ipcMain.handle('expenses:add', async (evt, expData) => {
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

ipcMain.handle('expenses:delete', async (evt, id) => {
  db.expenses = db.expenses.filter(e => Number(e.id) !== Number(id));
  return { success: true };
});

ipcMain.handle('receipt:print', async (evt, receiptHtml) => {
  try {
    const printWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
    printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(receiptHtml)}`);
    printWin.webContents.on('did-finish-load', () => {
      printWin.webContents.print({ silent: false, printBackground: true }, () => {
        printWin.close();
      });
    });
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});
