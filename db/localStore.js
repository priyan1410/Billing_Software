const fs = require('fs');
const path = require('path');

let dbFilePath = '';

function getDbFilePath() {
  if (!dbFilePath) {
    try {
      const { app } = require('electron');
      if (app && app.getPath) {
        dbFilePath = path.join(app.getPath('userData'), 'local-database.json');
      }
    } catch (e) {}
    if (!dbFilePath) {
      dbFilePath = path.join(__dirname, 'local-database.json');
    }
  }
  return dbFilePath;
}

const defaultCategories = [
  { id: 1, name: 'Mandhi Special', icon: 'utensils' },
  { id: 2, name: 'Barbeque & Grills', icon: 'flame' },
  { id: 3, name: 'Starters & Sides', icon: 'drumstick' },
  { id: 4, name: 'Beverages & Juices', icon: 'cup-soda' },
  { id: 5, name: 'Desserts', icon: 'ice-cream' }
];

const defaultMenuItems = [
  { id: 1, category_id: 1, name: 'Chicken Mandhi (சிக்கன் மந்தி)', price_quarter: 180, price_half: 340, price_full: 650, is_available: 1, image: 'default' },
  { id: 2, category_id: 1, name: 'Mutton Mandhi (ஆட்டு இறைச்சி மந்தி)', price_quarter: 260, price_half: 500, price_full: 980, is_available: 1, image: 'default' },
  { id: 3, category_id: 2, name: 'Alfaham Chicken (அல்ஃபாஹாம் சிக்கன்)', price_quarter: 150, price_half: 280, price_full: 540, is_available: 1, image: 'default' },
  { id: 4, category_id: 2, name: 'Pepper BBQ Chicken', price_quarter: 160, price_half: 300, price_full: 580, is_available: 1, image: 'default' },
  { id: 5, category_id: 4, name: 'Fresh Mint Lime', price_quarter: 0, price_half: 0, price_full: 50, is_available: 1, image: 'default' },
  { id: 6, category_id: 5, name: 'Kunafa Special', price_quarter: 0, price_half: 0, price_full: 180, is_available: 1, image: 'default' }
];

const defaultRestaurantDetails = [
  {
    id: 1,
    company_name: 'Kish Mandhi',
    tagline: 'Arabic Grill & Fine Dining',
    owner_name: 'Admin Owner',
    gst_number: '33AAAAA0000A1Z5',
    fssai_number: '12421000000000',
    phone: '+91 98765 43210',
    email: 'contact@kishmandhi.com',
    address: '123 Main Road, Highway Junction',
    tax_rate: 5.00,
    currency: '₹',
    header_note: 'Welcome to Kish Mandhi!',
    footer_note: 'Thank you! Visit again.',
    print_config: JSON.stringify({
      printShowLogo: true,
      printShowAddress: true,
      printShowPhone: true,
      printShowGst: true,
      printShowHeaderNote: true,
      printShowTime: true,
      printShowTaxBreakdown: true,
      printShowRoundOff: true,
      printShowFooterNote: true
    }),
    updated_at: new Date().toISOString()
  }
];

const defaultUsers = [
  {
    id: 1,
    username: 'admin',
    name: 'Admin Owner',
    email: 'admin@kishmandhi.com',
    phone: '9876543210',
    password: '123',
    role: 'admin',
    created_at: new Date().toISOString()
  }
];

function getInitialData() {
  return {
    categories: defaultCategories,
    menu_items: defaultMenuItems,
    orders: [],
    expenses: [],
    tokens: [],
    users: defaultUsers,
    restaurant_details: defaultRestaurantDetails
  };
}

let memoryDb = null;

function loadStore() {
  if (memoryDb) return memoryDb;
  const fp = getDbFilePath();
  try {
    if (fs.existsSync(fp)) {
      const content = fs.readFileSync(fp, 'utf8');
      memoryDb = JSON.parse(content);
      // Ensure all standard tables exist
      const initial = getInitialData();
      for (const k of Object.keys(initial)) {
        if (!memoryDb[k] || !Array.isArray(memoryDb[k])) {
          memoryDb[k] = initial[k];
        }
      }
    } else {
      memoryDb = getInitialData();
      saveStore();
    }
  } catch (err) {
    console.error('Error loading local database JSON store:', err);
    memoryDb = getInitialData();
  }
  return memoryDb;
}

