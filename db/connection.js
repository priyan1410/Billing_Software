let mysql = null;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  console.error('mysql2 module not found:', e.message);
}

const fs = require('fs');
const path = require('path');

let userDataPath = '';
function getConfigPath() {
  if (!userDataPath) {
    try {
      const { app } = require('electron');
      if (app && app.getPath) userDataPath = app.getPath('userData');
    } catch (e) {}
  }
  return userDataPath ? path.join(userDataPath, 'db-config.json') : path.join(__dirname, 'db-config.json');
}

// ─── Live MySQL Configuration ───────────────────────────────
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'Suriy@24',
  database: 'kish_mandhi',
  connectTimeout: 3000
};

function loadConfig() {
  try {
    const cp = getConfigPath();
    if (fs.existsSync(cp)) {
      const parsed = JSON.parse(fs.readFileSync(cp, 'utf8'));
      Object.assign(dbConfig, parsed);
    }
  } catch (e) {
    console.error('Failed to load db-config.json:', e.message);
  }
  return dbConfig;
}

// Load persisted config on start
loadConfig();

// ─── Connection Pool ─────────────────────────────────────────
let pool = null;

function getPool() {
  if (!mysql) return null;
  loadConfig();
  if (!pool) {
    const isRemote = dbConfig.host && dbConfig.host !== 'localhost' && dbConfig.host !== '127.0.0.1';
    const poolConfig = {
      host: dbConfig.host,
      port: Number(dbConfig.port),
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database || 'kish_mandhi',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 8000,
      multipleStatements: false,
      dateStrings: true
    };
    if (isRemote) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }
    pool = mysql.createPool(poolConfig);
  }
  return pool;
}

// ─── Execute SQL Query (Strict MySQL Only) ───────────────────
async function query(sql, params = []) {
  try {
    const p = getPool();
    if (!p) {
      return { success: false, error: 'MySQL driver unavailable or database not configured.' };
    }
    const isDDL = /^\s*(SHOW|ALTER|CREATE|TRUNCATE|DROP)\b/i.test(sql);
    const [rows] = isDDL ? await p.query(sql, params) : await p.execute(sql, params);
    return { success: true, data: rows };
  } catch (err) {
    console.error('[MySQL Query Error]:', err.message);
    return { success: false, error: `MySQL Error: ${err.message}` };
  }
}

async function transaction(work) {
  const p = getPool();
  if (!p) {
    return { success: false, error: 'MySQL driver unavailable or database not configured.' };
  }

  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return { success: true, data: result };
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error('[MySQL Rollback Error]:', rollbackErr.message);
    }
    console.error('[MySQL Transaction Error]:', err.message);
    return { success: false, error: `MySQL Error: ${err.message}` };
  } finally {
    conn.release();
  }
}

// ─── Test Connection ──────────────────────────────────────────
async function testConnection(customConfig = null) {
  const startTime = Date.now();
  loadConfig();
  const cfg = customConfig || dbConfig;

  if (!mysql) {
    return {
      success: false,
      isConnected: false,
      engine: 'MySQL',
      message: '❌ mysql2 driver not available. MySQL connection required.'
    };
  }

  try {
    const isRemote = cfg.host && cfg.host !== 'localhost' && cfg.host !== '127.0.0.1';
    const connOpts = {
      host: cfg.host,
      port: Number(cfg.port),
      user: cfg.user,
      password: cfg.password,
      database: cfg.database || undefined,
      connectTimeout: 8000
    };
    if (isRemote) {
      connOpts.ssl = { rejectUnauthorized: false };
    }
    const conn = await mysql.createConnection(connOpts);
    const targetDb = cfg.database || 'kish_mandhi';
    const [rows] = await conn.query(`SHOW DATABASES LIKE '${targetDb}'`).catch(() => [[]]);
    const dbExists = rows && rows.length > 0;
    await conn.end();
    const responseTime = Date.now() - startTime;
    return {
      success: true,
      isConnected: true,
      engine: 'MySQL',
      responseTime,
      message: dbExists
        ? `✓ Connected to MySQL Database ('${targetDb}')! Response time: ${responseTime}ms`
        : `✓ Connected to MySQL Server. Database '${targetDb}' will be created/initialized.`,
      dbExists
    };
  } catch (err) {
    return {
      success: false,
      isConnected: false,
      engine: 'MySQL',
      error: err.message,
      message: `❌ MySQL Connection Failed: ${err.message}`
    };
  }
}

// ─── Save/Load Config helpers ─────────────────────────────────
async function saveConfig(newConfig) {
  Object.assign(dbConfig, newConfig);
  if (pool) {
    try { await pool.end(); } catch (e) {}
    pool = null;
  }
  try {
    const cp = getConfigPath();
    const dir = path.dirname(cp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cp, JSON.stringify(dbConfig, null, 2));
  } catch (e) {
    console.error('Failed to save db-config.json:', e.message);
  }

  // Test the new config
  const testRes = await testConnection(dbConfig);
  if (testRes.success) {
    const { initializeDatabase } = require('./schema');
    await initializeDatabase();
    return { success: true, message: `✓ Connected & Saved! ${testRes.message}` };
  } else {
    return { success: false, message: testRes.message };
  }
}

