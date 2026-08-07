/**
 * cloudAdapter.js — Phase 2: Cloud MySQL Adapter
 *
 * Works with ANY cloud MySQL provider:
 * Aiven, AWS RDS, DigitalOcean, Railway, Hostinger, your own VPS, etc.
 *
 * The user configures host/port/user/password in Settings → Cloud Sync.
 * If not configured, all functions return { success: false } silently.
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// ─── Cloud Config Store ───────────────────────────────────────────────────────

let cloudConfig = null;  // null = not configured
let cloudPool = null;

function getCloudConfigPath() {
  try {
    const { app } = require('electron');
    if (app && app.getPath) {
      return path.join(app.getPath('userData'), 'cloud-config.json');
    }
  } catch (e) {}
  return path.join(__dirname, 'cloud-config.json');
}

function loadCloudConfig() {
  try {
    const cp = getCloudConfigPath();
    if (fs.existsSync(cp)) {
      const parsed = JSON.parse(fs.readFileSync(cp, 'utf8'));
      if (parsed && parsed.host && parsed.user) {
        cloudConfig = parsed;
        return cloudConfig;
      }
    }
  } catch (e) {
    console.error('[CloudAdapter] Failed to load cloud config:', e.message);
  }
  cloudConfig = null;
  return null;
}

function saveCloudConfig(config) {
  try {
    const cp = getCloudConfigPath();
    const dir = path.dirname(cp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cp, JSON.stringify(config, null, 2));
    cloudConfig = config;
    // Reset pool so next query uses new config
    if (cloudPool) {
      cloudPool.end().catch(() => {});
      cloudPool = null;
    }
    return true;
  } catch (e) {
    console.error('[CloudAdapter] Failed to save cloud config:', e.message);
    return false;
  }
}

function getCloudConfig() {
  if (!cloudConfig) loadCloudConfig();
  return cloudConfig;
}

// ─── Connection Pool ──────────────────────────────────────────────────────────

function getCloudPool() {
  const cfg = getCloudConfig();
  if (!cfg) return null;

  if (!cloudPool) {
    const poolOpts = {
      host: cfg.host,
      port: Number(cfg.port || 3306),
      user: cfg.user,
      password: cfg.password || '',
      database: cfg.database || 'kish_mandhi',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      connectTimeout: 10000,
      dateStrings: true
    };

    // SSL — optional, only if configured
    if (cfg.useSSL !== false) {
      if (cfg.sslCertPath && fs.existsSync(cfg.sslCertPath)) {
        poolOpts.ssl = { ca: fs.readFileSync(cfg.sslCertPath) };
      } else if (cfg.useSSL === true) {
        // SSL requested but no cert file — use reject-unauthorized false (common for cloud providers)
        poolOpts.ssl = { rejectUnauthorized: false };
      }
    }

    try {
      cloudPool = mysql.createPool(poolOpts);
    } catch (e) {
      console.error('[CloudAdapter] Failed to create cloud pool:', e.message);
      cloudPool = null;
    }
  }
  return cloudPool;
}

// ─── Cloud Query ──────────────────────────────────────────────────────────────

async function cloudQuery(sql, params = []) {
  try {
    const pool = getCloudPool();
    if (!pool) return { success: false, error: 'Cloud MySQL not configured' };
    const [rows] = await pool.query(sql, params);
    return { success: true, data: rows };
  } catch (err) {
    console.error('[CloudAdapter] Query error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Test Cloud Connection ────────────────────────────────────────────────────

async function testCloudConnection(testConfig = null) {
  const cfg = testConfig || getCloudConfig();
  if (!cfg || !cfg.host || !cfg.user) {
    return { success: false, message: 'Cloud database not configured. Enter credentials to connect.' };
  }

  const startTime = Date.now();
  let conn = null;
  try {
    const connOpts = {
      host: cfg.host,
      port: Number(cfg.port || 3306),
      user: cfg.user,
      password: cfg.password || '',
      database: cfg.database || undefined,
      connectTimeout: 10000
    };

    if (cfg.useSSL !== false) {
      if (cfg.sslCertPath && fs.existsSync(cfg.sslCertPath)) {
        connOpts.ssl = { ca: fs.readFileSync(cfg.sslCertPath) };
      } else {
        connOpts.ssl = { rejectUnauthorized: false };
      }
    }

    conn = await mysql.createConnection(connOpts);
    const responseTime = Date.now() - startTime;
    await conn.end();
    return {
      success: true,
      isConnected: true,
      responseTime,
      message: `✓ Cloud MySQL connected! (${cfg.host}) — Response: ${responseTime}ms`
    };
  } catch (err) {
    if (conn) try { await conn.end(); } catch (e) {}
    return {
      success: false,
      isConnected: false,
      message: `❌ Cloud Connection Failed: ${err.message}`
    };
  }
}

// ─── Initialize Cloud Schema ──────────────────────────────────────────────────
// Creates mirrored tables on cloud if they don't exist yet.

async function initializeCloudSchema() {
  const cfg = getCloudConfig();
  if (!cfg) return { success: false, message: 'Cloud not configured' };

  const targetDb = cfg.database || 'defaultdb';

  // Step 1: Ensure target database exists via a raw server connection (without database param)
  let rawConn = null;
  try {
    const connOpts = {
      host: cfg.host,
      port: Number(cfg.port || 3306),
      user: cfg.user,
      password: cfg.password || '',
      connectTimeout: 10000
    };
    if (cfg.useSSL !== false) {
      if (cfg.sslCertPath && fs.existsSync(cfg.sslCertPath)) {
        connOpts.ssl = { ca: fs.readFileSync(cfg.sslCertPath) };
      } else {
        connOpts.ssl = { rejectUnauthorized: false };
      }
    }
    rawConn = await mysql.createConnection(connOpts);
    await rawConn.query(`CREATE DATABASE IF NOT EXISTS \`${targetDb}\``);
    await rawConn.end();
  } catch (err) {
    if (rawConn) try { await rawConn.end(); } catch (e) {}
    console.error('[CloudAdapter] DB creation query notice:', err.message);
  }

  try {
    // Categories
    await cloudQuery(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(50) DEFAULT 'utensils',
        synced_from_local TINYINT(1) DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    // Menu Items
    await cloudQuery(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INT PRIMARY KEY,
        category_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        price_quarter DECIMAL(10,2) DEFAULT 0,
        price_half DECIMAL(10,2) DEFAULT 0,
        price_full DECIMAL(10,2) DEFAULT 0,
        is_available TINYINT(1) DEFAULT 1,
        combo_items TEXT DEFAULT NULL,
        synced_from_local TINYINT(1) DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    // Orders
    await cloudQuery(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT PRIMARY KEY,
        order_number VARCHAR(50) NOT NULL,
        order_type VARCHAR(30) DEFAULT 'Dine-In',
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        grand_total DECIMAL(10,2) NOT NULL DEFAULT 0,
        payment_mode VARCHAR(30) DEFAULT 'Cash',
        token_number VARCHAR(50) DEFAULT NULL,
        table_number VARCHAR(50) DEFAULT NULL,
        status VARCHAR(30) DEFAULT 'Completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_from_local TINYINT(1) DEFAULT 1,
        source_pc_id VARCHAR(100) DEFAULT NULL
      ) ENGINE=InnoDB
    `);

    // Order Items
    await cloudQuery(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT PRIMARY KEY,
        order_id INT NOT NULL,
        dish_name VARCHAR(200) NOT NULL DEFAULT '',
        variant VARCHAR(50) DEFAULT 'Full',
        quantity INT NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_price DECIMAL(10,2) NOT NULL DEFAULT 0
      ) ENGINE=InnoDB
    `);

    // Expenses
    await cloudQuery(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        expense_date DATE NOT NULL,
        paid_to VARCHAR(100) DEFAULT '',
        payment_mode VARCHAR(30) DEFAULT 'Cash',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_from_local TINYINT(1) DEFAULT 1,
        source_pc_id VARCHAR(100) DEFAULT NULL
      ) ENGINE=InnoDB
    `);

    // Ensure legacy cloud tables get newly added columns
    await cloudQuery(`ALTER TABLE categories ADD COLUMN synced_from_local TINYINT(1) DEFAULT 1`).catch(() => {});
    await cloudQuery(`ALTER TABLE menu_items ADD COLUMN combo_items TEXT DEFAULT NULL`).catch(() => {});
    await cloudQuery(`ALTER TABLE menu_items ADD COLUMN synced_from_local TINYINT(1) DEFAULT 1`).catch(() => {});
    await cloudQuery(`ALTER TABLE orders ADD COLUMN token_number VARCHAR(50) DEFAULT NULL`).catch(() => {});
    await cloudQuery(`ALTER TABLE orders ADD COLUMN table_number VARCHAR(50) DEFAULT NULL`).catch(() => {});
    await cloudQuery(`ALTER TABLE orders ADD COLUMN synced_from_local TINYINT(1) DEFAULT 1`).catch(() => {});
    await cloudQuery(`ALTER TABLE orders ADD COLUMN source_pc_id VARCHAR(100) DEFAULT NULL`).catch(() => {});
    await cloudQuery(`ALTER TABLE expenses ADD COLUMN paid_to VARCHAR(100) DEFAULT ''`).catch(() => {});
    await cloudQuery(`ALTER TABLE expenses ADD COLUMN payment_mode VARCHAR(30) DEFAULT 'Cash'`).catch(() => {});
    await cloudQuery(`ALTER TABLE expenses ADD COLUMN synced_from_local TINYINT(1) DEFAULT 1`).catch(() => {});
    await cloudQuery(`ALTER TABLE expenses ADD COLUMN source_pc_id VARCHAR(100) DEFAULT NULL`).catch(() => {});

    console.log('[CloudAdapter] ✓ Cloud schema initialized & migrated.');
    return { success: true, message: 'Cloud schema ready.' };
  } catch (err) {
    console.error('[CloudAdapter] Schema init error:', err.message);
    return { success: false, message: err.message };
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  loadCloudConfig,
  saveCloudConfig,
  getCloudConfig,
  cloudQuery,
  testCloudConnection,
  initializeCloudSchema,
  getCloudConfigPath
};
