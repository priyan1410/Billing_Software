/**
 * syncEngine.js — Phase 3 + 4: Background Sync Engine + Auto Local Cleanup
 *
 * Phase 3: Every 3 minutes — uploads all unsynced local records to cloud MySQL
 * Phase 4: Every midnight — deletes local records older than 7 days (if synced)
 *
 * Safety rules:
 *  - Never deletes a record that has not been synced (synced = 0)
 *  - Never deletes menu_items or categories locally
 *  - Silently skips if cloud not configured or unreachable
 *  - First run uploads ALL existing records (synced = 0 from the start)
 */

const { query } = require('../db/connection');
const {
  getCloudConfig,
  cloudQuery,
  initializeCloudSchema
} = require('../db/cloudAdapter');

const SYNC_INTERVAL_MS  = 3 * 60 * 1000;  // 3 minutes
const CLEANUP_HOUR      = 0;               // midnight
const LOCAL_RETAIN_DAYS = 7;              // keep 7 days locally

let syncTimer     = null;
let cleanupTimer  = null;
let isSyncing     = false;
let lastSyncTime  = null;
let lastSyncCount = 0;
let pendingCount  = 0;

// Source PC identifier (hostname) for multi-branch tracking
let sourcePcId = '';
try {
  const os = require('os');
  sourcePcId = os.hostname();
} catch (e) {}

// Helper: Parse DD/MM/YYYY, HH:MM:SS AM/PM or standard date strings into MySQL DATETIME ('YYYY-MM-DD HH:mm:ss')
function parseAndFormatMySqlDateTime(dateVal) {
  if (!dateVal) return new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return new Date().toISOString().slice(0, 19).replace('T', ' ');
    const pad = (n) => String(n).padStart(2, '0');
    return `${dateVal.getFullYear()}-${pad(dateVal.getMonth() + 1)}-${pad(dateVal.getDate())} ${pad(dateVal.getHours())}:${pad(dateVal.getMinutes())}:${pad(dateVal.getSeconds())}`;
  }

  const str = String(dateVal).trim();
  // Match DD/MM/YYYY, HH:MM:SS AM/PM
  const ddMmyyyyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?)?/i;
  const match = str.match(ddMmyyyyRegex);

  if (match) {
    let day = parseInt(match[1], 10);
    let month = parseInt(match[2], 10) - 1; // 0-indexed
    let year = parseInt(match[3], 10);
    let hours = match[4] ? parseInt(match[4], 10) : 0;
    let minutes = match[5] ? parseInt(match[5], 10) : 0;
    let seconds = match[6] ? parseInt(match[6], 10) : 0;
    const ampm = match[7] ? match[7].toUpperCase() : null;

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const d = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(d.getTime())) {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
  } catch (e) {}

  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function parseAndFormatMySqlDate(dateVal) {
  const full = parseAndFormatMySqlDateTime(dateVal);
  return full.slice(0, 10);
}

async function refreshPendingCount() {
  try {
    const [ordersRes, expRes] = await Promise.all([
      query('SELECT COUNT(*) AS cnt FROM orders WHERE synced = 0 OR synced IS NULL'),
      query('SELECT COUNT(*) AS cnt FROM expenses WHERE synced = 0 OR synced IS NULL')
    ]);
    const oCnt = (ordersRes.success && ordersRes.data[0]) ? Number(ordersRes.data[0].cnt) : 0;
    const eCnt = (expRes.success && expRes.data[0]) ? Number(expRes.data[0].cnt) : 0;
    pendingCount = oCnt + eCnt;
  } catch (e) {}
  return pendingCount;
}

function getSyncStatus() {
  return {
    lastSyncTime,
    lastSyncCount,
    pendingCount,
    isSyncing,
    isCloudConfigured: !!getCloudConfig()
  };
}

// ─── Core Sync Function ───────────────────────────────────────────────────────

