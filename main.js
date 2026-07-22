const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { query, testConnection, saveConfig, loadConfig, dbConfig } = require('./db/connection');
const { initializeDatabase } = require('./db/schema');
const { normalizeTokenNumber, parseTokenSequence, getNextTokenNumber } = require('./electron/tokenUtils');

// Fix GPU rendering on Windows
app.disableHardwareAcceleration();

let mainWindow;
const tokenStatePath = path.join(app.getPath('userData'), 'token-state.json');
const tokenState = { lastTokenSeq: 0, tokens: [] };

function persistTokenState() {
  try {
    fs.mkdirSync(path.dirname(tokenStatePath), { recursive: true });
    fs.writeFileSync(tokenStatePath, JSON.stringify(tokenState, null, 2));
  } catch (err) {
    console.error('Failed to persist token state:', err);
  }
}

function loadPersistedTokenState() {
  try {
    if (fs.existsSync(tokenStatePath)) {
      const parsed = JSON.parse(fs.readFileSync(tokenStatePath, 'utf8'));
      if (parsed.lastTokenSeq) tokenState.lastTokenSeq = Number(parsed.lastTokenSeq) || 0;
      if (Array.isArray(parsed.tokens)) tokenState.tokens = parsed.tokens;
    }
  } catch (err) {
    console.error('Failed to load token state:', err);
  }
}

loadPersistedTokenState();

// Global Crash Prevention Handlers
process.on('uncaughtException', (err) => {
  console.error('[Main Process Uncaught Exception]:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Main Process Unhandled Rejection]:', reason);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1340,
    height: 880,
    minWidth: 1024,
    minHeight: 720,
    title: 'Kish Mandhi - Desktop Billing Software',
    backgroundColor: '#090a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      backgroundThrottling: false
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

  // Auto-reload if renderer crashes
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer crash:', details.reason);
    if (details.reason !== 'clean-exit') {
      mainWindow.reload();
    }
  });
}


