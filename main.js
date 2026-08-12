const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
app.commandLine.appendSwitch('lang', 'en-GB');
const fs = require('fs');
const path = require('path');
const { query, testConnection, saveConfig, loadConfig, dbConfig, getStorageSize } = require('./db/connection');
const { initializeDatabase } = require('./db/schema');
const { normalizeTokenNumber, parseTokenSequence, getNextTokenNumber, formatTokenNumber } = require('./electron/tokenUtils');
const { loadBackupConfig, saveBackupConfig, performBackup, listBackups, startBackupScheduler, shouldRunBackup } = require('./electron/backupManager');
const { startSyncEngine, getSyncStatus, triggerImmediateSync, refreshPendingCount } = require('./electron/syncEngine');

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
    app.setLocale('en-GB');
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

  // Initialize Auto Backup Scheduler
  startBackupScheduler(getFullSystemExportData);

  // Initialize Hybrid Background Sync Engine
  startSyncEngine();
});

let isQuitting = false;

app.on('before-quit', async (e) => {
  if (!isQuitting) {
    e.preventDefault();
    isQuitting = true;
    console.log('📦 App Closing Safeguard: Creating automatic backup snapshot before quit...');
    try {
      const res = await performBackup(getFullSystemExportData);
      if (res && res.success) {
        console.log(`✓ App Exit Backup completed successfully: ${res.filename}`);
      }
    } catch (err) {
      console.error('App Exit Backup error:', err.message);
    }
    app.quit();
  }
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
  let sql = 'SELECT m.*, c.name as category_name FROM menu_items m LEFT JOIN categories c ON m.category_id = c.id WHERE m.is_available = 1';
  const params = [];
  if (categoryId && categoryId !== 'all') {
    sql += ' AND m.category_id = ?';
    params.push(categoryId);
  }
  sql += ' ORDER BY m.id ASC';
  const result = await query(sql, params);
  if (!result.success) return { success: false, message: result.error };
  return {
    success: true, data: result.data.map(r => ({
      id: r.id,
      categoryId: r.category_id,
      categoryName: r.category_name || '',
      name: r.name,
      priceQuarter: Number(r.price_quarter),
      priceHalf: Number(r.price_half),
      priceFull: Number(r.price_full),
      isAvailable: !!r.is_available,
      comboItems: (() => {
        if (!r.combo_items) return [];
        try {
          const parsed = JSON.parse(r.combo_items);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          return String(r.combo_items).split('\n').map(s => s.trim()).filter(Boolean);
        }
      })()
    }))
  };
});

ipcMain.handle('menu:saveItem', async (evt, itemData) => {
  const comboStr = Array.isArray(itemData.comboItems)
    ? JSON.stringify(itemData.comboItems)
    : (itemData.combo_items || itemData.comboItems || null);

  const result = await query(
    'INSERT INTO menu_items (category_id, name, price_quarter, price_half, price_full, is_available, combo_items) VALUES (?, ?, ?, ?, ?, 1, ?)',
    [
      Number(itemData.category_id || itemData.categoryId),
      itemData.name,
      Number(itemData.price_quarter || itemData.priceQuarter || 0),
      Number(itemData.price_half || itemData.priceHalf || 0),
      Number(itemData.price_full || itemData.priceFull || 0),
      comboStr
    ]
  );
  if (!result.success) return { success: false, message: result.error };
  return { success: true, data: { id: result.data.insertId, ...itemData } };
});

