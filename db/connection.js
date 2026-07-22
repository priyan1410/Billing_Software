let mysql = null;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  console.log('mysql2 module not found, will use Embedded Local Database.');
}

const fs = require('fs');
const path = require('path');
const { localQuery } = require('./localStore');

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
let useLocalFallback = false;

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

// ─── Execute SQL Query (with Automatic Embedded Local DB Fallback) ──────
async function query(sql, params = []) {
  if (useLocalFallback) {
    return localQuery(sql, params);
  }

  try {
    const p = getPool();
    if (!p) {
      useLocalFallback = true;
      return localQuery(sql, params);
    }
    const isDDL = /^\s*(SHOW|ALTER|CREATE|TRUNCATE|DROP)\b/i.test(sql);
    const [rows] = isDDL ? await p.query(sql, params) : await p.execute(sql, params);
    return { success: true, data: rows };
  } catch (err) {
    console.warn('[MySQL Unavailable - Switching to Embedded Local DB]:', err.message);
    useLocalFallback = true;
    return localQuery(sql, params);
  }
}

// ─── Test Connection ──────────────────────────────────────────
async function testConnection(customConfig = null) {
  const startTime = Date.now();
  loadConfig();
  const cfg = customConfig || dbConfig;

  if (mysql) {
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
      useLocalFallback = false;
      const responseTime = Date.now() - startTime;
      return {
        success: true,
        isEmbedded: false,
        engine: 'MySQL',
        responseTime,
        message: dbExists
          ? `✓ Connected to MySQL Database ('${cfg.database}')! Response time: ${responseTime}ms`
          : `✓ Connected to MySQL. Database '${cfg.database}' will be initialized.`,
        dbExists
      };
    } catch (err) {
      if (customConfig) {
        return {
          success: false,
          isEmbedded: false,
          error: err.message,
          message: `❌ MySQL Connection Failed: ${err.message}`
        };
      }
      useLocalFallback = true;
      return {
        success: false,
        isEmbedded: true,
        error: err.message,
        message: `⚠ MySQL Disconnected (${err.message}). Using Embedded Local Database.`
      };
    }
  }

  useLocalFallback = true;
  return {
    success: false,
    isEmbedded: true,
    message: `❌ mysql2 driver not available. Operating in Embedded Local Database mode.`
  };
}

// ─── Save/Load Config helpers ─────────────────────────────────
async function saveConfig(newConfig) {
  Object.assign(dbConfig, newConfig);
  if (pool) {
    try { await pool.end(); } catch (e) {}
    pool = null;
  }
  useLocalFallback = false;
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
