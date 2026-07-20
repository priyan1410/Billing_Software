const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Default Configuration
let dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'kish_mandhi',
  connectTimeout: 5000
};

// In-Memory Fallback Store if MySQL is not active yet
const mockStore = {
  connected: false,
  categories: [
    { id: 1, name: 'Mandhi Special', icon: 'utensils' },
    { id: 2, name: 'Alfaham & Grill', icon: 'fire' },
    { id: 3, name: 'Starters & Sides', icon: 'drumstick-bite' },
    { id: 4, name: 'Beverages', icon: 'glass-martini-alt' },
    { id: 5, name: 'Desserts', icon: 'ice-cream' }
  ],
  menu_items: [
    { id: 1, category_id: 1, name: 'Special Chicken Mandhi', price_quarter: 220, price_half: 420, price_full: 790, is_available: 1, image: 'chicken_mandhi' },
    { id: 2, category_id: 1, name: 'Mutton Raan Mandhi', price_quarter: 350, price_half: 680, price_full: 1290, is_available: 1, image: 'mutton_mandhi' },
    { id: 3, category_id: 1, name: 'Beef Ribs Mandhi', price_quarter: 280, price_half: 520, price_full: 980, is_available: 1, image: 'beef_mandhi' },
    { id: 4, category_id: 2, name: 'Peri Peri Alfaham', price_quarter: 160, price_half: 310, price_full: 590, is_available: 1, image: 'peri_peri' },
    { id: 5, category_id: 2, name: 'Honey Chili Alfaham', price_quarter: 170, price_half: 330, price_full: 620, is_available: 1, image: 'honey_alfaham' },
    { id: 6, category_id: 3, name: 'Kubboos (2 Pcs)', price_quarter: 30, price_half: 30, price_full: 30, is_available: 1, image: 'kubboos' },
    { id: 7, category_id: 3, name: 'Special Garlic Sauce / Mayonnaise', price_quarter: 40, price_half: 40, price_full: 40, is_available: 1, image: 'garlic' },
    { id: 8, category_id: 4, name: 'Fresh Mint Lime Mojito', price_quarter: 70, price_half: 70, price_full: 70, is_available: 1, image: 'mojito' },
    { id: 9, category_id: 4, name: 'Avocado Milkshake', price_quarter: 110, price_half: 110, price_full: 110, is_available: 1, image: 'shake' },
    { id: 10, category_id: 5, name: 'Turkish Kunafa with Ice Cream', price_quarter: 180, price_half: 180, price_full: 180, is_available: 1, image: 'kunafa' }
  ],
  orders: [
    {
      id: 101,
      order_number: 'KM-1001',
      token_number: 101,
      order_type: 'Dine-In',
      table_no: 'T-04',
      subtotal: 790,
      tax_amount: 39.5,
      discount_amount: 0,
      grand_total: 829.5,
      payment_mode: 'UPI',
      status: 'Completed',
      created_at: new Date().toISOString()
    },
    {
      id: 102,
      order_number: 'KM-1002',
      token_number: 102,
      order_type: 'Takeaway',
      table_no: 'N/A',
      subtotal: 420,
      tax_amount: 21,
      discount_amount: 20,
      grand_total: 421,
      payment_mode: 'Cash',
      status: 'Ready',
      created_at: new Date().toISOString()
    },
    {
      id: 103,
      order_number: 'KM-1003',
      token_number: 103,
      order_type: 'Dine-In',
      table_no: 'T-01',
      subtotal: 1290,
      tax_amount: 64.5,
      discount_amount: 50,
      grand_total: 1304.5,
      payment_mode: 'Card',
      status: 'Cooking',
      created_at: new Date().toISOString()
    }
  ],
  order_items: [
    { id: 1, order_id: 101, item_name: 'Special Chicken Mandhi', variant: 'Full', unit_price: 790, quantity: 1, total_price: 790 },
    { id: 2, order_id: 102, item_name: 'Special Chicken Mandhi', variant: 'Half', unit_price: 420, quantity: 1, total_price: 420 },
    { id: 3, order_id: 103, item_name: 'Mutton Raan Mandhi', variant: 'Full', unit_price: 1290, quantity: 1, total_price: 1290 }
  ],
  tokens: [
    { id: 1, order_id: 101, token_number: 101, order_type: 'Dine-In', table_no: 'T-04', items_summary: '1x Special Chicken Mandhi (Full)', status: 'Completed', created_at: new Date().toISOString() },
    { id: 2, order_id: 102, token_number: 102, order_type: 'Takeaway', table_no: 'N/A', items_summary: '1x Special Chicken Mandhi (Half)', status: 'Ready', created_at: new Date().toISOString() },
    { id: 3, order_id: 103, token_number: 103, order_type: 'Dine-In', table_no: 'T-01', items_summary: '1x Mutton Raan Mandhi (Full)', status: 'Cooking', created_at: new Date().toISOString() }
  ],
  expenses: [
    { id: 1, category: 'Raw Material', description: 'Basmati Rice & Premium Arabic Spices', amount: 4500, expense_date: new Date().toISOString().split('T')[0], paid_to: 'Malabar Traders', payment_mode: 'UPI' },
    { id: 2, category: 'Raw Material', description: 'Fresh Farm Chicken & Mutton Raan', amount: 8200, expense_date: new Date().toISOString().split('T')[0], paid_to: 'City Poultry & Meats', payment_mode: 'Cash' },
    { id: 3, category: 'Utilities', description: 'Cooking Gas Cylinders (Commercial)', amount: 3600, expense_date: new Date().toISOString().split('T')[0], paid_to: 'Indane Gas Agency', payment_mode: 'Card' }
  ]
};