// ─── Storage Size Helper ──────────────────────────────────────
async function getStorageSize() {
  try {
    loadConfig();
    const targetDb = dbConfig.database || 'kish_mandhi';

    // 1. Force InnoDB to refresh table statistics on server
    await query(`ANALYZE TABLE categories, menu_items, orders, order_items, expenses, tokens, users, restaurant_details`).catch(() => {});

    let bytes = 0;
    let tableCount = 0;
    let totalRows = 0;

    // 2. Fetch live physical table status directly from engine
    const statusRes = await query(`SHOW TABLE STATUS FROM \`${targetDb}\``).catch(() => null);

    if (statusRes && statusRes.success && Array.isArray(statusRes.data) && statusRes.data.length > 0) {
      tableCount = statusRes.data.length;
      for (const row of statusRes.data) {
        const dataLen = Number(row.Data_length || row.data_length || 0);
        const indexLen = Number(row.Index_length || row.index_length || 0);
        const dataFree = Number(row.Data_free || row.data_free || 0);
        const rows = Number(row.Rows || row.rows || 0);
        bytes += (dataLen + indexLen + dataFree);
        totalRows += rows;
      }
    } else {
      // Fallback to information_schema query
      const res = await query(`
        SELECT 
          SUM(COALESCE(data_length, 0) + COALESCE(index_length, 0) + COALESCE(data_free, 0)) AS bytes,
          COUNT(*) AS table_count,
          SUM(COALESCE(table_rows, 0)) AS total_rows
        FROM information_schema.tables
        WHERE table_schema = ? OR table_schema = DATABASE()
      `, [targetDb]);

      if (res.success && res.data && res.data[0]) {
        bytes = Number(res.data[0].bytes || 0);
        tableCount = Number(res.data[0].table_count || 0);
        totalRows = Number(res.data[0].total_rows || 0);
      }
    }

    // 3. Calculate exact live total record count across all 8 tables for instant feedback
    const contentCheck = await query(`
      SELECT 
        (SELECT COUNT(*) FROM categories) +
        (SELECT COUNT(*) FROM menu_items) +
        (SELECT COUNT(*) FROM orders) +
        (SELECT COUNT(*) FROM order_items) +
        (SELECT COUNT(*) FROM expenses) +
        (SELECT COUNT(*) FROM tokens) +
        (SELECT COUNT(*) FROM users) +
        (SELECT COUNT(*) FROM restaurant_details) AS live_records
    `).catch(() => null);

    let liveRecords = totalRows;
    if (contentCheck && contentCheck.success && contentCheck.data && contentCheck.data[0]) {
      liveRecords = Number(contentCheck.data[0].live_records || 0);
    }

    const isRemote = dbConfig.host && dbConfig.host !== 'localhost' && dbConfig.host !== '127.0.0.1';
    const hostLabel = isRemote ? 'Cloud DB' : 'Local MySQL';

    const sizeKb = bytes / 1024;
    const sizeMb = bytes / (1024 * 1024);
    const sizeGb = bytes / (1024 * 1024 * 1024);

    let rawFormatted = '0 KB';
    if (sizeGb >= 1) {
      rawFormatted = `${sizeGb.toFixed(2)} GB`;
    } else if (sizeMb >= 1) {
      rawFormatted = `${sizeMb.toFixed(2)} MB`;
    } else if (sizeKb > 0) {
      rawFormatted = `${sizeKb.toFixed(1)} KB`;
    } else {
      rawFormatted = '0 KB';
    }

    const formatted = `${rawFormatted} • ${liveRecords} Records`;

    return {
      success: true,
      bytes,
      sizeKb,
      sizeMb,
      sizeGb,
      tableCount,
      liveRecords,
      rawFormatted,
      formatted,
      isRemote,
      hostLabel,
      host: dbConfig.host,
      database: targetDb
    };
  } catch (e) {
    console.error('getStorageSize error:', e.message);
  }

  // Fallback if local store
  try {
    const cp = getConfigPath();
    const localStorePath = path.join(path.dirname(cp), 'local-store.json');
    if (fs.existsSync(localStorePath)) {
      const stats = fs.statSync(localStorePath);
      const sizeKb = (stats.size / 1024).toFixed(1);
      return { success: true, formatted: `${sizeKb} KB (Local File)`, isRemote: false, hostLabel: 'Local File' };
    }
  } catch (err) {}

  return { success: false, formatted: '0 KB', isRemote: false };
}

module.exports = {
  dbConfig,
  loadConfig,
  saveConfig,
  testConnection,
  query,
  transaction,
  getPool,
  getStorageSize
};

