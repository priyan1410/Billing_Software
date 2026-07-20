const { query, testConnection, dbConfig } = require('./connection');
let mysql = null;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  // Gracefully fallback
}

async function initializeDatabase() {
  if (!mysql) return { success: false, message: 'mysql2 module not present' };

  try {
    // 1. Connect to MySQL server root to ensure database kish_mandhi exists
    const conn = await mysql.createConnection({
      host: dbConfig.host || 'localhost',
      port: Number(dbConfig.port || 3306),
      user: dbConfig.user || 'root',
      password: 'Suriy@24'
    });
    
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database || 'kish_mandhi'}\`;`);
    await conn.end();

    // 2. Create tables
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
        name VARCHAR(150) NOT NULL,
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
        token_number INT NOT NULL,
        order_type VARCHAR(30) DEFAULT 'Dine-In',
        table_no VARCHAR(20) DEFAULT 'N/A',
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        grand_total DECIMAL(10,2) NOT NULL,
        payment_mode VARCHAR(30) DEFAULT 'Cash',
        status VARCHAR(30) DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        item_name VARCHAR(150) NOT NULL,
        variant VARCHAR(30) DEFAULT 'Full',
        unit_price DECIMAL(10,2) NOT NULL,
        quantity INT NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        token_number INT NOT NULL,
        order_type VARCHAR(30) DEFAULT 'Dine-In',
        table_no VARCHAR(20) DEFAULT 'N/A',
        items_summary TEXT,
        status VARCHAR(30) DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        expense_date DATE NOT NULL,
        paid_to VARCHAR(100) DEFAULT '',
        payment_mode VARCHAR(30) DEFAULT 'Cash',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 3. Seed default categories if table is empty
    const checkCat = await query('SELECT COUNT(*) as cnt FROM categories');
    if (checkCat.success && checkCat.data[0].cnt === 0) {
      await query(`
        INSERT INTO categories (id, name, icon) VALUES
        (1, 'Mandhi Special', 'utensils'),
        (2, 'Alfaham & Grill', 'fire'),
        (3, 'Starters & Sides', 'drumstick-bite'),
        (4, 'Beverages', 'glass-martini-alt'),
        (5, 'Desserts', 'ice-cream');
      `);

      await query(`
        INSERT INTO menu_items (category_id, name, price_quarter, price_half, price_full, is_available, image) VALUES
        (1, 'Special Chicken Mandhi', 220, 420, 790, 1, 'chicken_mandhi'),
        (1, 'Mutton Raan Mandhi', 350, 680, 1290, 1, 'mutton_mandhi'),
        (1, 'Beef Ribs Mandhi', 280, 520, 980, 1, 'beef_mandhi'),
        (2, 'Peri Peri Alfaham', 160, 310, 590, 1, 'peri_peri'),
        (2, 'Honey Chili Alfaham', 170, 330, 620, 1, 'honey_alfaham'),
        (3, 'Kubboos (2 Pcs)', 30, 30, 30, 1, 'kubboos'),
        (3, 'Special Garlic Sauce / Mayonnaise', 40, 40, 40, 1, 'garlic'),
        (4, 'Fresh Mint Lime Mojito', 70, 70, 70, 1, 'mojito'),
        (4, 'Avocado Milkshake', 110, 110, 110, 1, 'shake'),
        (5, 'Turkish Kunafa with Ice Cream', 180, 180, 180, 1, 'kunafa');
      `);
    }

    return { success: true, message: 'Database schema initialized and sample data ready!' };
  } catch (err) {
    console.error('Migration error:', err.message);
    return { success: false, message: `Migration error: ${err.message}` };
  }
}

module.exports = { initializeDatabase };