function saveStore() {
  if (!memoryDb) return;
  const fp = getDbFilePath();
  try {
    const dir = path.dirname(fp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fp, JSON.stringify(memoryDb, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write local database JSON store:', err);
  }
}

// Simple embedded SQL query executor for JSON store
function localQuery(sql, params = []) {
  const db = loadStore();
  const cleanSql = sql.trim();

  // 1. DDL Statements (CREATE TABLE, ALTER TABLE, SHOW DATABASES, SHOW COLUMNS, INFORMATION_SCHEMA)
  if (/^\s*(CREATE|ALTER|DROP|TRUNCATE|SHOW|INFORMATION_SCHEMA)\b/i.test(cleanSql)) {
    return { success: true, data: [] };
  }

  // 2. CLEAR/DELETE TABLES
  if (/^\s*DELETE\s+FROM\s+orders\s*$/i.test(cleanSql)) {
    db.orders = [];
    saveStore();
    return { success: true, data: { affectedRows: 0 } };
  }
  if (/^\s*DELETE\s+FROM\s+expenses\s*$/i.test(cleanSql)) {
    db.expenses = [];
    saveStore();
    return { success: true, data: { affectedRows: 0 } };
  }
  if (/^\s*DELETE\s+FROM\s+menu_items\s*$/i.test(cleanSql)) {
    db.menu_items = [];
    saveStore();
    return { success: true, data: { affectedRows: 0 } };
  }

  // 3. CATEGORIES
  if (/^SELECT\s+\*\s+FROM\s+categories/i.test(cleanSql)) {
    return { success: true, data: db.categories || [] };
  }

  // 4. MENU ITEMS
  if (/^SELECT\s+\*\s+FROM\s+menu_items/i.test(cleanSql)) {
    let items = db.menu_items || [];
    if (cleanSql.includes('category_id = ?')) {
      const catId = Number(params[0]);
      items = items.filter(i => Number(i.category_id || i.categoryId) === catId);
    }
    if (cleanSql.includes('is_available = 1')) {
      items = items.filter(i => !!i.is_available);
    }
    return { success: true, data: items };
  }

  if (/^INSERT\s+INTO\s+menu_items/i.test(cleanSql)) {
    const nextId = (db.menu_items.reduce((max, i) => Math.max(max, i.id || 0), 0)) + 1;
    const newItem = {
      id: nextId,
      category_id: Number(params[0] || 1),
      name: params[1] || '',
      price_quarter: Number(params[2] || 0),
      price_half: Number(params[3] || 0),
      price_full: Number(params[4] || 0),
      is_available: params[5] !== undefined ? Number(params[5]) : 1,
      image: 'default'
    };
    db.menu_items.push(newItem);
    saveStore();
    return { success: true, data: { insertId: nextId } };
  }

  if (/^UPDATE\s+menu_items/i.test(cleanSql)) {
    const name = params[0];
    const category_id = Number(params[1]);
    const price_quarter = Number(params[2]);
    const price_half = Number(params[3]);
    const price_full = Number(params[4]);
    const id = Number(params[5]);

    const idx = db.menu_items.findIndex(i => Number(i.id) === id);
    if (idx !== -1) {
      db.menu_items[idx] = {
        ...db.menu_items[idx],
        name,
        category_id,
        price_quarter,
        price_half,
        price_full
      };
      saveStore();
    }
    return { success: true, data: [] };
  }

  if (/^DELETE\s+FROM\s+menu_items\s+WHERE\s+id\s*=\s*\?/i.test(cleanSql)) {
    const id = Number(params[0]);
    db.menu_items = db.menu_items.filter(i => Number(i.id) !== id);
    saveStore();
    return { success: true, data: [] };
  }

  // 5. ORDERS
  if (/SELECT\s+MAX\(id\)\s+as\s+maxId\s+FROM\s+orders/i.test(cleanSql)) {
    const maxId = db.orders.reduce((max, o) => Math.max(max, o.id || 0), 0);
    return { success: true, data: [{ maxId }] };
  }

  if (/^INSERT\s+INTO\s+orders/i.test(cleanSql)) {
    const nextId = (db.orders.reduce((max, o) => Math.max(max, o.id || 0), 0)) + 1;
    const newOrder = {
      id: nextId,
      order_number: params[0] || `KMIV-${String(nextId).padStart(3, '0')}`,
      order_type: params[1] || 'Dine-In',
      subtotal: Number(params[2] || 0),
      tax_amount: Number(params[3] || 0),
      discount_amount: Number(params[4] || 0),
      grand_total: Number(params[5] || 0),
      payment_mode: params[6] || 'Cash',
      token_number: params[7] || null,
      status: 'Completed',
      created_at: new Date().toISOString()
    };
    db.orders.unshift(newOrder);
    saveStore();
    return { success: true, data: { insertId: nextId } };
  }

  if (/^SELECT\s+\*\s+FROM\s+orders/i.test(cleanSql)) {
    let list = [...(db.orders || [])];
    if (cleanSql.includes('LIMIT 5')) {
      list = list.slice(0, 5);
    }
    return { success: true, data: list };
  }

  if (/SELECT\s+COALESCE\(SUM\(grand_total\),\s*0\)\s+AS\s+total\s+FROM\s+orders/i.test(cleanSql)) {
    const total = (db.orders || []).reduce((sum, o) => sum + Number(o.grand_total || 0), 0);
    return { success: true, data: [{ total }] };
  }

  if (/SELECT\s+COUNT\(\*\)\s+AS\s+cnt\s+FROM\s+orders/i.test(cleanSql)) {
    return { success: true, data: [{ cnt: (db.orders || []).length }] };
  }

  // 6. EXPENSES
  if (/SELECT\s+COALESCE\(SUM\(amount\),\s*0\)\s+AS\s+total\s+FROM\s+expenses/i.test(cleanSql)) {
    const total = (db.expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return { success: true, data: [{ total }] };
  }

  if (/^SELECT\s+\*\s+FROM\s+expenses/i.test(cleanSql)) {
    return { success: true, data: db.expenses || [] };
  }

  if (/^INSERT\s+INTO\s+expenses/i.test(cleanSql)) {
    const nextId = (db.expenses.reduce((max, e) => Math.max(max, e.id || 0), 0)) + 1;
    const newExp = {
      id: nextId,
      category: params[0] || 'General',
      description: params[1] || '',
      amount: Number(params[2] || 0),
      expense_date: params[3] || new Date().toISOString().split('T')[0],
      paid_to: params[4] || '',
      payment_mode: params[5] || 'Cash',
      created_at: new Date().toISOString()
    };
    db.expenses.unshift(newExp);
    saveStore();
    return { success: true, data: { insertId: nextId } };
  }

  if (/^DELETE\s+FROM\s+expenses\s+WHERE\s+id\s*=\s*\?/i.test(cleanSql)) {
    const id = Number(params[0]);
    db.expenses = (db.expenses || []).filter(e => Number(e.id) !== id);
    saveStore();
    return { success: true, data: [] };
  }

  // 7. TOKENS
  if (/^SELECT\s+\*\s+FROM\s+tokens/i.test(cleanSql)) {
    const tokens = (db.tokens || []).filter(t => t.status === 'Active' || t.status === 'Pending');
    return { success: true, data: tokens };
  }

  if (/^INSERT\s+INTO\s+tokens/i.test(cleanSql)) {
    const tokenNum = params[0];
    const orderType = params[1] || 'Dine-In';
    const itemsSummary = params[2] || '[]';
    
    const existingIdx = (db.tokens || []).findIndex(t => String(t.token_number).toUpperCase() === String(tokenNum).toUpperCase());
    let insertId = 1;
    if (existingIdx !== -1) {
      db.tokens[existingIdx] = {
        ...db.tokens[existingIdx],
        order_type: orderType,
        items_summary: itemsSummary,
        status: 'Active',
        updated_at: new Date().toISOString()
      };
      insertId = db.tokens[existingIdx].id;
    } else {
      insertId = (db.tokens.reduce((max, t) => Math.max(max, t.id || 0), 0)) + 1;
      db.tokens.unshift({
        id: insertId,
        token_number: tokenNum,
        order_type: orderType,
        table_no: 'N/A',
        items_summary: itemsSummary,
        status: 'Active',
        created_at: new Date().toISOString()
      });
    }
    saveStore();
    return { success: true, data: { insertId } };
  }

  if (/UPDATE\s+tokens\s+SET\s+status\s*=\s*'Billed'/i.test(cleanSql)) {
    const target = params[0];
    db.tokens = (db.tokens || []).map(t => {
      if (String(t.token_number).toUpperCase() === String(target).toUpperCase()) {
        return { ...t, status: 'Billed' };
      }
      return t;
    });
    saveStore();
    return { success: true, data: [] };
  }

  if (/^DELETE\s+FROM\s+tokens/i.test(cleanSql)) {
    const target = params[0];
    db.tokens = (db.tokens || []).filter(t => String(t.token_number).toUpperCase() !== String(target).toUpperCase());
    saveStore();
    return { success: true, data: [] };
  }

  // 8. USERS & AUTH
  if (/SELECT\s+COUNT\(\*\)\s+AS\s+cnt\s+FROM\s+users/i.test(cleanSql)) {
    return { success: true, data: [{ cnt: (db.users || []).length }] };
  }

  if (/SELECT\s+id,\s*username,\s*name,\s*email,\s*phone,\s*role\s+FROM\s+users\s+WHERE\s+id\s*=\s*\?/i.test(cleanSql)) {
    const userId = Number(params[0]);
    const user = (db.users || []).find(u => Number(u.id) === userId);
    return { success: true, data: user ? [user] : [] };
  }

  if (/SELECT\s+id\s+FROM\s+users\s+WHERE\s+username\s*=\s*\?/i.test(cleanSql)) {
    const username = String(params[0] || '').toLowerCase();
    const email = String(params[1] || '').toLowerCase();
    const existing = (db.users || []).find(u => 
      String(u.username || '').toLowerCase() === username || 
      (email && String(u.email || '').toLowerCase() === email)
    );
    return { success: true, data: existing ? [{ id: existing.id }] : [] };
  }

  if (/SELECT\s+\*\s+FROM\s+users/i.test(cleanSql)) {
    const cleanInput = String(params[0] || '').toLowerCase();
    const user = (db.users || []).find(u =>
      String(u.username || '').toLowerCase() === cleanInput ||
      String(u.email || '').toLowerCase() === cleanInput ||
      String(u.name || '').toLowerCase() === cleanInput ||
      String(u.phone || '').trim() === String(params[3] || '').trim()
    );
    return { success: true, data: user ? [user] : [] };
  }

  if (/^INSERT\s+INTO\s+users/i.test(cleanSql)) {
    const nextId = (db.users.reduce((max, u) => Math.max(max, u.id || 0), 0)) + 1;
    const newUser = {
      id: nextId,
      username: params[0] || '',
      name: params[1] || '',
      email: params[2] || '',
      phone: params[3] || '',
      password: params[4] || '',
      role: params[5] || 'admin',
      created_at: new Date().toISOString()
    };
    db.users.push(newUser);
    saveStore();
    return { success: true, data: { insertId: nextId } };
  }

  // 9. RESTAURANT DETAILS
  if (/SELECT\s+\*\s+FROM\s+restaurant_details/i.test(cleanSql)) {
    return { success: true, data: db.restaurant_details || defaultRestaurantDetails };
  }

  if (/INSERT\s+INTO\s+restaurant_details/i.test(cleanSql) || /UPDATE\s+restaurant_details/i.test(cleanSql)) {
    let rest = (db.restaurant_details && db.restaurant_details[0]) ? { ...db.restaurant_details[0] } : { ...defaultRestaurantDetails[0] };
    
    if (params.length >= 7) {
      rest.company_name = params[0] || rest.company_name;
      rest.tagline = params[1] || rest.tagline;
      rest.phone = params[2] || rest.phone;
      rest.email = params[3] || rest.email;
      rest.address = params[4] || rest.address;
      rest.tax_rate = Number(params[5] ?? rest.tax_rate);
      rest.currency = params[6] || rest.currency;
    }
    
    db.restaurant_details = [rest];
    saveStore();
    return { success: true, data: { affectedRows: 1 } };
  }

  // 10. GET TABLE DATA DIRECT
  if (/SELECT\s+\*\s+FROM\s+`?(\w+)`?/i.test(cleanSql)) {
    const match = cleanSql.match(/SELECT\s+\*\s+FROM\s+`?(\w+)`?/i);
    const tbl = match ? match[1] : '';
    if (tbl && db[tbl]) {
      return { success: true, data: db[tbl] };
    }
  }

  return { success: true, data: [] };
}

module.exports = {
  localQuery,
  loadStore,
  saveStore,
  getDbFilePath
};
