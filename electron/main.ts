const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { initialDbStore } = require('./db');
const { normalizeTokenNumber, parseTokenSequence, getNextTokenNumber } = require('./tokenUtils');

let mainWindow: any = null;
const db = initialDbStore;
const tokenStatePath = path.join(app.getPath('userData'), 'token-state.json');

function persistTokenState() {
  try {
    fs.mkdirSync(path.dirname(tokenStatePath), { recursive: true });
    fs.writeFileSync(tokenStatePath, JSON.stringify({ lastTokenSeq: db.lastTokenSeq || 0, tokens: db.tokens }, null, 2));
  } catch (err) {
    console.error('Failed to persist token state:', err);
  }
}

function loadPersistedTokenState() {
  try {
    if (fs.existsSync(tokenStatePath)) {
      const raw = fs.readFileSync(tokenStatePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.lastTokenSeq) db.lastTokenSeq = Number(parsed.lastTokenSeq) || 0;
      if (Array.isArray(parsed.tokens)) db.tokens = parsed.tokens;
    }
  } catch (err) {
    console.error('Failed to load token state:', err);
  }
}

loadPersistedTokenState();

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

ipcMain.handle('menu:saveCategory', async (_evt: any, categoryData: any) => {
  const newCat = {
    id: db.categories.length > 0 ? Math.max(...db.categories.map((c: any) => c.id)) + 1 : 1,
    name: categoryData.name,
    icon: categoryData.icon || 'utensils'
  };
  db.categories.push(newCat);
  return { success: true, data: newCat };
});

ipcMain.handle('menu:updateCategory', async (_evt: any, categoryData: any) => {
  const target = db.categories.find((c: any) => Number(c.id) === Number(categoryData.id));
  if (target) {
    target.name = categoryData.name;
    if (categoryData.icon) target.icon = categoryData.icon;
    return { success: true, data: target };
  }
  return { success: false, message: 'Category not found' };
});