async function runSync() {
  if (isSyncing) return;
  const cfg = getCloudConfig();
  if (!cfg) {
    await refreshPendingCount();
    return;
  }

  isSyncing = true;
  let totalUploaded = 0;

  try {
    // Ensure cloud schema exists
    await initializeCloudSchema();

    // ── Sync Categories ──────────────────────────────────────────────────────
    const catsRes = await query('SELECT * FROM categories WHERE synced = 0 OR synced IS NULL');
    if (catsRes.success && catsRes.data && catsRes.data.length > 0) {
      for (const cat of catsRes.data) {
        const r = await cloudQuery(
          `INSERT INTO categories (id, name, icon, synced_from_local) VALUES (?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE name = ?, icon = ?`,
          [cat.id, cat.name, cat.icon || 'utensils', cat.name, cat.icon || 'utensils']
        );
        if (r.success) {
          await query('UPDATE categories SET synced = 1 WHERE id = ?', [cat.id]);
          totalUploaded++;
        } else {
          console.error('[SyncEngine] Category insert error:', r.error);
        }
      }
    }

    // ── Sync Menu Items ──────────────────────────────────────────────────────
    const itemsRes = await query('SELECT * FROM menu_items WHERE synced = 0 OR synced IS NULL');
    if (itemsRes.success && itemsRes.data && itemsRes.data.length > 0) {
      for (const item of itemsRes.data) {
        const r = await cloudQuery(
          `INSERT INTO menu_items (id, category_id, name, price_quarter, price_half, price_full, is_available, combo_items, synced_from_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE
             name = ?, price_quarter = ?, price_half = ?, price_full = ?, is_available = ?, combo_items = ?`,
          [
            item.id, item.category_id, item.name, item.price_quarter, item.price_half, item.price_full, item.is_available, item.combo_items || null,
            item.name, item.price_quarter, item.price_half, item.price_full, item.is_available, item.combo_items || null
          ]
        );
        if (r.success) {
          await query('UPDATE menu_items SET synced = 1 WHERE id = ?', [item.id]);
          totalUploaded++;
        } else {
          console.error('[SyncEngine] Menu item insert error:', r.error);
        }
      }
    }

    // ── Sync Orders ──────────────────────────────────────────────────────────
    const ordersRes = await query('SELECT * FROM orders WHERE synced = 0 OR synced IS NULL ORDER BY created_at ASC LIMIT 500');
    if (ordersRes.success && ordersRes.data && ordersRes.data.length > 0) {
      for (const order of ordersRes.data) {
        const formattedCreatedAt = parseAndFormatMySqlDateTime(order.created_at);
        const r = await cloudQuery(
          `INSERT INTO orders (id, order_number, order_type, subtotal, tax_amount, discount_amount,
            grand_total, payment_mode, token_number, table_number, status, created_at, synced_from_local, source_pc_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
           ON DUPLICATE KEY UPDATE
             grand_total = ?, payment_mode = ?, status = ?`,
          [
            order.id, order.order_number, order.order_type,
            order.subtotal, order.tax_amount, order.discount_amount,
            order.grand_total, order.payment_mode,
            order.token_number || null, order.table_number || null,
            order.status || 'Completed', formattedCreatedAt, sourcePcId,
            order.grand_total, order.payment_mode, order.status || 'Completed'
          ]
        );
        if (r.success) {
          // Also sync order_items for this order
          const itemsR = await query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
          if (itemsR.success && itemsR.data) {
            for (const oi of itemsR.data) {
              await cloudQuery(
                `INSERT INTO order_items (id, order_id, dish_name, variant, quantity, unit_price, total_price)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE quantity = ?, total_price = ?`,
                [oi.id, oi.order_id, oi.dish_name || oi.item_name || '', oi.variant || 'Full', oi.quantity, oi.unit_price, oi.total_price, oi.quantity, oi.total_price]
              );
            }
          }
          await query('UPDATE orders SET synced = 1 WHERE id = ?', [order.id]);
          totalUploaded++;
        } else {
          console.error('[SyncEngine] Order insert error:', r.error);
        }
      }
    }

    // ── Sync Expenses ────────────────────────────────────────────────────────
    const expRes = await query('SELECT * FROM expenses WHERE synced = 0 OR synced IS NULL ORDER BY created_at ASC LIMIT 500');
    if (expRes.success && expRes.data && expRes.data.length > 0) {
      for (const exp of expRes.data) {
        const formattedExpDate = parseAndFormatMySqlDate(exp.expense_date);
        const formattedCreatedAt = parseAndFormatMySqlDateTime(exp.created_at);
        const r = await cloudQuery(
          `INSERT INTO expenses (id, category, description, amount, expense_date, paid_to, payment_mode, created_at, synced_from_local, source_pc_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
           ON DUPLICATE KEY UPDATE amount = ?, description = ?`,
          [
            exp.id, exp.category, exp.description, exp.amount,
            formattedExpDate, exp.paid_to || '', exp.payment_mode || 'Cash',
            formattedCreatedAt, sourcePcId,
            exp.amount, exp.description
          ]
        );
        if (r.success) {
          await query('UPDATE expenses SET synced = 1 WHERE id = ?', [exp.id]);
          totalUploaded++;
        } else {
          console.error('[SyncEngine] Expense insert error:', r.error);
        }
      }
    }

    lastSyncTime  = new Date().toISOString();
    lastSyncCount = totalUploaded;
    console.log(`[SyncEngine] ✓ Sync cycle completed. Uploaded ${totalUploaded} new records.`);

  } catch (err) {
    console.error('[SyncEngine] Sync error:', err.message);
  } finally {
    isSyncing = false;
    await refreshPendingCount();
  }
}

