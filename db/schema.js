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

    const isRemote = dbConfig.host && dbConfig.host !== 'localhost' && dbConfig.host !== '127.0.0.1';

    for (const pwd of uniquePasswords) {
      try {
        const connOpts = {
          host: dbConfig.host || 'localhost',
          port: Number(dbConfig.port || 3306),
          user: dbConfig.user || 'root',
          password: pwd,
          connectTimeout: 8000
        };
        if (isRemote) {
          connOpts.ssl = { rejectUnauthorized: false };
        }
        conn = await mysql.createConnection(connOpts);
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

    const targetDb = dbConfig.database || 'kish_mandhi';
    try {
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${targetDb}\`;`);
      console.log(`✓ Database '${targetDb}' ensured.`);
    } catch (e) {
      console.log(`Note: Database '${targetDb}' creation check: ${e.message}`);
    }
    try {
      await conn.query(`USE \`${targetDb}\`;`);
    } catch (e) {}
    await conn.end();

    // Step 2: Create tables inside kish_mandhi
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(50) DEFAULT 'utensils'
      ) ENGINE=InnoDB;
    `);

    // Seed default categories if table is empty
    const catCheck = await query('SELECT COUNT(*) AS cnt FROM categories');
    if (catCheck.success && catCheck.data[0] && Number(catCheck.data[0].cnt) === 0) {
      await query("INSERT INTO categories (id, name, icon) VALUES (1, 'Mandhi Special', 'utensils'), (2, 'Barbeque & Grills', 'flame'), (3, 'Starters & Sides', 'drumstick'), (4, 'Beverages & Juices', 'cup-soda'), (5, 'Desserts', 'ice-cream'), (6, 'Combo Offers', 'gift')");
      console.log('✓ Default categories seeded into MySQL.');
    }

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
        combo_items TEXT DEFAULT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    await query(`ALTER TABLE menu_items ADD COLUMN combo_items TEXT DEFAULT NULL`).catch(() => { });

    // Seed default menu items if table is empty
    const itemCheck = await query('SELECT COUNT(*) AS cnt FROM menu_items');
    if (itemCheck.success && itemCheck.data[0] && Number(itemCheck.data[0].cnt) === 0) {
      await query(`INSERT INTO menu_items (category_id, name, price_quarter, price_half, price_full, is_available) VALUES 
        (1, 'Chicken Mandhi (சிக்கன் மந்தி)', 180, 340, 650, 1),
        (1, 'Mutton Mandhi (ஆட்டு இறைச்சி மந்தி)', 260, 500, 980, 1),
        (2, 'Alfaham Chicken (அல்ஃபாஹாம் சிக்கன்)', 150, 280, 540, 1),
        (2, 'Pepper BBQ Chicken', 160, 300, 580, 1),
        (4, 'Fresh Mint Lime', 0, 0, 50, 1),
        (5, 'Kunafa Special', 0, 0, 180, 1),
        (6, 'Family Mandhi Combo (Full Mandhi + Alfaham + Mojito)', 0, 0, 999, 1),
        (6, 'Couple Combo (Half Mandhi + 2 Mint Lime)', 0, 0, 499, 1)`);
      console.log('✓ Default menu items seeded into MySQL.');
    }


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
    await query(`ALTER TABLE orders ADD COLUMN table_number VARCHAR(50) DEFAULT NULL`).catch(() => { });
    await query(`ALTER TABLE orders ADD COLUMN cash_amount DECIMAL(10,2) DEFAULT 0`).catch(() => { });
    await query(`ALTER TABLE orders ADD COLUMN upi_amount DECIMAL(10,2) DEFAULT 0`).catch(() => { });
    await query(`ALTER TABLE orders ADD COLUMN delivery_address TEXT DEFAULT NULL`).catch(() => { });
    // Phase 1 — Hybrid Sync: track upload status to cloud MySQL
    await query(`ALTER TABLE orders ADD COLUMN synced TINYINT(1) DEFAULT 0`).catch(() => { });
    await query(`ALTER TABLE expenses ADD COLUMN synced TINYINT(1) DEFAULT 0`).catch(() => { });
    await query(`ALTER TABLE menu_items ADD COLUMN synced TINYINT(1) DEFAULT 0`).catch(() => { });
    await query(`ALTER TABLE categories ADD COLUMN synced TINYINT(1) DEFAULT 0`).catch(() => { });


    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        dish_name VARCHAR(200) NOT NULL,
        variant VARCHAR(50) DEFAULT 'Full',
        quantity INT NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Ensure item_name column exists for backwards compatibility
    const orderItemsCols = await query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items'
    `);
    if (orderItemsCols.success) {
      const existingOICols = orderItemsCols.data.map(r => r.COLUMN_NAME.toLowerCase());
      if (!existingOICols.includes('item_name')) {
        await query("ALTER TABLE order_items ADD COLUMN item_name VARCHAR(200) DEFAULT '' AFTER order_id").catch(() => {});
      }
      if (!existingOICols.includes('dish_name')) {
        await query("ALTER TABLE order_items ADD COLUMN dish_name VARCHAR(200) DEFAULT '' AFTER order_id").catch(() => {});
      }
    }


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
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tokens'
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
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
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
        total_tables INT DEFAULT 10,
        header_note TEXT,
        footer_note TEXT,
        logo_url LONGTEXT,
        software_icon_url LONGTEXT,
        print_config TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    const restColsRes = await query(`SHOW COLUMNS FROM restaurant_details`);
    if (restColsRes.success) {
      const existingRestCols = restColsRes.data.map(c => c.Field.toLowerCase());
      if (!existingRestCols.includes('total_tables')) {
        await query(`ALTER TABLE restaurant_details ADD COLUMN total_tables INT DEFAULT 10`);
      }
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
      if (!existingRestCols.includes('logo_url')) {
        await query(`ALTER TABLE restaurant_details ADD COLUMN logo_url LONGTEXT`);
      }
      if (!existingRestCols.includes('software_icon_url')) {
        await query(`ALTER TABLE restaurant_details ADD COLUMN software_icon_url LONGTEXT`);
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