ipcMain.handle('menu:deleteCategory', async (_evt: any, id: any) => {
  const hasDishes = db.menuItems.some((i: any) => Number(i.categoryId) === Number(id));
  if (hasDishes) {
    return { success: false, message: 'Cannot delete category containing dishes. Reassign or delete dishes first.' };
  }
  db.categories = db.categories.filter((c: any) => Number(c.id) !== Number(id));
  return { success: true };
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

ipcMain.handle('orders:getNextNumber', async () => {
  const nextSeq = db.orders.length + 1;
  const seqStr = String(nextSeq).padStart(3, '0');
  return { success: true, nextOrderNumber: `KMIV-${seqStr}` };
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

ipcMain.handle('orders:update', async (_evt: any, orderData: any) => {
  const orderNum = orderData.order_number || orderData.orderNumber;
  const idx = db.orders.findIndex((o: any) => o.orderNumber === orderNum || o.id === orderData.id);
  if (idx !== -1) {
    db.orders[idx] = {
      ...db.orders[idx],
      orderType: orderData.order_type || orderData.orderType || db.orders[idx].orderType,
      subtotal: orderData.subtotal ?? db.orders[idx].subtotal,
      taxAmount: orderData.tax_amount || orderData.taxAmount || db.orders[idx].taxAmount,
      discountAmount: orderData.discount_amount || orderData.discountAmount || db.orders[idx].discountAmount,
      grandTotal: orderData.grand_total || orderData.grandTotal || db.orders[idx].grandTotal,
      paymentMode: orderData.payment_mode || orderData.paymentMode || db.orders[idx].paymentMode,
      items: orderData.items || db.orders[idx].items,
      roundOff: orderData.round_off ?? db.orders[idx].roundOff,
    };
    return { success: true, data: db.orders[idx] };
  }
  return { success: false, message: 'Order not found' };
});

ipcMain.handle('orders:getAll', async () => {
  return { success: true, data: db.orders };
});

ipcMain.handle('orders:getByDateRange', async (_evt: any, { startDate, endDate }: any) => {
  let filtered = db.orders;
  // Compare using local YYYY-MM-DD strings to avoid timezone shifts
  const toLocalDateOnly = (val: any) => {
    if (!val) return '';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  if (startDate) {
    const s = String(startDate);
    filtered = filtered.filter((o: any) => toLocalDateOnly(o.createdAt) >= s);
  }
  if (endDate) {
    const e = String(endDate);
    filtered = filtered.filter((o: any) => toLocalDateOnly(o.createdAt) <= e);
  }
  return { success: true, data: filtered };
});

ipcMain.handle('dashboard:getStats', async () => {
  const toLocalDateOnly = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
      return val.trim();
    }
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayStr = toLocalDateOnly(new Date());

  const todayOrders = db.orders.filter((o: any) => {
    const dt = toLocalDateOnly(o.createdAt || o.orderDate || o.created_at);
    return dt === todayStr;
  });

  const todayExpenses = db.expenses.filter((e: any) => {
    const dt = toLocalDateOnly(e.expenseDate || e.createdAt || e.created_at);
    return dt === todayStr;
  });

  const totalRevenue = todayOrders.reduce((sum: number, o: any) => sum + Number(o.grandTotal || 0), 0);
  const totalOrdersCount = todayOrders.length;
  const totalExpenseSum = todayExpenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenseSum;

  return {
    success: true,
    data: {
      totalRevenue,
      totalOrdersCount,
      totalExpenseSum,
      netProfit,
      recentOrders: todayOrders.slice(0, 5)
    }
  };
});

ipcMain.handle('dashboard:getPnLSummary', async (_evt: any, { startDate, endDate }: any) => {
  let filteredOrders = db.orders;
  let filteredExpenses = db.expenses;
  // Use local YYYY-MM-DD comparison to avoid timezone parsing differences
  const toLocalDateOnly = (val: any) => {
    if (!val) return '';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  if (startDate) {
    const s = String(startDate);
    filteredOrders = filteredOrders.filter((o: any) => toLocalDateOnly(o.createdAt) >= s);
    filteredExpenses = filteredExpenses.filter((e: any) => toLocalDateOnly(e.createdAt || e.expenseDate) >= s);
  }
  if (endDate) {
    const e = String(endDate);
    filteredOrders = filteredOrders.filter((o: any) => toLocalDateOnly(o.createdAt) <= e);
    filteredExpenses = filteredExpenses.filter((e2: any) => toLocalDateOnly(e2.createdAt || e2.expenseDate) <= e);
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
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const dateVal = expData.expense_date || expData.expenseDate || now.toISOString().slice(0, 10);
  const createdVal = expData.createdAt || expData.created_at || (expData.expense_date ? `${expData.expense_date}T${timeStr}` : now.toISOString());

  const newExp = {
    id: db.expenses.length + 1,
    category: expData.category,
    description: expData.description,
    amount: Number(expData.amount),
    expenseDate: dateVal,
    paidTo: expData.paid_to || expData.paidTo || '',
    paymentMode: expData.payment_mode || expData.paymentMode || 'Cash',
    createdAt: createdVal,
    created_at: createdVal
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
      printWin.webContents.print({ silent: false, printBackground: true, margins: { marginType: 'none' } }, () => {
        printWin.close();
      });
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
});

// ─── Token IPC Handlers ───────────────────────────────────────────────────────

ipcMain.handle('tokens:getNextSeq', async () => {
  const currentSeq = Number(db.lastTokenSeq || 0);
  const tokenNumber = getNextTokenNumber(currentSeq);
  return { success: true, nextSeq: currentSeq + 1, tokenNumber };
});

ipcMain.handle('tokens:save', async (_evt: any, tokenData: any) => {
  const normalizedToken = normalizeTokenNumber(tokenData.tokenNumber || getNextTokenNumber(Number(db.lastTokenSeq || 0)));
  const exists = db.tokens.find((t: any) => String(t.tokenNumber).toUpperCase() === normalizedToken.toUpperCase());
  if (!exists) {
    const seqNum = parseTokenSequence(normalizedToken);
    if (seqNum > (db.lastTokenSeq || 0)) {
      db.lastTokenSeq = seqNum;
    }
    db.tokens.unshift({
      tokenNumber: normalizedToken,
      orderType: tokenData.orderType || 'Dine-In',
      paymentMode: tokenData.paymentMode || 'Cash',
      items: tokenData.items || [],
      timestamp: tokenData.timestamp || '',
      date: tokenData.date || '',
      createdAt: new Date().toISOString()
    });
    persistTokenState();
  } else {
    const existingIndex = db.tokens.findIndex((t: any) => String(t.tokenNumber).toUpperCase() === normalizedToken.toUpperCase());
    if (existingIndex >= 0) {
      db.tokens[existingIndex] = {
        ...db.tokens[existingIndex],
        orderType: tokenData.orderType || db.tokens[existingIndex].orderType || 'Dine-In',
        paymentMode: tokenData.paymentMode || db.tokens[existingIndex].paymentMode || 'Cash',
        items: tokenData.items || db.tokens[existingIndex].items || [],
        timestamp: tokenData.timestamp || db.tokens[existingIndex].timestamp || '',
        date: tokenData.date || db.tokens[existingIndex].date || '',
        createdAt: db.tokens[existingIndex].createdAt || new Date().toISOString()
      };
    }
    persistTokenState();
  }
  return { success: true, data: { tokenNumber: normalizedToken } };
});

ipcMain.handle('tokens:getActive', async () => {
  return { success: true, data: db.tokens.filter((t: any) => String(t.tokenNumber || '').trim()) };
});

ipcMain.handle('tokens:delete', async (_evt: any, tokenNumber: string) => {
  const normalizedToken = normalizeTokenNumber(tokenNumber);
  db.tokens = db.tokens.filter((t: any) => String(t.tokenNumber).toUpperCase() !== normalizedToken.toUpperCase());
  persistTokenState();
  return { success: true };
});

// ─── Database Management Controls ────────────────────────────────────────────
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

ipcMain.handle('app:updateWindowIcon', async (_evt: any, dataUrl: string) => {
  try {
    const { nativeImage } = require('electron');
    if (!mainWindow || !dataUrl) return { success: false };
    const img = nativeImage.createFromDataURL(dataUrl);
    if (!img.isEmpty()) {
      mainWindow.setIcon(img);
      return { success: true };
    }
  } catch (err) {
    console.error('Failed to set window icon:', err);
  }
  return { success: false };
});

ipcMain.handle('restaurant:getDetails', async () => {
  return { success: true, data: (db as any).restaurantDetails || null };
});

ipcMain.handle('restaurant:saveDetails', async (_evt: any, data: any) => {
  (db as any).restaurantDetails = { ...data };
  if (data.softwareIconUrl && mainWindow) {
    try {
      const { nativeImage } = require('electron');
      const img = nativeImage.createFromDataURL(data.softwareIconUrl);
      if (!img.isEmpty()) mainWindow.setIcon(img);
    } catch (e) {}
  }
  return { success: true };
});

// Database Config Handlers
ipcMain.handle('db:getConfig', async () => {
  try {
    const { loadConfig } = require('../db/connection');
    return { success: true, data: loadConfig() };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('db:testConnection', async (_evt: any, customConfig: any) => {
  try {
    const { testConnection } = require('../db/connection');
    return await testConnection(customConfig || null);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('db:saveConfig', async (_evt: any, config: any) => {
  try {
    const { saveConfig } = require('../db/connection');
    return await saveConfig(config);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
});

