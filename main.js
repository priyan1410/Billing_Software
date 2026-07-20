const { app, BrowserWindow, ipcMain, BrowserWindow: PrintWindow } = require('electron');
const path = require('path');
const { query, mockStore, testConnection, loadConfig, saveConfig } = require('./db/connection');
const { initializeDatabase } = require('./db/schema');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    title: 'Kish Mandhi - Desktop Billing & Restaurant Management System',
    icon: path.join(__dirname, 'src/assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  });

  mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

  // Initialize DB schema automatically if MySQL is reachable
  initializeDatabase().then(res => {
    console.log('Database init status:', res.message);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ==========================================
// IPC Handlers: Database Management
// ==========================================
ipcMain.handle('db:testConnection', async (evt, config) => {
  return await testConnection(config);
});

ipcMain.handle('db:saveConfig', async (evt, config) => {
  const res = saveConfig(config);
  if (res.success) {
    await initializeDatabase();
  }
  return res;
});

ipcMain.handle('db:getConfig', async () => {
  return loadConfig();
});

ipcMain.handle('db:init', async () => {
  return await initializeDatabase();
});

// ==========================================
// IPC Handlers: Menu & Categories
// ==========================================
ipcMain.handle('menu:getCategories', async () => {
  const res = await query('SELECT * FROM categories ORDER BY id ASC');
  if (res.success && res.data.length > 0) return { success: true, data: res.data };
  return { success: true, data: mockStore.categories, isMock: true };
});

ipcMain.handle('menu:getItems', async (evt, categoryId) => {
  let sql = 'SELECT * FROM menu_items WHERE is_available = 1';
  let params = [];
  if (categoryId && categoryId !== 'all') {
    sql += ' AND category_id = ?';
    params.push(categoryId);
  }
  sql += ' ORDER BY id ASC';
  const res = await query(sql, params);
  if (res.success && res.data.length > 0) return { success: true, data: res.data };

  let filtered = mockStore.menu_items;
  if (categoryId && categoryId !== 'all') {
    filtered = filtered.filter(i => String(i.category_id) === String(categoryId));
  }
  return { success: true, data: filtered, isMock: true };
});

ipcMain.handle('menu:saveItem', async (evt, itemData) => {
  const { category_id, name, price_quarter, price_half, price_full } = itemData;
  const res = await query(
    `INSERT INTO menu_items (category_id, name, price_quarter, price_half, price_full, is_available)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [category_id, name, price_quarter || 0, price_half || 0, price_full || 0]
  );
  if (res.success && res.data.insertId) {
    return { success: true, id: res.data.insertId };
  }

  const newItem = {
    id: mockStore.menu_items.length + 1,
    category_id: Number(category_id),
    name,
    price_quarter: Number(price_quarter || 0),
    price_half: Number(price_half || 0),
    price_full: Number(price_full || 0),
    is_available: 1
  };
  mockStore.menu_items.push(newItem);
  return { success: true, data: newItem, isMock: true };
});

ipcMain.handle('menu:deleteItem', async (evt, id) => {
  const res = await query('DELETE FROM menu_items WHERE id = ?', [id]);
  if (res.success) return { success: true };

  mockStore.menu_items = mockStore.menu_items.filter(i => String(i.id) !== String(id));
  return { success: true, isMock: true };
});

ipcMain.handle('menu:updateItem', async (evt, itemData) => {
  const { id, category_id, name, price_quarter, price_half, price_full } = itemData;
  const res = await query(
    `UPDATE menu_items SET category_id = ?, name = ?, price_quarter = ?, price_half = ?, price_full = ? WHERE id = ?`,
    [category_id, name, price_quarter || 0, price_half || 0, price_full || 0, id]
  );
  if (res.success) return { success: true };

  const target = mockStore.menu_items.find(i => String(i.id) === String(id));
  if (target) {
    target.category_id = Number(category_id);
    target.name = name;
    target.price_quarter = Number(price_quarter || 0);
    target.price_half = Number(price_half || 0);
    target.price_full = Number(price_full || 0);
  }
  return { success: true, isMock: true };
});

// ==========================================
// IPC Handlers: Billing & Orders
// ==========================================
ipcMain.handle('orders:create', async (evt, orderData) => {
  const { order_type, table_no, subtotal, tax_amount, discount_amount, grand_total, payment_mode, items } = orderData;
  
  // Generate token and order number
  const timestamp = Date.now().toString().slice(-4);
  const token_number = Math.floor(100 + Math.random() * 900);
  const order_number = `KM-${timestamp}`;

  const res = await query(
    `INSERT INTO orders (order_number, token_number, order_type, table_no, subtotal, tax_amount, discount_amount, grand_total, payment_mode, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed')`,
    [order_number, token_number, order_type, table_no, subtotal, tax_amount, discount_amount, grand_total, payment_mode]
  );

  if (res.success && res.data.insertId) {
    const orderId = res.data.insertId;
    let itemsSummaryList = [];

    for (const item of items) {
      await query(
        `INSERT INTO order_items (order_id, item_name, variant, unit_price, quantity, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.name, item.variant, item.unit_price, item.quantity, item.total_price]
      );
      itemsSummaryList.push(`${item.quantity}x ${item.name} (${item.variant})`);
    }

    const items_summary = itemsSummaryList.join(', ');
    await query(
      `INSERT INTO tokens (order_id, token_number, order_type, table_no, items_summary, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [orderId, token_number, order_type, table_no, items_summary]
    );

    return {
      success: true,
      data: {
        id: orderId,
        order_number,
        token_number,
        grand_total,
        created_at: new Date().toISOString()
      }
    };
  }

  // Fallback to Mock Store
  const mockId = mockStore.orders.length + 101;
  const mockOrder = {
    id: mockId,
    order_number,
    token_number,
    order_type,
    table_no,
    subtotal,
    tax_amount,
    discount_amount,
    grand_total,
    payment_mode,
    status: 'Completed',
    created_at: new Date().toISOString()
  };
  mockStore.orders.unshift(mockOrder);

  let summaryParts = [];
  items.forEach((item, idx) => {
    mockStore.order_items.push({
      id: mockStore.order_items.length + 1,
      order_id: mockId,
      item_name: item.name,
      variant: item.variant,
      unit_price: item.unit_price,
      quantity: item.quantity,
      total_price: item.total_price
    });
    summaryParts.push(`${item.quantity}x ${item.name} (${item.variant})`);
  });

  const mockToken = {
    id: mockStore.tokens.length + 1,
    order_id: mockId,
    token_number,
    order_type,
    table_no,
    items_summary: summaryParts.join(', '),
    status: 'Pending',
    created_at: new Date().toISOString()
  };
  mockStore.tokens.unshift(mockToken);

  return { success: true, data: mockOrder, isMock: true };
});

ipcMain.handle('orders:getAll', async (evt, filter) => {
  const res = await query('SELECT * FROM orders ORDER BY id DESC LIMIT 50');
  if (res.success && res.data.length > 0) return { success: true, data: res.data };
  return { success: true, data: mockStore.orders, isMock: true };
});

// ==========================================
// IPC Handlers: Dashboard Analytics
// ==========================================
ipcMain.handle('dashboard:getStats', async () => {
  const dbOrders = await query('SELECT * FROM orders');
  const dbExpenses = await query('SELECT * FROM expenses');

  let orders = mockStore.orders;
  let expenses = mockStore.expenses;

  if (dbOrders.success && dbOrders.data.length > 0) orders = dbOrders.data;
  if (dbExpenses.success && dbExpenses.data.length > 0) expenses = dbExpenses.data;

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.grand_total || 0), 0);
  const totalOrdersCount = orders.length;
  const totalExpenseSum = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenseSum;

  const pendingTokens = mockStore.tokens.filter(t => t.status === 'Pending' || t.status === 'Cooking').length;

  return {
    success: true,
    data: {
      totalRevenue,
      totalOrdersCount,
      totalExpenseSum,
      netProfit,
      pendingTokens,
      recentOrders: orders.slice(0, 5)
    }
  };
});

// ==========================================
// IPC Handlers: Tokens Management
// ==========================================
ipcMain.handle('tokens:getAll', async () => {
  const res = await query('SELECT * FROM tokens ORDER BY id DESC');
  if (res.success && res.data.length > 0) return { success: true, data: res.data };
  return { success: true, data: mockStore.tokens, isMock: true };
});

ipcMain.handle('tokens:updateStatus', async (evt, { tokenId, status }) => {
  const res = await query('UPDATE tokens SET status = ? WHERE id = ?', [status, tokenId]);
  if (res.success) return { success: true };

  const target = mockStore.tokens.find(t => String(t.id) === String(tokenId));
  if (target) target.status = status;
  return { success: true, isMock: true };
});

// ==========================================
// IPC Handlers: Expenses Module
// ==========================================
ipcMain.handle('expenses:getAll', async () => {
  const res = await query('SELECT * FROM expenses ORDER BY id DESC');
  if (res.success && res.data.length > 0) return { success: true, data: res.data };
  return { success: true, data: mockStore.expenses, isMock: true };
});

ipcMain.handle('expenses:add', async (evt, expData) => {
  const { category, description, amount, expense_date, paid_to, payment_mode } = expData;
  const res = await query(
    `INSERT INTO expenses (category, description, amount, expense_date, paid_to, payment_mode)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [category, description, amount, expense_date, paid_to, payment_mode]
  );
  if (res.success) return { success: true, id: res.data.insertId };

  const newExp = {
    id: mockStore.expenses.length + 1,
    category,
    description,
    amount: Number(amount),
    expense_date,
    paid_to,
    payment_mode,
    created_at: new Date().toISOString()
  };
  mockStore.expenses.unshift(newExp);
  return { success: true, data: newExp, isMock: true };
});

ipcMain.handle('expenses:delete', async (evt, id) => {
  const res = await query('DELETE FROM expenses WHERE id = ?', [id]);
  if (res.success) return { success: true };

  mockStore.expenses = mockStore.expenses.filter(e => String(e.id) !== String(id));
  return { success: true, isMock: true };
});

// ==========================================
// IPC Handlers: Thermal Receipt Printing
// ==========================================
ipcMain.handle('receipt:print', async (evt, receiptHtml) => {
  try {
    let workerWin = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false }
    });
    workerWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(receiptHtml)}`);
    workerWin.webContents.on('did-finish-load', () => {
      workerWin.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
        workerWin.close();
      });
    });
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});
