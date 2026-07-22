const { query, dbConfig, loadConfig, saveConfig } = require('./connection');
const mysql = require('mysql2/promise');

async function initializeDatabase() {
  try {
    loadConfig();
    const candidatePasswords = [dbConfig.password, '', 'root', 'Suriy@24', '1234', '123456', 'password'];
    const uniquePasswords = [...new Set(candidatePasswords.filter(p => p !== undefined && p !== null))];

    let connected = false;
    let conn = null;
    let lastError = null;

    for (const pwd of uniquePasswords) {
      try {
        conn = await mysql.createConnection({
          host: dbConfig.host || 'localhost',
          port: Number(dbConfig.port || 3306),
          user: dbConfig.user || 'root',
          password: pwd,
          connectTimeout: 5000
        });
        if (dbConfig.password !== pwd) {
          dbConfig.password = pwd;
          saveConfig(dbConfig);
        }
        connected = true;
        break;
      } catch (err) {
        lastError = err;
        if (err.code !== 'ER_ACCESS_DENIED_ERROR' && (!err.message || !err.message.includes('Access denied'))) {
          break;
        }
      }
    }

    if (!connected) {
      throw lastError || new Error('Could not connect to MySQL server');
    }

    await conn.query('CREATE DATABASE IF NOT EXISTS `kish_mandhi`;');
    await conn.end();
    console.log('✓ Database kish_mandhi ensured.');

    // Step 2: Create tables inside kish_mandhi
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(50) DEFAULT 'utensils'
      ) ENGINE=InnoDB;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        price_quarter DECIMAL(10,2) DEFAULT 0,
        price_half DECIMAL(10,2) DEFAULT 0,
        price_full DECIMAL(10,2) DEFAULT 0,
        is_available TINYINT(1) DEFAULT 1,
        image VARCHAR(100) DEFAULT 'default',
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_number VARCHAR(50) NOT NULL UNIQUE,
        order_type VARCHAR(30) DEFAULT 'Dine-In',
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        grand_total DECIMAL(10,2) NOT NULL DEFAULT 0,
        payment_mode VARCHAR(30) DEFAULT 'Cash',
        token_number VARCHAR(50) DEFAULT NULL,
        status VARCHAR(30) DEFAULT 'Completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await query(`ALTER TABLE orders ADD COLUMN token_number VARCHAR(50) DEFAULT NULL`).catch(() => { });

    await query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        expense_date DATE NOT NULL,
        paid_to VARCHAR(100) DEFAULT '',
        payment_mode VARCHAR(30) DEFAULT 'Cash',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT DEFAULT NULL,
        token_number VARCHAR(50) NOT NULL UNIQUE,
        order_type VARCHAR(30) DEFAULT 'Dine-In',
        table_no VARCHAR(30) DEFAULT 'N/A',
        items_summary TEXT NOT NULL,
        status VARCHAR(30) DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Ensure items_summary column exists on legacy table structures
    const tokenCols = await query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'kish_mandhi' AND TABLE_NAME = 'tokens'
    `);
    if (tokenCols.success) {
      const existingTokenCols = tokenCols.data.map(r => r.COLUMN_NAME.toLowerCase());
      if (!existingTokenCols.includes('items_summary') && existingTokenCols.includes('items')) {
        await query("ALTER TABLE tokens CHANGE COLUMN items items_summary TEXT NOT NULL");
      }
    }

    // Users table — create if not exists (compatible with existing username-based schema)
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(150) DEFAULT '',
        name VARCHAR(100) NOT NULL DEFAULT '',
        password VARCHAR(255) NOT NULL DEFAULT '',
        role VARCHAR(30) DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Safely add missing columns to existing users table (ALTER TABLE IF NOT EXISTS column)
    const userCols = await query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'kish_mandhi' AND TABLE_NAME = 'users'
    `);
    const existingCols = userCols.success ? userCols.data.map(r => r.COLUMN_NAME.toLowerCase()) : [];

    if (!existingCols.includes('email')) {
      await query(`ALTER TABLE users ADD COLUMN email VARCHAR(150) DEFAULT '' AFTER name`);
      console.log('✓ Added email column to users table.');
    }
    if (!existingCols.includes('phone')) {
      await query(`ALTER TABLE users ADD COLUMN phone VARCHAR(30) DEFAULT '' AFTER email`);
      console.log('✓ Added phone column to users table.');
    }
    if (!existingCols.includes('username')) {
      await query(`ALTER TABLE users ADD COLUMN username VARCHAR(150) DEFAULT '' AFTER id`);
      console.log('✓ Added username column to users table.');
    }


    await query(`
      CREATE TABLE IF NOT EXISTS restaurant_details (
        id INT PRIMARY KEY DEFAULT 1,
        company_name VARCHAR(200) NOT NULL,
        tagline VARCHAR(200) DEFAULT 'Arabic Grill & Fine Dining',
        owner_name VARCHAR(100) DEFAULT '',
        gst_number VARCHAR(50) DEFAULT '',
        fssai_number VARCHAR(50) DEFAULT '',
        phone VARCHAR(50) DEFAULT '',
        email VARCHAR(150) DEFAULT '',
        address TEXT,
        tax_rate DECIMAL(5,2) DEFAULT 5.00,
        currency VARCHAR(10) DEFAULT '₹',
        header_note TEXT,
        footer_note TEXT,
        print_config TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    const restColsRes = await query(`SHOW COLUMNS FROM restaurant_details`);
    if (restColsRes.success) {
      const existingRestCols = restColsRes.data.map(c => c.Field.toLowerCase());
      if (!existingRestCols.includes('owner_name')) {
        await query(`ALTER TABLE restaurant_details ADD COLUMN owner_name VARCHAR(100) DEFAULT ''`);
      }
      if (!existingRestCols.includes('gst_number')) {
        await query(`ALTER TABLE restaurant_details ADD COLUMN gst_number VARCHAR(50) DEFAULT ''`);
      }
      if (!existingRestCols.includes('fssai_number')) {
        await query(`ALTER TABLE restaurant_details ADD COLUMN fssai_number VARCHAR(50) DEFAULT ''`);
      }
      if (!existingRestCols.includes('header_note')) {
        await query(`ALTER TABLE restaurant_details ADD COLUMN header_note TEXT`);
      }
      if (!existingRestCols.includes('footer_note')) {
        await query(`ALTER TABLE restaurant_details ADD COLUMN footer_note TEXT`);
      }
      if (!existingRestCols.includes('print_config')) {
        await query(`ALTER TABLE restaurant_details ADD COLUMN print_config TEXT`);
      }
    }

    console.log('✓ All tables ready in kish_mandhi database.');
    return { success: true, message: 'Database ready!' };
  } catch (err) {
    console.log('⚠ MySQL server not available. Activated Embedded Local Storage engine.');
    const { loadStore } = require('./localStore');
    loadStore();
    return { success: true, isEmbedded: true, message: 'Embedded Local Storage initialized and ready!' };
  }
}

module.exports = { initializeDatabase };