ipcMain.handle('menu:updateItem', async (evt, itemData) => {
  const comboStr = Array.isArray(itemData.comboItems)
    ? JSON.stringify(itemData.comboItems)
    : (itemData.combo_items || itemData.comboItems || null);

  const result = await query(
    'UPDATE menu_items SET name = ?, category_id = ?, price_quarter = ?, price_half = ?, price_full = ?, combo_items = ? WHERE id = ?',
    [
      itemData.name,
      Number(itemData.category_id || itemData.categoryId),
      Number(itemData.price_quarter || itemData.priceQuarter || 0),
      Number(itemData.price_half || itemData.priceHalf || 0),
      Number(itemData.price_full || itemData.priceFull || 0),
      comboStr,
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

  const tableNum = orderData.table_number || orderData.tableNumber || (orderData.order_type === 'Delivery' ? 'DEL' : orderData.order_type === 'Takeaway' ? 'TA' : 'N/A');
  const cashAmt = Number(orderData.cash_amount || orderData.cashAmount || 0);
  const upiAmt = Number(orderData.upi_amount || orderData.upiAmount || 0);
  const delAddress = orderData.delivery_address || orderData.deliveryAddress || null;

  let insertOrder = await query(
    `INSERT INTO orders (order_number, order_type, table_number, subtotal, tax_amount, discount_amount, grand_total, payment_mode, cash_amount, upi_amount, delivery_address, token_number, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed')`,
    [
      orderNumber,
      orderData.order_type || orderData.orderType || 'Dine-In',
      tableNum,
      Number(orderData.subtotal || 0),
      Number(orderData.tax_amount || orderData.taxAmount || 0),
      Number(orderData.discount_amount || orderData.discountAmount || 0),
      Number(orderData.grand_total || orderData.grandTotal || 0),
      orderData.payment_mode || orderData.paymentMode || 'Cash',
      cashAmt,
      upiAmt,
      delAddress,
      normalizedToken
    ]
  );

  // If duplicate entry error occurs on order_number, fallback to max(id)+1 sequence
  if (!insertOrder.success && String(insertOrder.error).includes('Duplicate entry')) {
    const maxRetry = await query('SELECT MAX(id) as maxId FROM orders');
    const seqRetry = ((maxRetry.data && maxRetry.data[0] && maxRetry.data[0].maxId) || 0) + 1;
    orderNumber = `KMIV-${String(seqRetry).padStart(3, '0')}`;

    insertOrder = await query(
      `INSERT INTO orders (order_number, order_type, table_number, subtotal, tax_amount, discount_amount, grand_total, payment_mode, cash_amount, upi_amount, delivery_address, token_number, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed')`,
      [
        orderNumber,
        orderData.order_type || orderData.orderType || 'Dine-In',
        tableNum,
        Number(orderData.subtotal || 0),
        Number(orderData.tax_amount || orderData.taxAmount || 0),
        Number(orderData.discount_amount || orderData.discountAmount || 0),
        Number(orderData.grand_total || orderData.grandTotal || 0),
        orderData.payment_mode || orderData.paymentMode || 'Cash',
        cashAmt,
        upiAmt,
        delAddress,
        normalizedToken
      ]
    );
  }

  if (normalizedToken) {
    const parsedSeq = parseTokenSequence(normalizedToken);
    if (parsedSeq > tokenState.lastTokenSeq) {
      tokenState.lastTokenSeq = parsedSeq;
      persistTokenState();
    }
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

  return { success: true, data: { id: orderId, orderNumber, tokenId, tokenNumber: normalizedToken, tableNumber: tableNum } };
});

ipcMain.handle('orders:update', async (evt, orderData) => {
  const orderNumber = orderData.order_number || orderData.orderNumber;
  if (!orderNumber) return { success: false, message: 'Order number missing' };

  let orderId = orderData.id;
  if (!orderId) {
    const findRes = await query('SELECT id FROM orders WHERE order_number = ?', [orderNumber]);
    if (!findRes.success || !findRes.data.length) {
      return { success: false, message: 'Order not found' };
    }
    orderId = findRes.data[0].id;
  }

  const rawToken = orderData.token_number || orderData.tokenNumber || '';
  const normalizedToken = rawToken ? normalizeTokenNumber(rawToken) : null;
  const tableNum = orderData.table_number || orderData.tableNumber || (orderData.order_type === 'Delivery' ? 'DEL' : orderData.order_type === 'Takeaway' ? 'TA' : 'N/A');
  const cashAmt = Number(orderData.cash_amount || orderData.cashAmount || 0);
  const upiAmt = Number(orderData.upi_amount || orderData.upiAmount || 0);
  const delAddress = orderData.delivery_address || orderData.deliveryAddress || null;

  const updateRes = await query(
    `UPDATE orders SET 
      order_type = ?, 
      table_number = ?,
      subtotal = ?, 
      tax_amount = ?, 
      discount_amount = ?, 
      grand_total = ?, 
      payment_mode = ?,
      cash_amount = ?,
      upi_amount = ?,
      delivery_address = ?,
      token_number = ?
     WHERE id = ? OR order_number = ?`,
    [
      orderData.order_type || orderData.orderType || 'Dine-In',
      tableNum,
      Number(orderData.subtotal || 0),
      Number(orderData.tax_amount || orderData.taxAmount || 0),
      Number(orderData.discount_amount || orderData.discountAmount || 0),
      Number(orderData.grand_total || orderData.grandTotal || 0),
      orderData.payment_mode || orderData.paymentMode || 'Cash',
      cashAmt,
      upiAmt,
      delAddress,
      normalizedToken,
      orderId,
      orderNumber
    ]
  );

  if (!updateRes.success) return { success: false, message: updateRes.error };

  // Replace order items
  await query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
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

  return { success: true, data: { id: orderId, orderNumber, tokenNumber: normalizedToken, tableNumber: tableNum } };
});

ipcMain.handle('orders:getAll', async () => {
  const result = await query('SELECT * FROM orders ORDER BY created_at DESC');
  if (!result.success) return { success: false, message: result.error };
  return {
    success: true, data: result.data.map(r => ({
      id: r.id,
      orderNumber: r.order_number,
      tokenNumber: r.token_number,
      tableNumber: r.table_number,
      orderType: r.order_type,
      subtotal: Number(r.subtotal),
      taxAmount: Number(r.tax_amount),
      discountAmount: Number(r.discount_amount),
      grandTotal: Number(r.grand_total),
      paymentMode: r.payment_mode,
      cashAmount: Number(r.cash_amount || 0),
      upiAmount: Number(r.upi_amount || 0),
      deliveryAddress: r.delivery_address || '',
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
        name: r.dish_name || r.item_name || 'Item',
        variant: r.variant || 'Full',
        quantity: r.quantity,
        unitPrice: Number(r.unit_price || 0),
        totalPrice: Number(r.total_price || 0)
      }))
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
});


// ─────────────────────────────────────────────────────────────
// DASHBOARD STATS (live from MySQL - Today's data only)
// ─────────────────────────────────────────────────────────────
ipcMain.handle('dashboard:getStats', async () => {
  const revResult = await query(`SELECT COALESCE(SUM(grand_total), 0) AS total FROM orders WHERE DATE(created_at) = CURDATE() OR created_at LIKE CONCAT(CURDATE(), '%')`);
  const cntResult = await query(`SELECT COUNT(*) AS cnt FROM orders WHERE DATE(created_at) = CURDATE() OR created_at LIKE CONCAT(CURDATE(), '%')`);
  const expResult = await query(`SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE DATE(expense_date) = CURDATE() OR (expense_date IS NULL AND DATE(created_at) = CURDATE())`);
  let recentResult = await query(`SELECT * FROM orders WHERE DATE(created_at) = CURDATE() OR created_at LIKE CONCAT(CURDATE(), '%') ORDER BY created_at DESC LIMIT 5`);

  let recentOrdersRows = recentResult.success ? recentResult.data : [];
  if (recentOrdersRows.length === 0) {
    const fallbackRecent = await query(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 5`);
    if (fallbackRecent.success) recentOrdersRows = fallbackRecent.data;
  }

  const totalRevenue = revResult.success ? Number(revResult.data[0].total) : 0;
  const totalOrdersCount = cntResult.success ? Number(cntResult.data[0].cnt) : 0;
  const totalExpenseSum = expResult.success ? Number(expResult.data[0].total) : 0;
  const netProfit = totalRevenue - totalExpenseSum;

  const recentOrders = recentOrdersRows.map(r => ({
    id: r.id,
    orderNumber: r.order_number,
    orderType: r.order_type,
    grandTotal: Number(r.grand_total),
    paymentMode: r.payment_mode,
    createdAt: r.created_at
  }));

  const allOrdersRes = await query(`SELECT id, order_number, order_type, grand_total, payment_mode, created_at FROM orders`);
  const allExpensesRes = await query(`SELECT id, amount, expense_date, created_at FROM expenses`);

  const topDishesRes = await query(`
    SELECT 
      COALESCE(NULLIF(dish_name, ''), NULLIF(item_name, ''), 'Mandhi Special') AS name,
      SUM(quantity) AS quantity,
      SUM(total_price) AS total_sales
    FROM order_items
    GROUP BY name
    ORDER BY quantity DESC
    LIMIT 5
  `);

  const allOrders = allOrdersRes.success ? allOrdersRes.data : [];
  const allExpenses = allExpensesRes.success ? allExpensesRes.data : [];
  const topDishes = topDishesRes.success ? topDishesRes.data.map(r => ({
    name: r.name,
    quantity: Number(r.quantity || 0),
    totalSales: Number(r.total_sales || 0)
  })) : [];

  return { success: true, data: { totalRevenue, totalOrdersCount, totalExpenseSum, netProfit, recentOrders, allOrders, allExpenses, topDishes } };
});

// Helper for formatting date strings safely as YYYY-MM-DD
ipcMain.handle('reports:getFoodSales', async (evt, filter = {}) => {
  try {
    let whereClauses = [];
    let params = [];

    const { startDate, endDate, period } = filter;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const curDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${curYear}-${curMonth}-${curDay}`;

    if (period === 'today') {
      whereClauses.push('(DATE(o.created_at) = ? OR DATE(o.created_at) = CURDATE() OR o.created_at IS NULL)');
      params.push(todayStr);
    } else if (period === 'week') {
      const sevenDaysAgoObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const sY = sevenDaysAgoObj.getFullYear();
      const sM = String(sevenDaysAgoObj.getMonth() + 1).padStart(2, '0');
      const sD = String(sevenDaysAgoObj.getDate()).padStart(2, '0');
      whereClauses.push('(DATE(o.created_at) >= ? OR o.created_at IS NULL)');
      params.push(`${sY}-${sM}-${sD}`);
    } else if (period === 'month') {
      const monthStartStr = `${curYear}-${curMonth}-01`;
      whereClauses.push('(DATE(o.created_at) >= ? OR o.created_at IS NULL)');
      params.push(monthStartStr);
    } else if (period === 'year') {
      const yearStartStr = `${curYear}-01-01`;
      whereClauses.push('(DATE(o.created_at) >= ? OR o.created_at IS NULL)');
      params.push(yearStartStr);
    } else if (startDate || endDate) {
      if (startDate) {
        whereClauses.push('DATE(o.created_at) >= ?');
        params.push(startDate);
      }
      if (endDate) {
        whereClauses.push('DATE(o.created_at) <= ?');
        params.push(endDate);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT 
        COALESCE(NULLIF(oi.dish_name, ''), NULLIF(oi.item_name, ''), 'Mandhi Special') AS name,
        COALESCE(NULLIF(oi.variant, ''), 'Full') AS variant,
        SUM(oi.quantity) AS quantity,
        SUM(oi.total_price) AS total_sales,
        AVG(oi.unit_price) AS avg_unit_price
      FROM order_items oi
      LEFT JOIN orders o ON (oi.order_id = o.id OR oi.order_id = o.order_number)
      ${whereSql}
      GROUP BY name, variant
      ORDER BY quantity DESC, total_sales DESC
    `;

    const res = await query(sql, params);
    if (!res.success || !Array.isArray(res.data)) return { success: false, message: res.error || 'No records', data: [] };

    const items = res.data.map(r => ({
      name: r.name,
      variant: r.variant,
      quantity: Number(r.quantity || 0),
      totalSales: Number(r.total_sales || 0),
      avgPrice: Number(r.avg_unit_price || 0)
    }));

    return { success: true, data: items };
  } catch (err) {
    console.error('reports:getFoodSales error:', err);
    return { success: false, message: err.message, data: [] };
  }
});

// Pre-Orders Handlers
ipcMain.handle('preorders:getAll', async () => {
  try {
    const res = await query('SELECT * FROM preorders ORDER BY pickup_date ASC, created_at DESC');
    if (!res.success) return { success: false, message: res.error, data: [] };
    const items = res.data.map(r => {
      let parsedItems = [];
      try { parsedItems = typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json; } catch(e) {}
      return {
        id: r.id,
        preorderNumber: r.preorder_number,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        pickupDate: r.pickup_date,
        orderType: r.order_type,
        items: Array.isArray(parsedItems) ? parsedItems : [],
        totalAmount: Number(r.total_amount || 0),
        advancePaid: Number(r.advance_paid || 0),
        notes: r.notes || '',
        status: r.status,
        createdAt: r.created_at
      };
    });
    return { success: true, data: items };
  } catch (err) {
    console.error('preorders:getAll error:', err);
    return { success: false, message: err.message, data: [] };
  }
});

ipcMain.handle('preorders:create', async (evt, payload = {}) => {
  try {
    const { customerName, customerPhone, pickupDate, orderType, items, totalAmount, advancePaid, notes } = payload;
    const dateTag = new Date().toISOString().replace(/[-:T.]/g, '').slice(2, 8);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const preorderNumber = `PO-${dateTag}-${randomSuffix}`;
    const itemsJson = JSON.stringify(items || []);

    const res = await query(
      `INSERT INTO preorders (preorder_number, customer_name, customer_phone, pickup_date, order_type, items_json, total_amount, advance_paid, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [preorderNumber, customerName || 'Valued Customer', customerPhone || '', pickupDate || new Date().toISOString(), orderType || 'Takeaway', itemsJson, totalAmount || 0, advancePaid || 0, notes || '']
    );

    if (!res.success) return { success: false, message: res.error };
    return { success: true, data: { id: res.data.insertId, preorderNumber } };
  } catch (err) {
    console.error('preorders:create error:', err);
    return { success: false, message: err.message };
  }
});

ipcMain.handle('preorders:updateStatus', async (evt, { id, status }) => {
  try {
    const res = await query('UPDATE preorders SET status = ? WHERE id = ?', [status, id]);
    if (!res.success) return { success: false, message: res.error };
    return { success: true };
  } catch (err) {
    console.error('preorders:updateStatus error:', err);
    return { success: false, message: err.message };
  }
});

ipcMain.handle('preorders:delete', async (evt, id) => {
  try {
    const res = await query('DELETE FROM preorders WHERE id = ?', [id]);
    if (!res.success) return { success: false, message: res.error };
    return { success: true };
  } catch (err) {
    console.error('preorders:delete error:', err);
    return { success: false, message: err.message };
  }
});

ipcMain.handle('preorders:clearPastDates', async () => {
  try {
    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    const res = await query('DELETE FROM preorders WHERE DATE(pickup_date) < ?', [todayStr]);
    if (!res.success) return { success: false, message: res.error };
    return { success: true, affectedRows: res.data ? res.data.affectedRows : 0 };
  } catch (err) {
    console.error('preorders:clearPastDates error:', err);
    return { success: false, message: err.message };
  }
});

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
  const nextSeq = currentSeq + 1;
  tokenState.lastTokenSeq = nextSeq;
  persistTokenState();
  const tokenNumber = formatTokenNumber(nextSeq);
  return { success: true, nextSeq, tokenNumber };
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
        tableNo: r.table_no || (r.order_type === 'Takeaway' ? 'TA' : 'N/A'),
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

    const tableNoVal = tokenData.tableNo || tokenData.table_no || (tokenData.orderType === 'Takeaway' ? 'TA' : 'N/A');

    const result = await query(
      `INSERT INTO tokens (token_number, order_type, table_no, items_summary, status)
       VALUES (?, ?, ?, ?, 'Active')
       ON DUPLICATE KEY UPDATE order_type = VALUES(order_type), table_no = VALUES(table_no), items_summary = VALUES(items_summary), status = 'Active'`,
      [normalizedToken, tokenData.orderType || 'Dine-In', tableNoVal, itemsJson]
    );

    if (!result.success) {
      console.error('tokens:save SQL error:', result.error);
      return { success: false, message: result.error };
    }

    tokenState.tokens = tokenState.tokens.filter(t => String(t.tokenNumber).toUpperCase() !== normalizedToken.toUpperCase());
    tokenState.tokens.unshift({
      tokenNumber: normalizedToken,
      orderType: tokenData.orderType || 'Dine-In',
      tableNo: tableNoVal,
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

const formatDateTimeForDB = (val) => {
  if (!val) return new Date().toISOString().slice(0, 19).replace('T', ' ');

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return new Date().toISOString().slice(0, 19).replace('T', ' ');
    return val.toISOString().slice(0, 19).replace('T', ' ');
  }

  const str = String(val).trim();

  // If it's already YYYY-MM-DD or YYYY-MM-DD HH:MM:SS or ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 19).replace('T', ' ');
    }
    return str.slice(0, 19).replace('T', ' ');
  }

  // If it's DD/MM/YYYY or DD-MM-YYYY (e.g. 23/07/2026 or 01/01/2020)
  if (str.includes('/') || str.includes('-')) {
    const sep = str.includes('/') ? '/' : '-';
    const firstPart = str.split(' ')[0];
    const parts = firstPart.split(sep);
    if (parts.length === 3) {
      let [d, m, y] = parts;
      if (d.length === 4) {
        [y, m, d] = [d, m, y];
      }
      if (y && m && d) {
        const yNum = Number(y);
        const mNum = Number(m);
        const dNum = Number(d);
        if (!isNaN(yNum) && !isNaN(mNum) && !isNaN(dNum)) {
          const yStr = String(yNum).padStart(4, '20');
          const mStr = String(mNum).padStart(2, '0');
          const dStr = String(dNum).padStart(2, '0');
          return `${yStr}-${mStr}-${dStr} 00:00:00`;
        }
      }
    }
  }

  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    return fallback.toISOString().slice(0, 19).replace('T', ' ');
  }

  return new Date().toISOString().slice(0, 19).replace('T', ' ');
};

ipcMain.handle('db:importBackup', async (evt, backupData) => {
  try {
    let importedMenu = 0;
    let importedOrders = 0;
    let importedExpenses = 0;

    if (backupData.menuItems && Array.isArray(backupData.menuItems)) {
      for (const item of backupData.menuItems) {
        await query(
          'INSERT INTO menu_items (category_id, name, price_quarter, price_half, price_full, is_available) VALUES (?, ?, ?, ?, ?, 1)',
          [item.categoryId || item.category_id || 1, item.name, item.priceQuarter || 0, item.priceHalf || 0, item.priceFull || 0]
        );
        importedMenu++;
      }
    }

    if (backupData.orders && Array.isArray(backupData.orders)) {
      for (const o of backupData.orders) {
        const orderNum = o.orderNumber || o.order_number || `KMIV-IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const orderType = o.orderType || o.order_type || 'Dine-In';
        const subtotal = Number(o.subtotal || o.grandTotal || o.total || 0);
        const tax = Number(o.taxAmount || o.tax_amount || 0);
        const disc = Number(o.discountAmount || o.discount_amount || 0);
        const grand = Number(o.grandTotal || o.grand_total || o.total || subtotal);
        const mode = o.paymentMode || o.payment_mode || 'Cash';
        const created = formatDateTimeForDB(o.createdAt || o.created_at || o.orderDate);

        const res = await query(
          `INSERT INTO orders (order_number, order_type, subtotal, tax_amount, discount_amount, grand_total, payment_mode, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed', ?)
           ON DUPLICATE KEY UPDATE grand_total = VALUES(grand_total)`,
          [orderNum, orderType, subtotal, tax, disc, grand, mode, created]
        );
        if (res.success) {
          importedOrders++;
          const orderId = res.insertId;

          // Insert order items if present in backup record
          const itemsList = o.items || o.orderItems || o.order_items || [];
          if (orderId && Array.isArray(itemsList) && itemsList.length > 0) {
            for (const item of itemsList) {
              const name = item.name || item.itemName || item.item_name || item.dishName || 'Item';
              const qty = Number(item.quantity || item.qty || 1);
              const uPrice = Number(item.unitPrice || item.price || item.unit_price || 0);
              const tPrice = Number(item.totalPrice || item.total_price || (qty * uPrice));
              const variant = item.variant || item.portion || 'Full';
              await query(
                `INSERT INTO order_items (order_id, dish_name, item_name, variant, quantity, unit_price, total_price)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [orderId, name, name, variant, qty, uPrice, tPrice]
              );
            }
          }
        }
      }
    }

    if (backupData.expenses && Array.isArray(backupData.expenses)) {
      for (const e of backupData.expenses) {
        const cat = e.category || 'General';
        const desc = e.description || e.title || e.name || 'Imported Expense';
        const amt = Number(e.amount || 0);
        const expDate = formatDateTimeForDB(e.expenseDate || e.expense_date).slice(0, 10);
        const paidTo = e.paidTo || e.paid_to || '';
        const mode = e.paymentMode || e.payment_mode || e.paymentMethod || 'Cash';

        const res = await query(
          `INSERT INTO expenses (category, description, amount, expense_date, paid_to, payment_mode)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [cat, desc, amt, expDate, paidTo, mode]
        );
        if (res.success) importedExpenses++;
      }
    }

    return {
      success: true,
      data: { importedOrders, importedExpenses, importedMenu },
      message: `Successfully imported financial records: ${importedOrders} Orders, ${importedExpenses} Expenses!`
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

async function getFullSystemExportData() {
  const categoriesRes = await query('SELECT * FROM categories ORDER BY id ASC');
  const menuRes = await query('SELECT * FROM menu_items ORDER BY id ASC');
  const ordersRes = await query('SELECT * FROM orders ORDER BY id ASC');
  const orderItemsRes = await query('SELECT * FROM order_items ORDER BY id ASC');
  const expensesRes = await query('SELECT * FROM expenses ORDER BY id ASC');
  const tokensRes = await query('SELECT * FROM tokens ORDER BY id ASC');
  const usersRes = await query('SELECT id, username, role, created_at FROM users ORDER BY id ASC');

  let settings = {};
  const settingsRes = await query('SELECT * FROM restaurant_details LIMIT 1');
  if (settingsRes.success && settingsRes.data && settingsRes.data[0]) {
    settings = settingsRes.data[0];
  }

  const fullBackup = {
    systemInfo: {
      application: 'Kish Mandhi Billing POS',
      exportDate: new Date().toISOString(),
      version: '2.0.0',
      dataType: 'FULL_SYSTEM_MIGRATION_BACKUP'
    },
    restaurantDetails: settings,
    categories: categoriesRes.data || [],
    menuItems: menuRes.data || [],
    orders: ordersRes.data || [],
    orderItems: orderItemsRes.data || [],
    expenses: expensesRes.data || [],
    tokens: tokensRes.data || [],
    users: usersRes.data || []
  };

  return { success: true, data: fullBackup };
}

ipcMain.handle('db:exportFullSystem', async () => {
  return await getFullSystemExportData();
});

// Auto-Backup & System Recovery IPC Handlers
ipcMain.handle('backup:create', async (evt, customPath) => {
  return await performBackup(getFullSystemExportData, customPath);
});

ipcMain.handle('backup:list', async (evt, customPath) => {
  return listBackups(customPath);
});

ipcMain.handle('backup:getConfig', async () => {
  return { success: true, data: loadBackupConfig() };
});

ipcMain.handle('backup:saveConfig', async (evt, configData) => {
  const updated = saveBackupConfig(configData);
  return { success: true, data: updated };
});

ipcMain.handle('db:importFullSystem', async (evt, fullBackup) => {
  try {
    if (!fullBackup || typeof fullBackup !== 'object') {
      return { success: false, message: 'Invalid backup file payload' };
    }

    let importedMenu = 0;
    let importedOrders = 0;
    let importedExpenses = 0;
    let importedCategories = 0;
    let settingsRestored = false;

    // 1. Restore Restaurant Settings & Branding
    const rDetails = fullBackup.restaurantDetails || fullBackup.restaurant_details;
    if (rDetails && typeof rDetails === 'object') {
      const companyName = rDetails.companyName || rDetails.company_name || 'Kish Mandhi';
      const tagline = rDetails.tagline || '';
      const ownerName = rDetails.ownerName || rDetails.owner_name || '';
      const gstNumber = rDetails.gstNumber || rDetails.gst_number || rDetails.gst_no || '';
      const fssaiNumber = rDetails.fssaiNumber || rDetails.fssai_number || rDetails.fssai_no || '';
      const phone = rDetails.phone || '';
      const email = rDetails.email || '';
      const address = rDetails.address || '';
      const taxRate = Number(rDetails.taxRate || rDetails.tax_rate || 5);
      const currency = rDetails.currency || '₹';
      const headerNote = rDetails.headerNote || rDetails.header_note || '';
      const footerNote = rDetails.footerNote || rDetails.footer_note || rDetails.receipt_footer || '';
      const logoUrl = rDetails.logoUrl || rDetails.logo_url || '';
      const softwareIconUrl = rDetails.softwareIconUrl || rDetails.software_icon_url || '';

      // Update window icon if provided
      if (softwareIconUrl && mainWindow) {
        try {
          const img = nativeImage.createFromDataURL(softwareIconUrl);
          if (!img.isEmpty()) mainWindow.setIcon(img);
        } catch (e) {}
      }

      const colsRes = await query('SHOW COLUMNS FROM restaurant_details');
      const cols = colsRes.success ? colsRes.data.map(c => c.Field.toLowerCase()) : [];
      const checkRes = await query('SELECT id FROM restaurant_details ORDER BY id ASC LIMIT 1');

      if (checkRes.success && checkRes.data && checkRes.data.length > 0) {
        const existingId = checkRes.data[0].id;
        const setClauses = [
          'company_name = ?', 'tagline = ?', 'phone = ?', 'email = ?',
          'address = ?', 'tax_rate = ?', 'currency = ?'
        ];
        const params = [companyName, tagline, phone, email, address, taxRate, currency];

        if (cols.includes('owner_name')) { setClauses.push('owner_name = ?'); params.push(ownerName); }
        if (cols.includes('gst_number')) { setClauses.push('gst_number = ?'); params.push(gstNumber); }
        if (cols.includes('fssai_number')) { setClauses.push('fssai_number = ?'); params.push(fssaiNumber); }
        if (cols.includes('header_note')) { setClauses.push('header_note = ?'); params.push(headerNote); }
        if (cols.includes('footer_note')) { setClauses.push('footer_note = ?'); params.push(footerNote); }
        if (cols.includes('logo_url')) { setClauses.push('logo_url = ?'); params.push(logoUrl); }
        if (cols.includes('software_icon_url')) { setClauses.push('software_icon_url = ?'); params.push(softwareIconUrl); }

        params.push(existingId);
        await query(`UPDATE restaurant_details SET ${setClauses.join(', ')} WHERE id = ?`, params);
      } else {
        await query(
          `INSERT INTO restaurant_details (company_name, tagline, phone, email, address, tax_rate, currency)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [companyName, tagline, phone, email, address, taxRate, currency]
        );
      }
      settingsRestored = true;
    }

    // 2. Restore Categories
    const categoriesList = fullBackup.categories || [];
    if (Array.isArray(categoriesList)) {
      for (const cat of categoriesList) {
        const catName = cat.name || cat.label || 'Category';
        const catId = Number(cat.id || 1);
        await query(
          `INSERT INTO categories (id, name) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name)`,
          [catId, catName]
        );
        importedCategories++;
      }
    }

    // 3. Restore Menu Items
    const menuList = fullBackup.menuItems || fullBackup.menu_items || [];
    if (Array.isArray(menuList)) {
      for (const item of menuList) {
        const cId = Number(item.categoryId || item.category_id || 1);
        const name = item.name || 'Dish Item';
        const qPrice = Number(item.priceQuarter || item.price_quarter || 0);
        const hPrice = Number(item.priceHalf || item.price_half || 0);
        const fPrice = Number(item.priceFull || item.price_full || 0);
        const avail = item.isAvailable !== undefined ? (item.isAvailable ? 1 : 0) : (item.is_available ?? 1);

        if (item.id) {
          await query(
            `INSERT INTO menu_items (id, category_id, name, price_quarter, price_half, price_full, is_available)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               category_id = VALUES(category_id),
               name = VALUES(name),
               price_quarter = VALUES(price_quarter),
               price_half = VALUES(price_half),
               price_full = VALUES(price_full),
               is_available = VALUES(is_available)`,
            [Number(item.id), cId, name, qPrice, hPrice, fPrice, avail]
          );
        } else {
          await query(
            `INSERT INTO menu_items (category_id, name, price_quarter, price_half, price_full, is_available)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [cId, name, qPrice, hPrice, fPrice, avail]
          );
        }
        importedMenu++;
      }
    }

    // 4. Restore Orders & Itemized Order Items
    const ordersList = fullBackup.orders || [];
    if (Array.isArray(ordersList)) {
      for (const o of ordersList) {
        const orderNum = o.orderNumber || o.order_number || `KMIV-IMP-${Date.now()}`;
        const orderType = o.orderType || o.order_type || 'Dine-In';
        const subtotal = Number(o.subtotal || o.grandTotal || o.total || 0);
        const tax = Number(o.taxAmount || o.tax_amount || 0);
        const disc = Number(o.discountAmount || o.discount_amount || 0);
        const grand = Number(o.grandTotal || o.grand_total || o.total || subtotal);
        const mode = o.paymentMode || o.payment_mode || 'Cash';
        const created = formatDateTimeForDB(o.createdAt || o.created_at || o.orderDate);

        let res;
        if (o.id) {
          res = await query(
            `INSERT INTO orders (id, order_number, order_type, subtotal, tax_amount, discount_amount, grand_total, payment_mode, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Completed', ?)
             ON DUPLICATE KEY UPDATE
               order_number = VALUES(order_number),
               order_type = VALUES(order_type),
               subtotal = VALUES(subtotal),
               tax_amount = VALUES(tax_amount),
               discount_amount = VALUES(discount_amount),
               grand_total = VALUES(grand_total),
               payment_mode = VALUES(payment_mode),
               created_at = VALUES(created_at)`,
            [Number(o.id), orderNum, orderType, subtotal, tax, disc, grand, mode, created]
          );
        } else {
          res = await query(
            `INSERT INTO orders (order_number, order_type, subtotal, tax_amount, discount_amount, grand_total, payment_mode, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed', ?)
             ON DUPLICATE KEY UPDATE
               subtotal = VALUES(subtotal),
               grand_total = VALUES(grand_total),
               payment_mode = VALUES(payment_mode),
               created_at = VALUES(created_at)`,
            [orderNum, orderType, subtotal, tax, disc, grand, mode, created]
          );
        }

        if (res.success) {
          importedOrders++;
          const orderId = o.id ? Number(o.id) : res.insertId;

          const itemsList = o.items || o.orderItems || o.order_items || [];
          if (orderId && Array.isArray(itemsList) && itemsList.length > 0) {
            for (const item of itemsList) {
              const name = item.name || item.itemName || item.item_name || item.dishName || 'Item';
              const qty = Number(item.quantity || item.qty || 1);
              const uPrice = Number(item.unitPrice || item.price || item.unit_price || 0);
              const tPrice = Number(item.totalPrice || item.total_price || (qty * uPrice));
              const variant = item.variant || item.portion || 'Full';
              await query(
                `INSERT INTO order_items (order_id, dish_name, item_name, variant, quantity, unit_price, total_price)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [orderId, name, name, variant, qty, uPrice, tPrice]
              );
            }
          }
        }
      }
    }

    // Direct Order Items List
    const directOrderItems = fullBackup.orderItems || fullBackup.order_items || [];
    if (Array.isArray(directOrderItems) && directOrderItems.length > 0) {
      for (const item of directOrderItems) {
        const oId = Number(item.order_id || item.orderId);
        const name = item.item_name || item.dish_name || item.name || item.itemName || 'Item';
        const qty = Number(item.quantity || 1);
        const uPrice = Number(item.unit_price || item.unitPrice || 0);
        const tPrice = Number(item.total_price || item.totalPrice || (qty * uPrice));
        if (oId) {
          const variant = item.variant || item.portion || 'Full';
          await query(
            `INSERT INTO order_items (order_id, dish_name, item_name, variant, quantity, unit_price, total_price)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [oId, name, name, variant, qty, uPrice, tPrice]
          );
        }
      }
    }

    // 5. Restore Expenses
    const expensesList = fullBackup.expenses || [];
    if (Array.isArray(expensesList)) {
      for (const e of expensesList) {
        const cat = e.category || 'General';
        const desc = e.description || e.title || e.name || 'Imported Expense';
        const amt = Number(e.amount || 0);
        const expDate = formatDateTimeForDB(e.expenseDate || e.expense_date).slice(0, 10);
        const paidTo = e.paidTo || e.paid_to || '';
        const mode = e.paymentMode || e.payment_mode || e.paymentMethod || 'Cash';

        const res = await query(
          `INSERT INTO expenses (category, description, amount, expense_date, paid_to, payment_mode)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [cat, desc, amt, expDate, paidTo, mode]
        );
        if (res.success) importedExpenses++;
      }
    }

    return {
      success: true,
      data: {
        importedOrders,
        importedExpenses,
        importedMenu,
        importedCategories,
        settingsRestored
      },
      message: `Full system migration completed: ${importedOrders} Orders, ${importedMenu} Dishes, ${importedExpenses} Expenses!`
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('db:testConnection', async (evt, customConfig) => {
  try {
    return await testConnection(customConfig || null);
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('db:getConfig', async () => {
  try {
    const cfg = loadConfig();
    return { success: true, data: cfg };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('db:saveConfig', async (evt, config) => {
  try {
    return await saveConfig(config);
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('db:getStorageSize', async () => {
  try {
    return await getStorageSize();
  } catch (err) {
    return { success: false, formatted: '0 KB', error: err.message };
  }
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
        totalTables: Number(r.total_tables || r.totalTables || parsedPrintConfig.totalTables || 10),
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

ipcMain.handle('app:updateWindowIcon', async (evt, dataUrl) => {
  try {
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
        taxRate: Number(r.tax_rate ?? 0),
        currency: r.currency || '₹',
        totalTables: Number(r.total_tables || r.totalTables || parsedPrintConfig.totalTables || 10),
        headerNote: r.header_note || '',
        footerNote: r.footer_note || r.receipt_footer || '',
        logoUrl: r.logo_url || '',
        softwareIconUrl: r.software_icon_url || '',
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
      totalTables: Number(data.totalTables || 10),
      printShowLogo: data.printShowLogo ?? true,
      printShowAddress: data.printShowAddress ?? true,
      printShowPhone: data.printShowPhone ?? true,
      printShowGst: data.printShowGst ?? true,
      printShowHeaderNote: data.printShowHeaderNote ?? true,
      printShowTime: data.printShowTime ?? true,
      printShowTaxBreakdown: data.printShowTaxBreakdown ?? true,
      printShowRoundOff: data.printShowRoundOff ?? true,
      printShowFooterNote: data.printShowFooterNote ?? true,
      printWithToken: data.printWithToken ?? true,
      printer1Name: data.printer1Name || '',
      printer1Target: data.printer1Target || 'both',
      printer2Name: data.printer2Name || '',
      printer2Target: data.printer2Target || (data.printer2Name ? 'token' : 'none')
    };

    if (data.softwareIconUrl && mainWindow) {
      try {
        const img = nativeImage.createFromDataURL(data.softwareIconUrl);
        if (!img.isEmpty()) {
          mainWindow.setIcon(img);
        }
      } catch (err) {
        console.error('Failed to update window icon:', err);
      }
    }

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
        Number(data.taxRate ?? 0.0),
        data.currency || '₹'
      ];

      if (cols.includes('total_tables')) { setClauses.push('total_tables = ?'); params.push(Number(data.totalTables || 10)); }
      if (cols.includes('owner_name')) { setClauses.push('owner_name = ?'); params.push(data.ownerName || ''); }
      if (cols.includes('gst_number')) { setClauses.push('gst_number = ?'); params.push(data.gstNumber || ''); }
      if (cols.includes('gst_no')) { setClauses.push('gst_no = ?'); params.push(data.gstNumber || ''); }
      if (cols.includes('fssai_number')) { setClauses.push('fssai_number = ?'); params.push(data.fssaiNumber || ''); }
      if (cols.includes('fssai_no')) { setClauses.push('fssai_no = ?'); params.push(data.fssaiNumber || ''); }
      if (cols.includes('header_note')) { setClauses.push('header_note = ?'); params.push(data.headerNote || ''); }
      if (cols.includes('footer_note')) { setClauses.push('footer_note = ?'); params.push(data.footerNote || ''); }
      if (cols.includes('receipt_footer')) { setClauses.push('receipt_footer = ?'); params.push(data.footerNote || ''); }
      if (cols.includes('logo_url')) { setClauses.push('logo_url = ?'); params.push(data.logoUrl || ''); }
      if (cols.includes('software_icon_url')) { setClauses.push('software_icon_url = ?'); params.push(data.softwareIconUrl || ''); }
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
        Number(data.taxRate ?? 0.0),
        data.currency || '₹'
      ];

      if (cols.includes('total_tables')) { insertFields.push('total_tables'); placeholders.push('?'); params.push(Number(data.totalTables || 10)); }
      if (cols.includes('owner_name')) { insertFields.push('owner_name'); placeholders.push('?'); params.push(data.ownerName || ''); }
      if (cols.includes('gst_number')) { insertFields.push('gst_number'); placeholders.push('?'); params.push(data.gstNumber || ''); }
      if (cols.includes('gst_no')) { insertFields.push('gst_no'); placeholders.push('?'); params.push(data.gstNumber || ''); }
      if (cols.includes('fssai_number')) { insertFields.push('fssai_number'); placeholders.push('?'); params.push(data.fssaiNumber || ''); }
      if (cols.includes('fssai_no')) { insertFields.push('fssai_no'); placeholders.push('?'); params.push(data.fssaiNumber || ''); }
      if (cols.includes('header_note')) { insertFields.push('header_note'); placeholders.push('?'); params.push(data.headerNote || ''); }
      if (cols.includes('footer_note')) { insertFields.push('footer_note'); placeholders.push('?'); params.push(data.footerNote || ''); }
      if (cols.includes('receipt_footer')) { insertFields.push('receipt_footer'); placeholders.push('?'); params.push(data.footerNote || ''); }
      if (cols.includes('logo_url')) { insertFields.push('logo_url'); placeholders.push('?'); params.push(data.logoUrl || ''); }
      if (cols.includes('software_icon_url')) { insertFields.push('software_icon_url'); placeholders.push('?'); params.push(data.softwareIconUrl || ''); }
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
// PRINT RECEIPT & DUAL PRINTER ROUTING
// ─────────────────────────────────────────────────────────────
const fetchSystemPrintersHandler = async () => {
  try {
    if (mainWindow && mainWindow.webContents) {
      const printers = await mainWindow.webContents.getPrintersAsync();
      return {
        success: true,
        printers: printers.map(p => ({
          name: p.name,
          displayName: p.displayName || p.name,
          isDefault: p.isDefault,
          status: p.status
        }))
      };
    }
    return { success: true, printers: [] };
  } catch (err) {
    console.error('getPrinters error:', err);
    return { success: false, message: err.message, printers: [] };
  }
};

ipcMain.handle('system:getPrinters', fetchSystemPrintersHandler);
ipcMain.handle('printer:getPrinters', fetchSystemPrintersHandler);

// Sequenced Print Queue to prevent race conditions and Windows spooler collisions when printing to dual printers
let printQueue = Promise.resolve();

ipcMain.handle('receipt:print', (evt, receiptHtml, options = {}) => {
  return new Promise((resolve) => {
    printQueue = printQueue
      .then(() => {
        return new Promise(async (jobResolve) => {
          let printWin = null;
          let isHandled = false;

          const finishJob = (result) => {
            if (isHandled) return;
            isHandled = true;
            if (printWin && !printWin.isDestroyed()) {
              try {
                printWin.close();
              } catch (e) {}
            }
            jobResolve(result);
            resolve(result);
          };

          // 4-second timeout safeguard to prevent hanging print queue if printer is unresponsive
          const timeoutTimer = setTimeout(() => {
            console.error('Print job timed out after 4s');
            finishJob({ success: false, message: 'Print job timed out' });
          }, 4000);

          try {
            printWin = new BrowserWindow({
              show: false,
              webPreferences: { nodeIntegration: false, contextIsolation: true }
            });

            let targetDeviceName = (options.printerName || '').trim();
            if (targetDeviceName && printWin.webContents) {
              try {
                const systemPrinters = await printWin.webContents.getPrintersAsync();
                const exactMatch = systemPrinters.find(
                  (p) => p.name.toLowerCase() === targetDeviceName.toLowerCase() || (p.displayName && p.displayName.toLowerCase() === targetDeviceName.toLowerCase())
                );
                if (exactMatch) {
                  targetDeviceName = exactMatch.name;
                } else {
                  const partialMatch = systemPrinters.find(
                    (p) => p.name.toLowerCase().includes(targetDeviceName.toLowerCase()) || targetDeviceName.toLowerCase().includes(p.name.toLowerCase())
                  );
                  if (partialMatch) {
                    targetDeviceName = partialMatch.name;
                  }
                }
              } catch (errPrinters) {
                console.error('Error fetching system printers in queue:', errPrinters);
              }
            }

            printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(receiptHtml)}`);

            printWin.webContents.on('did-finish-load', () => {
              setTimeout(() => {
                if (!printWin || printWin.isDestroyed()) {
                  clearTimeout(timeoutTimer);
                  return finishJob({ success: false, message: 'Print window destroyed before printing' });
                }

                const printOptions = {
                  silent: options.silent !== undefined ? options.silent : true,
                  printBackground: true,
                  margins: { marginType: 'none' }
                };
                if (targetDeviceName) {
                  printOptions.deviceName = targetDeviceName;
                }

                printWin.webContents.print(
                  printOptions,
                  (success, failureReason) => {
                    clearTimeout(timeoutTimer);
                    if (success) {
                      finishJob({ success: true });
                    } else {
                      console.error('Print call failed:', failureReason);
                      finishJob({ success: false, message: failureReason || 'Print operation failed' });
                    }
                  }
                );
              }, 100);
            });


            printWin.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
              clearTimeout(timeoutTimer);
              finishJob({ success: false, message: `Failed to load receipt HTML: ${errorDescription}` });
            });
          } catch (err) {
            clearTimeout(timeoutTimer);
            finishJob({ success: false, message: err.message });
          }
        });
      })
      .catch((err) => {
        console.error('Print queue exception:', err);
        resolve({ success: false, message: err?.message || 'Print queue error' });
      });
  });
});

// ─── Cloud Sync IPC Handlers (Phase 5) ───────────────────────────────────────

ipcMain.handle('cloud:getConfig', async () => {
  try {
    const { getCloudConfig } = require('./db/cloudAdapter');
    return { success: true, data: getCloudConfig() };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('cloud:saveConfig', async (_evt, config) => {
  try {
    const { saveCloudConfig } = require('./db/cloudAdapter');
    const saved = saveCloudConfig(config);
    if (saved) {
      setTimeout(() => triggerImmediateSync(), 2000);
      return { success: true, message: 'Cloud config saved. Syncing now...' };
    }
    return { success: false, message: 'Failed to save cloud config file.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('cloud:testConnection', async (_evt, testConfig) => {
  try {
    const { testCloudConnection } = require('./db/cloudAdapter');
    return await testCloudConnection(testConfig || null);
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('cloud:getSyncStatus', async () => {
  try {
    const status = getSyncStatus();
    await refreshPendingCount();
    return { success: true, data: getSyncStatus() };
  } catch (err) {
    return { success: false, data: null };
  }
});

ipcMain.handle('cloud:triggerSync', async () => {
  try {
    await triggerImmediateSync();
    return { success: true, message: 'Sync triggered.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('cloud:saveSslCert', async (_evt, certContent) => {
  try {
    const certPath = path.join(app.getPath('userData'), 'cloud-ssl-ca.pem');
    fs.writeFileSync(certPath, certContent, 'utf8');
    return { success: true, certPath };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('cloud:getOrders', async (_evt, options) => {
  try {
    const { cloudQuery, getCloudConfig } = require('./db/cloudAdapter');
    if (!getCloudConfig()) return { success: false, message: 'Cloud not configured' };
    const limit = options?.limit || 1000;
    const result = await cloudQuery(
      `SELECT * FROM orders ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    return result;
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('cloud:getExpenses', async (_evt, options) => {
  try {
    const { cloudQuery, getCloudConfig } = require('./db/cloudAdapter');
    if (!getCloudConfig()) return { success: false, message: 'Cloud not configured' };
    const limit = options?.limit || 1000;
    const result = await cloudQuery(
      `SELECT * FROM expenses ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    return result;
  } catch (err) {
    return { success: false, message: err.message };
  }
});



