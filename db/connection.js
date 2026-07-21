let mysql = null;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  console.error('mysql2 module not found. Run: npm install');
}

const fs = require('fs');
const path = require('path');

// ─── Live MySQL Configuration ───────────────────────────────
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'Suriy@24',
  database: 'kish_mandhi',
  connectTimeout: 10000
};

// ─── Connection Pool ─────────────────────────────────────────
let pool = null;

function getPool() {
  if (!mysql) throw new Error('mysql2 not loaded');
  if (!pool) {
    pool = mysql.createPool({
      host: dbConfig.host,
      port: Number(dbConfig.port),
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
      multipleStatements: false,
      dateStrings: true
    });
    console.log('✓ MySQL connection pool created for database: ' + dbConfig.database);
  }
  return pool;
}

// ─── Execute SQL Query ────────────────────────────────────────
async function query(sql, params = []) {
  try {
    const p = getPool();
    const isDDL = /^\s*(SHOW|ALTER|CREATE|TRUNCATE|DROP)\b/i.test(sql);
    const [rows] = isDDL ? await p.query(sql, params) : await p.execute(sql, params);
    return { success: true, data: rows };
  } catch (err) {
    console.error('[DB ERROR]', err.message, '| SQL:', sql.substring(0, 80));
    return { success: false, error: err.message, data: [] };
  }
}

// ─── Test Connection ──────────────────────────────────────────
async function testConnection(customConfig = null) {
  if (!mysql) return { success: false, message: 'mysql2 module not installed. Run: npm install' };
  const cfg = customConfig || dbConfig;
  try {
    const conn = await mysql.createConnection({
      host: cfg.host,
      port: Number(cfg.port),
      user: cfg.user,
      password: cfg.password,
      connectTimeout: 5000
    });
    const [rows] = await conn.query(`SHOW DATABASES LIKE '${cfg.database}'`);
    const dbExists = rows.length > 0;
    await conn.end();
    return {
      success: true,
      message: dbExists
        ? `✓ Connected to MySQL! Database '${cfg.database}' is ready.`
        : `✓ Connected to MySQL. Database '${cfg.database}' will be created.`,
      dbExists
    };
  } catch (err) {
    return {
      success: false,
      message: `Connection failed: ${err.message}`,
      error: err.message
    };
  }
}

// ─── Save/Load Config helpers (kept for DB Settings UI) ──────
function loadConfig() {
  return dbConfig;
}

function saveConfig(newConfig) {
  Object.assign(dbConfig, newConfig);
  if (pool) {
    pool.end().catch(() => {});
    pool = null;
  }
  return { success: true, message: 'Config updated.' };
}

module.exports = {
  dbConfig,
  loadConfig,
  saveConfig,
  testConnection,
  query,
  getPool
};