// ─── Auto Local Cleanup (Phase 4) ────────────────────────────────────────────
// Deletes records older than LOCAL_RETAIN_DAYS WHERE synced = 1
// Runs every midnight. NEVER deletes categories or menu_items.

async function runLocalCleanup() {
  const cfg = getCloudConfig();
  if (!cfg) return; // Only clean up if cloud is configured and sync is active

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - LOCAL_RETAIN_DAYS);
    const cutoff = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');

    // Delete old orders (and cascade deletes order_items via FK)
    const delOrders = await query(
      `DELETE FROM orders WHERE synced = 1 AND created_at < ? LIMIT 1000`,
      [cutoff]
    );

    // Delete old expenses
    const delExpenses = await query(
      `DELETE FROM expenses WHERE synced = 1 AND created_at < ? LIMIT 1000`,
      [cutoff]
    );

    const deletedOrders   = delOrders.success   ? (delOrders.data?.affectedRows   || 0) : 0;
    const deletedExpenses = delExpenses.success ? (delExpenses.data?.affectedRows || 0) : 0;

    if (deletedOrders + deletedExpenses > 0) {
      console.log(`[SyncEngine] Midnight cleanup: removed ${deletedOrders} old orders, ${deletedExpenses} old expenses from local DB.`);
    }
  } catch (err) {
    console.error('[SyncEngine] Cleanup error:', err.message);
  }
}

// ─── Schedule midnight cleanup ────────────────────────────────────────────────

function scheduleMidnightCleanup() {
  const now  = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + (now.getHours() >= CLEANUP_HOUR ? 1 : 0));
  next.setHours(CLEANUP_HOUR, 0, 0, 0);
  const msUntilMidnight = next.getTime() - now.getTime();

  setTimeout(() => {
    runLocalCleanup();
    // Then repeat every 24 hours
    cleanupTimer = setInterval(runLocalCleanup, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────

function startSyncEngine() {
  if (syncTimer) return; // Already running

  console.log('[SyncEngine] Starting background sync engine...');

  // Run immediately on startup (uploads any pending from before)
  setTimeout(() => runSync(), 5000);

  // Then every 3 minutes
  syncTimer = setInterval(runSync, SYNC_INTERVAL_MS);

  // Schedule midnight cleanup
  scheduleMidnightCleanup();

  console.log(`[SyncEngine] Sync every ${SYNC_INTERVAL_MS / 60000} min. Local cleanup every midnight (retain ${LOCAL_RETAIN_DAYS} days).`);
}

function stopSyncEngine() {
  if (syncTimer)  { clearInterval(syncTimer);  syncTimer  = null; }
  if (cleanupTimer) { clearInterval(cleanupTimer); cleanupTimer = null; }
  console.log('[SyncEngine] Stopped.');
}

// Trigger an immediate sync (called after saving cloud config or clicking Sync Now)
async function triggerImmediateSync() {
  try {
    await query('UPDATE categories SET synced = 0 WHERE synced IS NULL');
    await query('UPDATE menu_items SET synced = 0 WHERE synced IS NULL');
    await query('UPDATE orders SET synced = 0 WHERE synced IS NULL');
    await query('UPDATE expenses SET synced = 0 WHERE synced IS NULL');
  } catch (e) {}
  return runSync();
}

module.exports = {
  startSyncEngine,
  stopSyncEngine,
  triggerImmediateSync,
  getSyncStatus,
  refreshPendingCount,
  runLocalCleanup
};
