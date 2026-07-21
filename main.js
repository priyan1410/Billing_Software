const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { query, testConnection, saveConfig, loadConfig, dbConfig } = require('./db/connection');
const { initializeDatabase } = require('./db/schema');

// Fix GPU rendering on Windows
app.disableHardwareAcceleration();

let mainWindow;

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
  return { success: true, data: result.data.map(r => ({
    id: r.id, name: r.name, icon: r.icon
  })) };
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
  return { success: true, data: result.data.map(r => ({
    id: r.id,
    categoryId: r.category_id,
    name: r.name,
    priceQuarter: Number(r.price_quarter),
    priceHalf: Number(r.price_half),
    priceFull: Number(r.price_full),
    isAvailable: !!r.is_available
  })) };
});

ipcMain.handle('menu:saveItem', async (evt, itemData) => {
  const result = await query(
    'INSERT INTO menu_items (category_id, name, price_quarter, price_half, price_full, is_available) VALUES (?, ?, ?, ?, ?, 1)',
    [
      Number(itemData.category_id || itemData.categoryId),
      itemData.name,
      Number(itemData.price_quarter || itemData.priceQuarter || 0),
      Number(itemData.price_half   || itemData.priceHalf   || 0),
      Number(itemData.price_full   || itemData.priceFull   || 0)
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
      Number(itemData.price_half   || itemData.priceHalf   || 0),
      Number(itemData.price_full   || itemData.priceFull   || 0),
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

  let insertOrder = await query(
    `INSERT INTO orders (order_number, order_type, subtotal, tax_amount, discount_amount, grand_total, payment_mode, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed')`,
    [
      orderNumber,
      orderData.order_type || orderData.orderType || 'Dine-In',
      Number(orderData.subtotal || 0),
      Number(orderData.tax_amount || orderData.taxAmount || 0),
      Number(orderData.discount_amount || orderData.discountAmount || 0),
      Number(orderData.grand_total || orderData.grandTotal || 0),
      orderData.payment_mode || orderData.paymentMode || 'Cash'
    ]
  );

  // If duplicate entry error occurs on order_number, fallback to max(id)+1 sequence
  if (!insertOrder.success && String(insertOrder.error).includes('Duplicate entry')) {
    const maxRetry = await query('SELECT MAX(id) as maxId FROM orders');
    const seqRetry = ((maxRetry.data && maxRetry.data[0] && maxRetry.data[0].maxId) || 0) + 1;
    orderNumber = `KMIV-${String(seqRetry).padStart(3, '0')}`;

    insertOrder = await query(
      `INSERT INTO orders (order_number, order_type, subtotal, tax_amount, discount_amount, grand_total, payment_mode, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed')`,
      [
        orderNumber,
        orderData.order_type || orderData.orderType || 'Dine-In',
        Number(orderData.subtotal || 0),
        Number(orderData.tax_amount || orderData.taxAmount || 0),
        Number(orderData.discount_amount || orderData.discountAmount || 0),
        Number(orderData.grand_total || orderData.grandTotal || 0),
        orderData.payment_mode || orderData.paymentMode || 'Cash'
      ]
    );
  }

  if (!insertOrder.success) return { success: false, message: insertOrder.error };
  const orderId = insertOrder.data.insertId;

  // Format token ID (KMKOT-001)
  const rawToken = orderData.token_id || orderData.tokenId || orderData.tokenNumber;
  const tokenId = rawToken
    ? (String(rawToken).startsWith('KMKOT-') ? String(rawToken) : `KMKOT-${String(rawToken).padStart(3, '0')}`)
    : `KMKOT-${String(orderId).padStart(3, '0')}`;

  // Insert order items referencing token_id (KMKOT-001)
  if (orderData.items && Array.isArray(orderData.items)) {
    for (const item of orderData.items) {
      await query(
        'INSERT INTO order_items (token_id, item_name, variant, unit_price, quantity, total_price) VALUES (?, ?, ?, ?, ?, ?)',
        [tokenId, item.name, item.variant || 'Full', Number(item.unitPrice || item.price || 0), Number(item.quantity || 1), Number(item.totalPrice || 0)]
      );
    }
  }

  return { success: true, data: { id: orderId, orderNumber, tokenId } };
});

ipcMain.handle('orders:getAll', async () => {
  const result = await query('SELECT * FROM orders ORDER BY created_at DESC');
  if (!result.success) return { success: false, message: result.error };
  return { success: true, data: result.data.map(r => ({
    id: r.id,
    orderNumber: r.order_number,
    orderType: r.order_type,
    subtotal: Number(r.subtotal),
    taxAmount: Number(r.tax_amount),
    discountAmount: Number(r.discount_amount),
    grandTotal: Number(r.grand_total),
    paymentMode: r.payment_mode,
    status: r.status,
    createdAt: r.created_at
  })) };
});

ipcMain.handle('orders:getItems', async (evt, orderId) => {
  let searchTokens = [String(orderId)];

  if (!isNaN(Number(orderId))) {
    const num = Number(orderId);
    searchTokens.push(`KMKOT-${String(num).padStart(3, '0')}`);
    searchTokens.push(`KMIV-${String(num).padStart(3, '0')}`);
    searchTokens.push(num);
  } else if (typeof orderId === 'string' && orderId.startsWith('KMIV-')) {
    const rawNum = orderId.replace('KMIV-', '');
    if (!isNaN(Number(rawNum))) {
      const num = Number(rawNum);
      searchTokens.push(num);
      searchTokens.push(`KMKOT-${String(num).padStart(3, '0')}`);
    }
  }

  const placeholders = searchTokens.map(() => '?').join(',');
  const result = await query(
    `SELECT * FROM order_items WHERE token_id IN (${placeholders}) ORDER BY id ASC`,
    searchTokens
  );
  if (!result.success) return { success: false, message: result.error };
  return { success: true, data: result.data.map(r => ({
    id: r.id,
    name: r.item_name,
    dishName: r.item_name,
    variant: r.variant,
    quantity: Number(r.quantity),
    unitPrice: Number(r.unit_price),
    totalPrice: Number(r.total_price)
  })) };
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
  return { success: true, data: result.data.map(r => {
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
  }) };
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
// DATABASE CONTROLLER ACTIONS
// ─────────────────────────────────────────────────────────────
ipcMain.handle('db:clearOrders', async () => {
  await query('DELETE FROM order_items');
  await query('DELETE FROM orders');
  return { success: true };
});

ipcMain.handle('db:clearExpenses', async () => {
  await query('DELETE FROM expenses');
  return { success: true };
});

ipcMain.handle('db:resetDefaults', async () => {
  await query('DELETE FROM order_items');
  await query('DELETE FROM orders');
  await query('DELETE FROM expenses');
  return { success: true };
});

ipcMain.handle('db:getTableData', async (evt, tableName) => {
  const allowed = ['menu_items', 'orders', 'expenses', 'categories', 'order_items'];
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

ipcMain.handle('db:testConnection', async () => {
  return await testConnection();
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

ipcMain.handle('auth:register', async (evt, { userData, restaurantData }) => {
  try {
    const { name, email, phone, password } = userData || {};
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
        return { success: false, message: fallback.error || 'Failed to create user account.' };
      }
      userInsert.data = fallback.data;
    }

    const userId = userInsert.data.insertId;
    const userObj = { id: userId, name: name.trim(), email: emailVal, phone: phoneVal, role: 'admin', username };

    // Save initial restaurant details if provided
    let restObj = null;
    if (restaurantData) {
      await query(
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
          restaurantData.companyName || 'Kish Mandhi',
          restaurantData.tagline || 'Arabic Grill & Fine Dining',
          restaurantData.ownerName || name.trim(),
          restaurantData.gstNumber || '',
          restaurantData.fssaiNumber || '',
          restaurantData.phone || phone || '',
          restaurantData.email || email || '',
          restaurantData.address || '',
          Number(restaurantData.taxRate ?? 5.0),
          restaurantData.currency || '₹',
          restaurantData.headerNote || 'Welcome to Kish Mandhi',
          restaurantData.footerNote || 'Thank you! Visit again.'
        ]
      );

      restObj = {
        companyName: restaurantData.companyName || 'Kish Mandhi',
        tagline: restaurantData.tagline || 'Arabic Grill & Fine Dining',
        ownerName: restaurantData.ownerName || name.trim(),
        gstNumber: restaurantData.gstNumber || '',
        fssaiNumber: restaurantData.fssaiNumber || '',
        phone: restaurantData.phone || phone || '',
        email: restaurantData.email || email || '',
        address: restaurantData.address || '',
        taxRate: Number(restaurantData.taxRate ?? 5.0),
        currency: restaurantData.currency || '₹',
        headerNote: restaurantData.headerNote || 'Welcome to Kish Mandhi',
        footerNote: restaurantData.footerNote || 'Thank you! Visit again.'
      };
    }

    return { success: true, user: userObj, restaurantDetails: restObj };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('auth:login', async (evt, { emailOrPhone, password }) => {
  try {
    if (!emailOrPhone || !password) {
      return { success: false, message: 'Please enter your username/email and password.' };
    }
    const cleanInput = emailOrPhone.trim().toLowerCase();

    // Search by username OR email OR phone — compatible with both old and new user records
    const userRes = await query(
      `SELECT * FROM users
       WHERE LOWER(username) = ?
          OR LOWER(email) = ?
          OR phone = ?
       LIMIT 1`,
      [cleanInput, cleanInput, emailOrPhone.trim()]
    );

    if (!userRes.success || userRes.data.length === 0) {
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
        footerNote: r.footer_note
      };
    }

    return { success: true, user: userObj, restaurantDetails: restObj };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('restaurant:getDetails', async () => {
  try {
    const res = await query('SELECT * FROM restaurant_details WHERE id = 1 LIMIT 1');
    if (!res.success || res.data.length === 0) {
      return { success: true, data: null };
    }
    const r = res.data[0];
    return {
      success: true,
      data: {
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
        footerNote: r.footer_note
      }
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('restaurant:saveDetails', async (evt, data) => {
  try {
    const res = await query(
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
        data.companyName || 'Kish Mandhi',
        data.tagline || '',
        data.ownerName || '',
        data.gstNumber || '',
        data.fssaiNumber || '',
        data.phone || '',
        data.email || '',
        data.address || '',
        Number(data.taxRate ?? 5.0),
        data.currency || '₹',
        data.headerNote || '',
        data.footerNote || ''
      ]
    );

    if (!res.success) return { success: false, message: res.error };
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// ─────────────────────────────────────────────────────────────
// PRINT RECEIPT
// ─────────────────────────────────────────────────────────────
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
