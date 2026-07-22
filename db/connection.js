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
    pool = mysql.createPool({
      host: dbConfig.host,
      port: Number(dbConfig.port),
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 3000,
      multipleStatements: false,
      dateStrings: true
    });
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
    const conn = await mysql.createConnection({
      host: cfg.host,
      port: Number(cfg.port),
      user: cfg.user,
      password: cfg.password,
      connectTimeout: 3000
    });
    const [rows] = await conn.query(`SHOW DATABASES LIKE '${cfg.database}'`);
    const dbExists = rows.length > 0;
    await conn.end();
    const responseTime = Date.now() - startTime;
    return {
      success: true,
      isConnected: true,
      engine: 'MySQL',
      responseTime,
      message: dbExists
        ? `✓ Connected to MySQL Database ('${cfg.database}')! Response time: ${responseTime}ms`
        : `✓ Connected to MySQL Server. Database '${cfg.database}' will be created/initialized.`,
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

module.exports = {
  dbConfig,
  loadConfig,
  saveConfig,
  testConnection,
  query,
  getPool
};

