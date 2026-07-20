const { query, dbConfig } = require('./connection');
const mysql = require('mysql2/promise');

async function initializeDatabase() {
  try {
    // Step 1: Connect WITHOUT selecting any database, to CREATE it if not exists
    const conn = await mysql.createConnection({
      host: dbConfig.host || 'localhost',
      port: Number(dbConfig.port || 3306),
      user: dbConfig.user || 'root',
      password: dbConfig.password || 'Suriy@24'
    });
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
        token_number INT NOT NULL,
        order_type VARCHAR(30) DEFAULT 'Dine-In',
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        grand_total DECIMAL(10,2) NOT NULL DEFAULT 0,
        payment_mode VARCHAR(30) DEFAULT 'Cash',
        status VARCHAR(30) DEFAULT 'Completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        item_name VARCHAR(200) NOT NULL,
        variant VARCHAR(30) DEFAULT 'Full',
        unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        quantity INT NOT NULL DEFAULT 1,
        total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

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

    // Step 3: Seed categories only if table is empty
    const catCheck = await query('SELECT COUNT(*) AS cnt FROM categories');
    if (catCheck.success && Number(catCheck.data[0].cnt) === 0) {
      await query(`
        INSERT INTO categories (id, name, icon) VALUES
        (1, 'Mandhi Special', 'utensils'),
        (2, 'Alfaham & Grill', 'fire'),
        (3, 'Starters & Sides', 'drumstick-bite'),
        (4, 'Beverages', 'glass-martini-alt'),
        (5, 'Desserts', 'ice-cream');
      `);
      console.log('✓ Seeded default categories.');
    }

    // Step 4: Seed menu items only if table is empty
    const menuCheck = await query('SELECT COUNT(*) AS cnt FROM menu_items');
    if (menuCheck.success && Number(menuCheck.data[0].cnt) === 0) {
      await query(`
        INSERT INTO menu_items (category_id, name, price_quarter, price_half, price_full) VALUES
        (1, 'Special Chicken Mandhi (ஸ்பெஷல் சிக்கன் மந்தி)', 220, 420, 790),
        (1, 'Mutton Raan Mandhi (மட்டன் ரான் மந்தி)', 350, 680, 1290),
        (1, 'Beef Ribs Mandhi (பீஃப் ரிப்ஸ் மந்தி)', 280, 520, 980),
        (2, 'Peri Peri Alfaham (பெரி பெரி அல்ஃபஹாம்)', 160, 310, 590),
        (2, 'Honey Chili Alfaham (ஹனி சில்லி அல்ஃபஹாம்)', 170, 330, 620),
        (3, 'Kubboos (குபூஸ் - 2 Pcs)', 30, 30, 30),
        (3, 'Special Garlic Sauce / Mayonnaise (பூண்டு சாஸ்)', 40, 40, 40),
        (4, 'Fresh Mint Lime Mojito (புதினா மோஹிட்டோ)', 70, 70, 70),
        (4, 'Avocado Milkshake (அவகாடோ மில்க்‌ஷேக்)', 110, 110, 110),
        (5, 'Turkish Kunafa (துருக்கி குனாஃபா)', 180, 180, 180);
      `);
      console.log('✓ Seeded default menu items.');
    }

    console.log('✓ All tables ready in kish_mandhi database.');
    return { success: true, message: 'Database ready!' };
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    return { success: false, message: err.message };
  }
}

module.exports = { initializeDatabase };