app.whenReady().then(async () => {
  try {
    const dbInit = await initializeDatabase();
    if (dbInit && dbInit.success) {
      console.log('✓ MySQL Live Database connected & initialized: kish_mandhi');
    } else {
      console.log('⚠ MySQL init:', dbInit && dbInit.message);
    }
  } catch (err) {
    console.log('MySQL init error:', err.message);
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─────────────────────────────────────────────────────────────
// MENU CATEGORIES
// ─────────────────────────────────────────────────────────────
ipcMain.handle('menu:getCategories', async () => {
  const result = await query('SELECT * FROM categories ORDER BY id ASC');
  if (!result.success) return { success: false, message: result.error };
  return {
    success: true, data: result.data.map(r => ({
      id: r.id, name: r.name, icon: r.icon
    }))
  };
});

ipcMain.handle('menu:saveCategory', async (evt, categoryData) => {
  const name = (categoryData.name || '').trim();
  const icon = categoryData.icon || 'utensils';
  if (!name) return { success: false, message: 'Category name is required' };

  const result = await query('INSERT INTO categories (name, icon) VALUES (?, ?)', [name, icon]);
  if (!result.success) return { success: false, message: result.error };
  return { success: true, data: { id: result.data.insertId, name, icon } };
});

ipcMain.handle('menu:updateCategory', async (evt, categoryData) => {
  const id = Number(categoryData.id);
  const name = (categoryData.name || '').trim();
  const icon = categoryData.icon || 'utensils';
  if (!id || !name) return { success: false, message: 'Category ID and name are required' };

  const result = await query('UPDATE categories SET name = ?, icon = ? WHERE id = ?', [name, icon, id]);
  if (!result.success) return { success: false, message: result.error };
  return { success: true, data: { id, name, icon } };
});

ipcMain.handle('menu:deleteCategory', async (evt, id) => {
  const catId = Number(id);
  const checkDishes = await query('SELECT COUNT(*) as count FROM menu_items WHERE category_id = ?', [catId]);
  if (checkDishes.success && checkDishes.data[0] && Number(checkDishes.data[0].count) > 0) {
    return { success: false, message: 'Cannot delete category containing dishes. Reassign or delete dishes first.' };
  }

  const result = await query('DELETE FROM categories WHERE id = ?', [catId]);
  if (!result.success) return { success: false, message: result.error };
  return { success: true };
});

// ─────────────────────────────────────────────────────────────
// MENU ITEMS
// ─────────────────────────────────────────────────────────────
ipcMain.handle('menu:getItems', async (evt, categoryId) => {
  let sql = 'SELECT * FROM menu_items WHERE is_available = 1';
  const params = [];
  if (categoryId && categoryId !== 'all') {
    sql += ' AND category_id = ?';
    params.push(categoryId);
  }
  sql += ' ORDER BY id ASC';
  const result = await query(sql, params);
  if (!result.success) return { success: false, message: result.error };
  return {
    success: true, data: result.data.map(r => ({
      id: r.id,
      categoryId: r.category_id,
      name: r.name,
      priceQuarter: Number(r.price_quarter),
      priceHalf: Number(r.price_half),
      priceFull: Number(r.price_full),
      isAvailable: !!r.is_available
    }))
  };
});

ipcMain.handle('menu:saveItem', async (evt, itemData) => {
  const result = await query(
    'INSERT INTO menu_items (category_id, name, price_quarter, price_half, price_full, is_available) VALUES (?, ?, ?, ?, ?, 1)',
    [
      Number(itemData.category_id || itemData.categoryId),
      itemData.name,
      Number(itemData.price_quarter || itemData.priceQuarter || 0),
      Number(itemData.price_half || itemData.priceHalf || 0),
      Number(itemData.price_full || itemData.priceFull || 0)
    ]
  );
  if (!result.success) return { success: false, message: result.error };
  return { success: true, data: { id: result.data.insertId, ...itemData } };
});

ipcMain.handle('menu:updateItem', async (evt, itemData) => {
  const result = await query(
    'UPDATE menu_items SET name = ?, category_id = ?, price_quarter = ?, price_half = ?, price_full = ? WHERE id = ?',
    [
      itemData.name,
      Number(itemData.category_id || itemData.categoryId),
      Number(itemData.price_quarter || itemData.priceQuarter || 0),
      Number(itemData.price_half || itemData.priceHalf || 0),
      Number(itemData.price_full || itemData.priceFull || 0),
      Number(itemData.id)
    ]
  );
  if (!result.success) return { success: false, message: result.error };
  return { success: true };
});

ipcMain.handle('menu:deleteItem', async (evt, id) => {
  const result = await query('DELETE FROM menu_items WHERE id = ?', [Number(id)]);
  if (!result.success) return { success: false, message: result.error };
  return { success: true };
});

// ─────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────
ipcMain.handle('orders:getNextNumber', async () => {
  const maxIdRes = await query('SELECT MAX(id) as maxId FROM orders');
  const nextSeq = ((maxIdRes.data && maxIdRes.data[0] && maxIdRes.data[0].maxId) || 0) + 1;
  const seqStr = String(nextSeq).padStart(3, '0');
  return { success: true, nextOrderNumber: `KMIV-${seqStr}` };
});

ipcMain.handle('orders:create', async (evt, orderData) => {
  const maxIdRes = await query('SELECT MAX(id) as maxId FROM orders');
  const nextSeq = ((maxIdRes.data && maxIdRes.data[0] && maxIdRes.data[0].maxId) || 0) + 1;
  let orderNumber = orderData.order_number || orderData.orderNumber || `KMIV-${String(nextSeq).padStart(3, '0')}`;
  const rawToken = orderData.token_number || orderData.tokenNumber || orderData.token_id || orderData.tokenId || '';
  const normalizedToken = rawToken ? normalizeTokenNumber(rawToken) : null;

  let insertOrder = await query(
    `INSERT INTO orders (order_number, order_type, subtotal, tax_amount, discount_amount, grand_total, payment_mode, token_number, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Completed')`,
    [
      orderNumber,
      orderData.order_type || orderData.orderType || 'Dine-In',
      Number(orderData.subtotal || 0),
      Number(orderData.tax_amount || orderData.taxAmount || 0),
      Number(orderData.discount_amount || orderData.discountAmount || 0),
      Number(orderData.grand_total || orderData.grandTotal || 0),
      orderData.payment_mode || orderData.paymentMode || 'Cash',
      normalizedToken
    ]
  );

  // If duplicate entry error occurs on order_number, fallback to max(id)+1 sequence
  if (!insertOrder.success && String(insertOrder.error).includes('Duplicate entry')) {
    const maxRetry = await query('SELECT MAX(id) as maxId FROM orders');
    const seqRetry = ((maxRetry.data && maxRetry.data[0] && maxRetry.data[0].maxId) || 0) + 1;
    orderNumber = `KMIV-${String(seqRetry).padStart(3, '0')}`;

    insertOrder = await query(
      `INSERT INTO orders (order_number, order_type, subtotal, tax_amount, discount_amount, grand_total, payment_mode, token_number, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Completed')`,
      [
        orderNumber,
        orderData.order_type || orderData.orderType || 'Dine-In',
        Number(orderData.subtotal || 0),
        Number(orderData.tax_amount || orderData.taxAmount || 0),
        Number(orderData.discount_amount || orderData.discountAmount || 0),
        Number(orderData.grand_total || orderData.grandTotal || 0),
        orderData.payment_mode || orderData.paymentMode || 'Cash',
        normalizedToken
      ]
    );
  }

  if (!insertOrder.success) return { success: false, message: insertOrder.error };
  const orderId = insertOrder.data.insertId;

  // Save line items into order_items table
  if (Array.isArray(orderData.items)) {
    for (const item of orderData.items) {
      await query(
        `INSERT INTO order_items (order_id, dish_name, variant, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.name || item.dishName || 'Item',
          item.variant || 'Full',
          Number(item.quantity || 1),
          Number(item.unitPrice || item.price || 0),
          Number(item.totalPrice || (Number(item.unitPrice || item.price || 0) * Number(item.quantity || 1)))
        ]
      );
    }
  }

  const tokenRef = orderData.token_id || orderData.tokenId || orderData.tokenNumber || normalizedToken;
  const tokenId = tokenRef
    ? (String(tokenRef).startsWith('KMKOT-') ? String(tokenRef) : `KMKOT-${String(tokenRef).padStart(3, '0')}`)
    : `KMKOT-${String(orderId).padStart(3, '0')}`;

  return { success: true, data: { id: orderId, orderNumber, tokenId } };
});

ipcMain.handle('orders:getAll', async () => {
  const result = await query('SELECT * FROM orders ORDER BY created_at DESC');
  if (!result.success) return { success: false, message: result.error };
  return {
    success: true, data: result.data.map(r => ({
      id: r.id,
      orderNumber: r.order_number,
      tokenNumber: r.token_number,
      orderType: r.order_type,
      subtotal: Number(r.subtotal),
      taxAmount: Number(r.tax_amount),
      discountAmount: Number(r.discount_amount),
      grandTotal: Number(r.grand_total),
      paymentMode: r.payment_mode,
      status: r.status,
      createdAt: r.created_at
    }))
  };
});

ipcMain.handle('orders:getItems', async (evt, orderIdOrNumber) => {
  try {
    let sql = 'SELECT * FROM order_items WHERE order_id = ?';
    let params = [orderIdOrNumber];
    if (typeof orderIdOrNumber === 'string' && isNaN(Number(orderIdOrNumber))) {
      sql = `SELECT oi.* FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.order_number = ?`;
      params = [orderIdOrNumber];
    }
    const res = await query(sql, params);
    if (!res.success) return { success: false, message: res.error };
    return {
      success: true,
      data: res.data.map(r => ({
        id: r.id,
        name: r.dish_name,
        variant: r.variant,
        quantity: r.quantity,
        unitPrice: Number(r.unit_price),
        totalPrice: Number(r.total_price)
      }))
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
});


// ─────────────────────────────────────────────────────────────
// DASHBOARD STATS (live from MySQL)
// ─────────────────────────────────────────────────────────────
ipcMain.handle('dashboard:getStats', async () => {
  const revResult = await query(`SELECT COALESCE(SUM(grand_total), 0) AS total FROM orders`);
  const cntResult = await query(`SELECT COUNT(*) AS cnt FROM orders`);
  const expResult = await query(`SELECT COALESCE(SUM(amount), 0) AS total FROM expenses`);
  const recentResult = await query(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 5`);

  const totalRevenue = revResult.success ? Number(revResult.data[0].total) : 0;
  const totalOrdersCount = cntResult.success ? Number(cntResult.data[0].cnt) : 0;
  const totalExpenseSum = expResult.success ? Number(expResult.data[0].total) : 0;
  const netProfit = totalRevenue - totalExpenseSum;

  const recentOrders = recentResult.success ? recentResult.data.map(r => ({
    id: r.id,
    orderNumber: r.order_number,
    orderType: r.order_type,
    grandTotal: Number(r.grand_total),
    paymentMode: r.payment_mode,
    createdAt: r.created_at
  })) : [];

  return { success: true, data: { totalRevenue, totalOrdersCount, totalExpenseSum, netProfit, recentOrders } };
});

// Helper for formatting date strings safely as YYYY-MM-DD
function formatDateOnly(d) {
  if (!d) return '';
  if (d instanceof Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof d === 'string') {
    return d.split('T')[0].split(' ')[0];
  }
  return String(d);
}

// ─────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────
ipcMain.handle('expenses:getAll', async () => {
  const result = await query('SELECT * FROM expenses ORDER BY created_at DESC');
  if (!result.success) return { success: false, message: result.error };
  return {
    success: true, data: result.data.map(r => {
      const formattedDate = formatDateOnly(r.expense_date);
      return {
        id: r.id,
        category: r.category,
        description: r.description,
        amount: Number(r.amount),
        expenseDate: formattedDate,
        expense_date: formattedDate,
        paidTo: r.paid_to,
        paid_to: r.paid_to,
        paymentMode: r.payment_mode,
        payment_mode: r.payment_mode,
        createdAt: r.created_at
      };
    })
  };
});

ipcMain.handle('expenses:add', async (evt, expData) => {
  let expDate = formatDateOnly(expData.expense_date || expData.expenseDate);
  if (!expDate) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    expDate = `${year}-${month}-${day}`;
  }

  const result = await query(
    'INSERT INTO expenses (category, description, amount, expense_date, paid_to, payment_mode) VALUES (?, ?, ?, ?, ?, ?)',
    [
      expData.category,
      expData.description,
      Number(expData.amount),
      expDate,
      expData.paid_to || expData.paidTo || '',
      expData.payment_mode || expData.paymentMode || 'Cash'
    ]
  );
  if (!result.success) return { success: false, message: result.error };
  return { success: true, data: { id: result.data.insertId } };
});

ipcMain.handle('expenses:delete', async (evt, id) => {
  const result = await query('DELETE FROM expenses WHERE id = ?', [Number(id)]);
  if (!result.success) return { success: false, message: result.error };
  return { success: true };
});

// ─────────────────────────────────────────────────────────────
// TOKENS (KOT & active tokens)
// ─────────────────────────────────────────────────────────────
ipcMain.handle('tokens:getNextSeq', async () => {
  const currentSeq = Number(tokenState.lastTokenSeq || 0);
  const tokenNumber = getNextTokenNumber(currentSeq);
  return { success: true, nextSeq: currentSeq + 1, tokenNumber };
});

ipcMain.handle('tokens:getActive', async () => {
  try {
    const result = await query("SELECT * FROM tokens WHERE status = 'Active' OR status = 'Pending' ORDER BY id DESC");
    if (!result.success) return { success: false, message: result.error, data: [] };
    const tokens = result.data.map(r => {
      const rawItems = r.items_summary || r.items || '[]';
      let parsed = [];
      try {
        parsed = typeof rawItems === 'string' ? JSON.parse(rawItems) : (rawItems || []);
      } catch (e) { parsed = []; }
      return {
        id: r.id,
        tokenNumber: normalizeTokenNumber(r.token_number),
        orderType: r.order_type || 'Dine-In',
        tableNo: r.table_no || 'N/A',
        items: parsed,
        timestamp: r.created_at
      };
    });
    tokenState.tokens = tokens;
    persistTokenState();
    return { success: true, data: tokens };
  } catch (err) {
    console.error('tokens:getActive error:', err);
    return { success: false, message: err.message, data: [] };
  }
});

ipcMain.handle('tokens:save', async (evt, tokenData) => {
  try {
    const itemsJson = JSON.stringify(tokenData.items || []);
    const normalizedToken = normalizeTokenNumber(tokenData.tokenNumber || getNextTokenNumber(Number(tokenState.lastTokenSeq || 0)));
    const parsedSeq = parseTokenSequence(normalizedToken);
    if (parsedSeq > tokenState.lastTokenSeq) tokenState.lastTokenSeq = parsedSeq;

    const result = await query(
      `INSERT INTO tokens (token_number, order_type, table_no, items_summary, status)
       VALUES (?, ?, 'N/A', ?, 'Active')
       ON DUPLICATE KEY UPDATE order_type = VALUES(order_type), items_summary = VALUES(items_summary), status = 'Active'`,
      [normalizedToken, tokenData.orderType || 'Dine-In', itemsJson]
    );

    if (!result.success) {
      console.error('tokens:save SQL error:', result.error);
      return { success: false, message: result.error };
    }

    tokenState.tokens = tokenState.tokens.filter(t => String(t.tokenNumber).toUpperCase() !== normalizedToken.toUpperCase());
    tokenState.tokens.unshift({
      tokenNumber: normalizedToken,
      orderType: tokenData.orderType || 'Dine-In',
      items: tokenData.items || [],
      timestamp: tokenData.timestamp || new Date().toISOString()
    });
    persistTokenState();
    return { success: true, id: result.data.insertId, data: { tokenNumber: normalizedToken } };
  } catch (err) {
    console.error('tokens:save error:', err);
    return { success: false, message: err.message };
  }
});

ipcMain.handle('tokens:delete', async (evt, tokenNumber) => {
  const normalizedToken = normalizeTokenNumber(tokenNumber);
  await query(
    "UPDATE tokens SET status = 'Billed' WHERE token_number = ? OR token_number = ?",
    [normalizedToken, String(tokenNumber)]
  );
  const result = await query(
    'DELETE FROM tokens WHERE token_number = ? OR token_number = ?',
    [normalizedToken, String(tokenNumber)]
  );
  if (!result.success) return { success: false, message: result.error };
  tokenState.tokens = tokenState.tokens.filter(t => String(t.tokenNumber).toUpperCase() !== normalizedToken.toUpperCase());
  persistTokenState();
  return { success: true };
});

// ─────────────────────────────────────────────────────────────
// DATABASE CONTROLLER ACTIONS
// ─────────────────────────────────────────────────────────────
ipcMain.handle('db:clearOrders', async () => {
  await query('DELETE FROM orders');
  return { success: true };
});

ipcMain.handle('db:clearExpenses', async () => {
  await query('DELETE FROM expenses');
  return { success: true };
});

ipcMain.handle('db:resetDefaults', async () => {
  await query('DELETE FROM orders');
  await query('DELETE FROM expenses');
  return { success: true };
});

ipcMain.handle('db:getTableData', async (evt, tableName) => {
  const allowed = ['menu_items', 'orders', 'expenses', 'categories', 'tokens'];
  if (!allowed.includes(tableName)) return { success: false, message: 'Table not allowed' };
  const result = await query(`SELECT * FROM \`${tableName}\` ORDER BY id DESC`);
  if (!result.success) return { success: false, message: result.error };
  return { success: true, data: result.data };
});

ipcMain.handle('db:importBackup', async (evt, backupData) => {
  try {
    if (backupData.menuItems && Array.isArray(backupData.menuItems)) {
      await query('DELETE FROM menu_items');
      for (const item of backupData.menuItems) {
        await query(
          'INSERT INTO menu_items (category_id, name, price_quarter, price_half, price_full, is_available) VALUES (?, ?, ?, ?, ?, ?)',
          [item.categoryId || item.category_id, item.name, item.priceQuarter || 0, item.priceHalf || 0, item.priceFull || 0, 1]
        );
      }
    }
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('db:testConnection', async (evt, customConfig) => {
  return await testConnection(customConfig);
});

ipcMain.handle('db:getConfig', async () => {
  const cfg = loadConfig();
  return { success: true, data: { host: cfg.host, port: cfg.port, user: cfg.user, database: cfg.database } };
});

ipcMain.handle('db:saveConfig', async (evt, config) => {
  return saveConfig(config);
});

// ─────────────────────────────────────────────────────────────
// AUTHENTICATION & RESTAURANT DETAILS IPC HANDLERS
// ─────────────────────────────────────────────────────────────

// Check if any users are registered in the database
ipcMain.handle('auth:hasUsers', async () => {
  try {
    const result = await query('SELECT COUNT(*) AS cnt FROM users');
    if (!result.success) return { success: false, hasUsers: false };
    return { success: true, hasUsers: Number(result.data[0].cnt) > 0 };
  } catch (err) {
    return { success: false, hasUsers: false };
  }
});

// Verify a stored user session against the database
ipcMain.handle('auth:verifyUser', async (evt, userId) => {
  try {
    if (!userId) return { success: false, valid: false };
    const userRes = await query('SELECT id, username, name, email, phone, role FROM users WHERE id = ? LIMIT 1', [Number(userId)]);
    if (!userRes.success || userRes.data.length === 0) return { success: true, valid: false };
    const u = userRes.data[0];
    return {
      success: true,
      valid: true,
      user: {
        id: u.id,
        name: u.name || u.username || 'User',
        email: u.email || '',
        phone: u.phone || '',
        role: u.role || 'admin',
        username: u.username || ''
      }
    };
  } catch (err) {
    return { success: false, valid: false };
  }
});

ipcMain.handle('auth:register', async (evt, payload) => {
  try {
    const userData = payload?.userData || payload || {};
    const restaurantData = payload?.restaurantData || {};
    const name = userData.name || '';
    const email = userData.email || '';
    const phone = userData.phone || '';
    const password = userData.password || '';

    if (!password || !name) {
      return { success: false, message: 'Name and password are required.' };
    }

    // username = email if provided, else lowercase name without spaces
    const username = (email || name.replace(/\s+/g, '').toLowerCase()).trim();
    const emailVal = (email || '').trim().toLowerCase();
    const phoneVal = (phone || '').trim();

    // Check existing username or email
    const existing = await query(
      'SELECT id FROM users WHERE username = ? OR (email != \'\' AND email = ?) LIMIT 1',
      [username, emailVal]
    );
    if (existing.success && existing.data.length > 0) {
      return { success: false, message: 'User with this username/email already exists.' };
    }

    // Insert User — handle both old (username) and new (email/phone) schemas
    const userInsert = await query(
      'INSERT INTO users (username, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, name.trim(), emailVal, phoneVal, password, 'admin']
    );

    if (!userInsert.success) {
      // If INSERT failed due to missing columns, try minimal insert
      const fallback = await query(
        'INSERT INTO users (username, name, password, role) VALUES (?, ?, ?, ?)',
        [username, name.trim(), password, 'admin']
      );
      if (!fallback.success) {
        return { success: false, message: fallback.error || 'Failed to create user account in database.' };
      }
      userInsert.data = fallback.data;
    }

    const userId = userInsert.data.insertId;
    const userObj = { id: userId, name: name.trim(), email: emailVal, phone: phoneVal, role: 'admin', username };

    // Save initial restaurant details if provided
    let restObj = null;
    if (restaurantData && (restaurantData.companyName || restaurantData.ownerName)) {
      const restInsert = await query(
        `INSERT INTO restaurant_details (id, company_name, tagline, owner_name, gst_number, fssai_number, phone, email, address, tax_rate, currency, header_note, footer_note)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           company_name = VALUES(company_name),
           tagline = VALUES(tagline),
           owner_name = VALUES(owner_name),
           gst_number = VALUES(gst_number),
           fssai_number = VALUES(fssai_number),
           phone = VALUES(phone),
           email = VALUES(email),
           address = VALUES(address),
           tax_rate = VALUES(tax_rate),
           currency = VALUES(currency),
           header_note = VALUES(header_note),
           footer_note = VALUES(footer_note)`,
        [
          restaurantData.companyName || '',
          restaurantData.tagline || '',
          restaurantData.ownerName || name.trim(),
          restaurantData.gstNumber || '',
          restaurantData.fssaiNumber || '',
          restaurantData.phone || phoneVal || '',
          restaurantData.email || emailVal || '',
          restaurantData.address || '',
          Number(restaurantData.taxRate ?? 5.0),
          restaurantData.currency || '₹',
          restaurantData.headerNote || '',
          restaurantData.footerNote || ''
        ]
      );

      if (!restInsert.success) {
        return { success: false, message: 'Failed to save restaurant details: ' + restInsert.error };
      }

      restObj = {
        companyName: restaurantData.companyName || '',
        tagline: restaurantData.tagline || '',
        ownerName: restaurantData.ownerName || name.trim(),
        gstNumber: restaurantData.gstNumber || '',
        fssaiNumber: restaurantData.fssaiNumber || '',
        phone: restaurantData.phone || phoneVal || '',
        email: restaurantData.email || emailVal || '',
        address: restaurantData.address || '',
        taxRate: Number(restaurantData.taxRate ?? 5.0),
        currency: restaurantData.currency || '₹',
        headerNote: restaurantData.headerNote || '',
        footerNote: restaurantData.footerNote || ''
      };
    }

    return { success: true, user: userObj, restaurantDetails: restObj };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('auth:login', async (evt, payload) => {
  try {
    const emailOrPhone = payload?.emailOrPhone || (typeof payload === 'string' ? payload : '');
    const password = payload?.password || '';

    if (!emailOrPhone || !password) {
      return { success: false, message: 'Please enter your username/email and password.' };
    }
    const cleanInput = String(emailOrPhone).trim().toLowerCase();

    // Search by username OR email OR name OR phone — compatible with all user records
    const userRes = await query(
      `SELECT * FROM users
       WHERE LOWER(username) = ?
          OR LOWER(email) = ?
          OR LOWER(name) = ?
          OR phone = ?
       LIMIT 1`,
      [cleanInput, cleanInput, cleanInput, String(emailOrPhone).trim()]
    );

    if (!userRes.success) {
      return { success: false, message: 'Database login query error: ' + userRes.error };
    }
    if (userRes.data.length === 0) {
      return { success: false, message: 'User not found. Please check your username/email.' };
    }

    const userRow = userRes.data[0];
    if (userRow.password !== password) {
      return { success: false, message: 'Incorrect password.' };
    }

    const userObj = {
      id: userRow.id,
      name: userRow.name || userRow.username || 'User',
      email: userRow.email || '',
      phone: userRow.phone || '',
      role: userRow.role || 'admin',
      username: userRow.username || ''
    };

    // Get restaurant details
    const restRes = await query('SELECT * FROM restaurant_details WHERE id = 1 LIMIT 1');
    let restObj = null;
    if (restRes.success && restRes.data.length > 0) {
      const r = restRes.data[0];
      let parsedPrintConfig = {};
      try { if (r.print_config) parsedPrintConfig = JSON.parse(r.print_config); } catch (e) { }
      restObj = {
        companyName: r.company_name,
        tagline: r.tagline,
        ownerName: r.owner_name,
        gstNumber: r.gst_number,
        fssaiNumber: r.fssai_number,
        phone: r.phone,
        email: r.email,
        address: r.address,
        taxRate: Number(r.tax_rate),
        currency: r.currency,
        headerNote: r.header_note,
        footerNote: r.footer_note,
        ...parsedPrintConfig
      };
    }

    return { success: true, user: userObj, restaurantDetails: restObj };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('restaurant:getDetails', async () => {
  try {
    const res = await query('SELECT * FROM restaurant_details ORDER BY id ASC LIMIT 1');
    if (!res.success || res.data.length === 0) {
      return { success: true, data: null };
    }
    const r = res.data[0];
    let parsedPrintConfig = {};
    try { if (r.print_config) parsedPrintConfig = JSON.parse(r.print_config); } catch (e) { }
    return {
      success: true,
      data: {
        companyName: r.company_name || 'Kish Mandhi',
        tagline: r.tagline || '',
        ownerName: r.owner_name || '',
        gstNumber: r.gst_number || r.gst_no || '',
        fssaiNumber: r.fssai_number || r.fssai_no || '',
        phone: r.phone || '',
        email: r.email || '',
        address: r.address || '',
        taxRate: Number(r.tax_rate ?? 5),
        currency: r.currency || '₹',
        headerNote: r.header_note || '',
        footerNote: r.footer_note || r.receipt_footer || '',
        ...parsedPrintConfig
      }
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('restaurant:saveDetails', async (evt, data) => {
  try {
    const printConfigObj = {
      printShowLogo: data.printShowLogo ?? true,
      printShowAddress: data.printShowAddress ?? true,
      printShowPhone: data.printShowPhone ?? true,
      printShowGst: data.printShowGst ?? true,
      printShowHeaderNote: data.printShowHeaderNote ?? true,
      printShowTime: data.printShowTime ?? true,
      printShowTaxBreakdown: data.printShowTaxBreakdown ?? true,
      printShowRoundOff: data.printShowRoundOff ?? true,
      printShowFooterNote: data.printShowFooterNote ?? true
    };

    const colsRes = await query('SHOW COLUMNS FROM restaurant_details');
    const cols = colsRes.success ? colsRes.data.map(c => c.Field.toLowerCase()) : [];

    const checkRes = await query('SELECT id FROM restaurant_details ORDER BY id ASC LIMIT 1');

    if (checkRes.success && checkRes.data && checkRes.data.length > 0) {
      const existingId = checkRes.data[0].id;
      const setClauses = [
        'company_name = ?',
        'tagline = ?',
        'phone = ?',
        'email = ?',
        'address = ?',
        'tax_rate = ?',
        'currency = ?'
      ];
      const params = [
        data.companyName || 'Kish Mandhi',
        data.tagline || '',
        data.phone || '',
        data.email || '',
        data.address || '',
        Number(data.taxRate ?? 5.0),
        data.currency || '₹'
      ];

      if (cols.includes('owner_name')) { setClauses.push('owner_name = ?'); params.push(data.ownerName || ''); }
      if (cols.includes('gst_number')) { setClauses.push('gst_number = ?'); params.push(data.gstNumber || ''); }
      if (cols.includes('gst_no')) { setClauses.push('gst_no = ?'); params.push(data.gstNumber || ''); }
      if (cols.includes('fssai_number')) { setClauses.push('fssai_number = ?'); params.push(data.fssaiNumber || ''); }
      if (cols.includes('fssai_no')) { setClauses.push('fssai_no = ?'); params.push(data.fssaiNumber || ''); }
      if (cols.includes('header_note')) { setClauses.push('header_note = ?'); params.push(data.headerNote || ''); }
      if (cols.includes('footer_note')) { setClauses.push('footer_note = ?'); params.push(data.footerNote || ''); }
      if (cols.includes('receipt_footer')) { setClauses.push('receipt_footer = ?'); params.push(data.footerNote || ''); }
      if (cols.includes('print_config')) { setClauses.push('print_config = ?'); params.push(JSON.stringify(printConfigObj)); }

      params.push(existingId);
      const res = await query(`UPDATE restaurant_details SET ${setClauses.join(', ')} WHERE id = ?`, params);
      if (!res.success) return { success: false, message: res.error };
      return { success: true };
    } else {
      const insertFields = ['id', 'company_name', 'tagline', 'phone', 'email', 'address', 'tax_rate', 'currency'];
      const placeholders = ['1', '?', '?', '?', '?', '?', '?', '?'];
      const params = [
        data.companyName || 'Kish Mandhi',
        data.tagline || '',
        data.phone || '',
        data.email || '',
        data.address || '',
        Number(data.taxRate ?? 5.0),
        data.currency || '₹'
      ];

      if (cols.includes('owner_name')) { insertFields.push('owner_name'); placeholders.push('?'); params.push(data.ownerName || ''); }
      if (cols.includes('gst_number')) { insertFields.push('gst_number'); placeholders.push('?'); params.push(data.gstNumber || ''); }
      if (cols.includes('gst_no')) { insertFields.push('gst_no'); placeholders.push('?'); params.push(data.gstNumber || ''); }
      if (cols.includes('fssai_number')) { insertFields.push('fssai_number'); placeholders.push('?'); params.push(data.fssaiNumber || ''); }
      if (cols.includes('fssai_no')) { insertFields.push('fssai_no'); placeholders.push('?'); params.push(data.fssaiNumber || ''); }
      if (cols.includes('header_note')) { insertFields.push('header_note'); placeholders.push('?'); params.push(data.headerNote || ''); }
      if (cols.includes('footer_note')) { insertFields.push('footer_note'); placeholders.push('?'); params.push(data.footerNote || ''); }
      if (cols.includes('receipt_footer')) { insertFields.push('receipt_footer'); placeholders.push('?'); params.push(data.footerNote || ''); }
      if (cols.includes('print_config')) { insertFields.push('print_config'); placeholders.push('?'); params.push(JSON.stringify(printConfigObj)); }

      const res = await query(`INSERT INTO restaurant_details (${insertFields.join(', ')}) VALUES (${placeholders.join(', ')})`, params);
      if (!res.success) return { success: false, message: res.error };
      return { success: true };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// ─────────────────────────────────────────────────────────────
// PRINT RECEIPT
// ─────────────────────────────────────────────────────────────
ipcMain.handle('receipt:print', async (evt, receiptHtml, options = {}) => {
  try {
    const printWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
    printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(receiptHtml)}`);
    printWin.webContents.on('did-finish-load', () => {
      printWin.webContents.print(
        {
          silent: options.silent !== undefined ? options.silent : true,
          printBackground: true,
          deviceName: options.printerName || ''
        },
        (success, failureReason) => {
          printWin.close();
        }
      );
    });
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});