let pool = null;

// Path to persistent config file
function getConfigFilePath() {
  try {
    const { app } = require('electron');
    if (app) {
      return path.join(app.getPath('userData'), 'db-config.json');
    }
  } catch (e) {
    // fallback if required outside electron main
  }
  return path.join(__dirname, 'db-config.json');
}

function loadConfig() {
  try {
    const cfgPath = getConfigFilePath();
    if (fs.existsSync(cfgPath)) {
      const raw = fs.readFileSync(cfgPath, 'utf8');
      const loaded = JSON.parse(raw);
      dbConfig = { ...dbConfig, ...loaded };
    }
  } catch (err) {
    console.error('Error loading config:', err.message);
  }
  return dbConfig;
}

function saveConfig(newConfig) {
  try {
    dbConfig = { ...dbConfig, ...newConfig };
    const cfgPath = getConfigFilePath();
    fs.writeFileSync(cfgPath, JSON.stringify(dbConfig, null, 2));
    // Reset pool if config updated
    if (pool) {
      pool.end();
      pool = null;
    }
    return { success: true, message: 'Configuration saved successfully.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function getPool() {
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
      connectTimeout: 4000
    });
  }
  return pool;
}

async function testConnection(customConfig = null) {
  const target = customConfig || loadConfig();
  try {
    const conn = await mysql.createConnection({
      host: target.host,
      port: Number(target.port),
      user: target.user,
      password: target.password,
      connectTimeout: 4000
    });
    
    // Check if database exists
    const [rows] = await conn.query(`SHOW DATABASES LIKE '${target.database}'`);
    const dbExists = rows.length > 0;
    
    await conn.end();
    mockStore.connected = true;
    return {
      success: true,
      message: dbExists 
        ? `Connected to MySQL successfully! Database '${target.database}' exists.` 
        : `Connected to MySQL successfully! Database '${target.database}' will be created upon setup.`,
      dbExists
    };
  } catch (err) {
    mockStore.connected = false;
    return {
      success: false,
      message: `MySQL Connection failed: ${err.message}. (Running in offline memory mode until MySQL is configured)`,
      error: err.message
    };
  }
}

// Wrapper for MySQL queries with automatic fallback to mock store
async function query(sql, params = []) {
  try {
    const p = await getPool();
    const [rows] = await p.execute(sql, params);
    mockStore.connected = true;
    return { success: true, data: rows, isMock: false };
  } catch (err) {
    mockStore.connected = false;
    // Log silently, fallback to mock store handling in API handlers
    return { success: false, error: err.message, isMock: true };
  }
}

module.exports = {
  dbConfig,
  loadConfig,
  saveConfig,
  testConnection,
  query,
  getPool,
  mockStore
};
