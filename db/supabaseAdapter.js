const { loadConfig } = require('./connection');

function getSupabaseCredentials() {
  const cfg = loadConfig();
  if (cfg.type === 'supabase' || cfg.supabaseUrl) {
    const url = (cfg.supabaseUrl || '').trim().replace(/\/+$/, '');
    const key = (cfg.supabaseKey || '').trim();
    if (url && key) {
      return { url, key };
    }
  }
  return null;
}

async function supabaseFetch(endpoint, options = {}) {
  const creds = getSupabaseCredentials();
  if (!creds) return null;

  const url = `${creds.url}/rest/v1/${endpoint.replace(/^\/+/, '')}`;
  const headers = {
    'apikey': creds.key,
    'Authorization': `Bearer ${creds.key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Supabase error (${res.status}): ${errText}`);
  }
  return await res.json();
}

async function saveMenuItemInSupabase(itemData) {
  try {
    const payload = {
      category_id: Number(itemData.category_id || itemData.categoryId || 1),
      name: itemData.name,
      price_quarter: Number(itemData.price_quarter || itemData.priceQuarter || 0),
      price_half: Number(itemData.price_half || itemData.priceHalf || 0),
      price_full: Number(itemData.price_full || itemData.priceFull || 0),
      is_available: true
    };
    const res = await supabaseFetch('menu_items', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res && res[0]) {
      const r = res[0];
      return {
        id: r.id,
        categoryId: r.category_id,
        name: r.name,
        priceQuarter: Number(r.price_quarter),
        priceHalf: Number(r.price_half),
        priceFull: Number(r.price_full),
        isAvailable: r.is_available
      };
    }
  } catch (err) {
    console.error('Supabase saveMenuItem error:', err.message);
  }
  return null;
}

async function updateMenuItemInSupabase(itemData) {
  try {
    const payload = {
      category_id: Number(itemData.category_id || itemData.categoryId || 1),
      name: itemData.name,
      price_quarter: Number(itemData.price_quarter || itemData.priceQuarter || 0),
      price_half: Number(itemData.price_half || itemData.priceHalf || 0),
      price_full: Number(itemData.price_full || itemData.priceFull || 0)
    };
    await supabaseFetch(`menu_items?id=eq.${itemData.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return true;
  } catch (err) {
    console.error('Supabase updateMenuItem error:', err.message);
    return false;
  }
}

async function deleteMenuItemFromSupabase(id) {
  try {
    await supabaseFetch(`menu_items?id=eq.${id}`, {
      method: 'DELETE'
    });
    return true;
  } catch (err) {
    console.error('Supabase deleteMenuItem error:', err.message);
    return false;
  }
}

// ─── Menu Items ─────────────────────────────────────────────
async function getMenuItemsFromSupabase() {
  try {
    let rows = await supabaseFetch('menu_items?select=*&order=id.asc');
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      // Seed initial menu items if empty
      await seedSupabaseDefaults();
      rows = await supabaseFetch('menu_items?select=*&order=id.asc');
    }
    return rows.map(r => ({
      id: r.id,
      categoryId: r.category_id,
      name: r.name,
      priceQuarter: Number(r.price_quarter || 0),
      priceHalf: Number(r.price_half || 0),
      priceFull: Number(r.price_full || 0),
      isAvailable: Boolean(r.is_available)
    }));
  } catch (err) {
    console.error('Supabase getMenuItems error:', err.message);
    return null;
  }
}

async function getCategoriesFromSupabase() {
  try {
    let rows = await supabaseFetch('categories?select=*&order=id.asc');
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      await seedSupabaseDefaults();
      rows = await supabaseFetch('categories?select=*&order=id.asc');
    }
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      icon: r.icon || 'utensils'
    }));
  } catch (err) {
    console.error('Supabase getCategories error:', err.message);
    return null;
  }
}

// ─── Orders ─────────────────────────────────────────────────
async function getOrdersFromSupabase() {
  try {
    const rows = await supabaseFetch('orders?select=*&order=created_at.desc');
    if (!rows || !Array.isArray(rows)) return [];
    return rows.map(r => ({
      id: r.id,
      orderNumber: r.order_number,
      orderType: r.order_type || 'Dine-In',
      subtotal: Number(r.subtotal || 0),
      taxAmount: Number(r.tax_amount || 0),
      discountAmount: Number(r.discount_amount || 0),
      grandTotal: Number(r.grand_total || 0),
      paymentMode: r.payment_mode || 'Cash',
      items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
      customerName: r.customer_name || '',
      customerPhone: r.customer_phone || '',
      createdAt: r.created_at
    }));
  } catch (err) {
    console.error('Supabase getOrders error:', err.message);
    return null;
  }
}

async function createOrderInSupabase(orderData) {
  try {
    const payload = {
      order_number: orderData.orderNumber || orderData.order_number,
      order_type: orderData.orderType || orderData.order_type || 'Dine-In',
      subtotal: Number(orderData.subtotal || 0),
      tax_amount: Number(orderData.taxAmount || orderData.tax_amount || 0),
      discount_amount: Number(orderData.discountAmount || orderData.discount_amount || 0),
      grand_total: Number(orderData.grandTotal || orderData.grand_total || 0),
      payment_mode: orderData.paymentMode || orderData.payment_mode || 'Cash',
      items: orderData.items || [],
      customer_name: orderData.customerName || orderData.customer_name || '',
      customer_phone: orderData.customerPhone || orderData.customer_phone || ''
    };
    const res = await supabaseFetch('orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res && res[0]) {
      const r = res[0];
      const orderId = r.id;

      // Insert line items into order_items table on Supabase
      if (Array.isArray(orderData.items) && orderData.items.length > 0) {
        const itemPayloads = orderData.items.map(item => ({
          order_id: orderId,
          dish_name: item.name || item.dishName || 'Item',
          variant: item.variant || 'Full',
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unitPrice || item.price || 0),
          total_price: Number(item.totalPrice || (Number(item.unitPrice || item.price || 0) * Number(item.quantity || 1)))
        }));
        await supabaseFetch('order_items', {
          method: 'POST',
          body: JSON.stringify(itemPayloads)
        }).catch(err => console.error('Supabase order_items insert error:', err.message));
      }

      return {
        id: r.id,
        orderNumber: r.order_number,
        orderType: r.order_type,
        subtotal: Number(r.subtotal),
        taxAmount: Number(r.tax_amount),
        discountAmount: Number(r.discount_amount),
        grandTotal: Number(r.grand_total),
        paymentMode: r.payment_mode,
        items: r.items,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        createdAt: r.created_at
      };
    }
  } catch (err) {
    console.error('Supabase createOrder error:', err.message);
  }
  return null;
}

async function getOrderItemsFromSupabase(orderId) {
  try {
    const rows = await supabaseFetch(`order_items?order_id=eq.${orderId}&select=*`);
    if (!rows || !Array.isArray(rows)) return [];
    return rows.map(r => ({
      id: r.id,
      name: r.dish_name,
      variant: r.variant,
      quantity: r.quantity,
      unitPrice: Number(r.unit_price),
      totalPrice: Number(r.total_price)
    }));
  } catch (err) {
    console.error('Supabase getOrderItems error:', err.message);
    return [];
  }
}

// ─── Expenses ───────────────────────────────────────────────
async function getExpensesFromSupabase() {
  try {
    const rows = await supabaseFetch('expenses?select=*&order=created_at.desc');
    if (!rows || !Array.isArray(rows)) return [];
    return rows.map(r => ({
      id: r.id,
      category: r.category,
      description: r.description || '',
      amount: Number(r.amount || 0),
      expenseDate: r.expense_date,
      paidTo: r.paid_to || '',
      paymentMode: r.payment_mode || 'Cash',
      createdAt: r.created_at
    }));
  } catch (err) {
    console.error('Supabase getExpenses error:', err.message);
    return null;
  }
}

async function addExpenseInSupabase(expData) {
  try {
    const payload = {
      category: expData.category,
      description: expData.description || '',
      amount: Number(expData.amount || 0),
      expense_date: expData.expenseDate || expData.expense_date || new Date().toISOString().slice(0, 10),
      paid_to: expData.paidTo || expData.paid_to || '',
      payment_mode: expData.paymentMode || expData.payment_mode || 'Cash'
    };
    const res = await supabaseFetch('expenses', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res && res[0]) {
      const r = res[0];
      return {
        id: r.id,
        category: r.category,
        description: r.description,
        amount: Number(r.amount),
        expenseDate: r.expense_date,
        paidTo: r.paid_to,
        paymentMode: r.payment_mode,
        createdAt: r.created_at
      };
    }
  } catch (err) {
    console.error('Supabase addExpense error:', err.message);
  }
  return null;
}

// ─── Seed Defaults ──────────────────────────────────────────
async function seedSupabaseDefaults() {
  try {
    const cats = [
      { id: 1, name: 'Mandhi Special', icon: 'utensils' },
      { id: 2, name: 'Barbeque & Grills', icon: 'flame' },
      { id: 3, name: 'Starters & Sides', icon: 'drumstick' },
      { id: 4, name: 'Beverages & Juices', icon: 'cup-soda' },
      { id: 5, name: 'Desserts', icon: 'ice-cream' },
      { id: 6, name: 'Combo Offers', icon: 'gift' }
    ];
    await supabaseFetch('categories', { method: 'POST', body: JSON.stringify(cats) }).catch(() => {});

    const items = [
      { category_id: 1, name: 'Special Chicken Mandhi (ஸ்பெஷல் சிக்கன் மந்தி)', price_quarter: 220, price_half: 420, price_full: 790, is_available: true },
      { category_id: 1, name: 'Mutton Raan Mandhi (மட்டன் ரான் மந்தி)', price_quarter: 350, price_half: 680, price_full: 1290, is_available: true },
      { category_id: 1, name: 'Beef Ribs Mandhi (பீஃப் ரிப்ஸ் மந்தி)', price_quarter: 280, price_half: 520, price_full: 980, is_available: true },
      { category_id: 2, name: 'Peri Peri Alfaham (பெரி பெரி அல்ஃபஹாம்)', price_quarter: 160, price_half: 310, price_full: 590, is_available: true },
      { category_id: 2, name: 'Honey Chili Alfaham (ஹனி சில்லி அல்ஃபஹாம்)', price_quarter: 170, price_half: 330, price_full: 620, is_available: true },
      { category_id: 3, name: 'Kubboos (குபூஸ் - 2 Pcs)', price_quarter: 30, price_half: 30, price_full: 30, is_available: true },
      { category_id: 3, name: 'Special Garlic Sauce / Mayonnaise (பூண்டு சாஸ்)', price_quarter: 40, price_half: 40, price_full: 40, is_available: true },
      { category_id: 4, name: 'Fresh Mint Lime Mojito (புதினா மோஹிட்டோ)', price_quarter: 70, price_half: 70, price_full: 70, is_available: true },
      { category_id: 4, name: 'Avocado Milkshake (அவகாடோ மில்க்‌ஷேக்)', price_quarter: 110, price_half: 110, price_full: 110, is_available: true },
      { category_id: 5, name: 'Turkish Kunafa (துருக்கி குனாஃபா)', price_quarter: 180, price_half: 180, price_full: 180, is_available: true }
    ];
    await supabaseFetch('menu_items', { method: 'POST', body: JSON.stringify(items) }).catch(() => {});
  } catch (e) {
    console.error('Failed to seed Supabase defaults:', e);
  }
}

async function deleteExpenseFromSupabase(id) {
  try {
    await supabaseFetch(`expenses?id=eq.${id}`, {
      method: 'DELETE'
    });
    return true;
  } catch (err) {
    console.error('Supabase deleteExpense error:', err.message);
    return false;
  }
}

// ─── Tokens (KOT) ───────────────────────────────────────────
async function getTokensFromSupabase() {
  try {
    const rows = await supabaseFetch('tokens?select=*&order=created_at.desc');
    if (!rows || !Array.isArray(rows)) return [];
    return rows.map(r => ({
      tokenNumber: r.token_number,
      orderType: r.order_type || 'Dine-In',
      paymentMode: r.payment_mode || 'Cash',
      items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
      createdAt: r.created_at
    }));
  } catch (err) {
    console.error('Supabase getTokens error:', err.message);
    return [];
  }
}

async function saveTokenToSupabase(tokenData) {
  try {
    const payload = {
      token_number: tokenData.tokenNumber,
      order_type: tokenData.orderType || 'Dine-In',
      payment_mode: tokenData.paymentMode || 'Cash',
      items: tokenData.items || []
    };
    await supabaseFetch('tokens', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (err) {
    console.error('Supabase saveToken error:', err.message);
    return false;
  }
}

async function deleteTokenFromSupabase(tokenNumber) {
  try {
    await supabaseFetch(`tokens?token_number=eq.${tokenNumber}`, {
      method: 'DELETE'
    });
    return true;
  } catch (err) {
    console.error('Supabase deleteToken error:', err.message);
    return false;
  }
}

// ─── Dashboard Stats ─────────────────────────────────────────
async function getDashboardStatsFromSupabase() {
  try {
    const orders = await getOrdersFromSupabase() || [];
    const expenses = await getExpensesFromSupabase() || [];

    const todayStr = new Date().toISOString().split('T')[0];

    const todayOrders = orders.filter(o => {
      const dt = (o.createdAt || '').split('T')[0];
      return dt === todayStr;
    });

    const todayExpenses = expenses.filter(e => {
      const dt = (e.expenseDate || e.createdAt || '').split('T')[0];
      return dt === todayStr;
    });

    const totalRevenue = todayOrders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
    const totalOrdersCount = todayOrders.length;
    const totalExpenseSum = todayExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenseSum;

    const recentOrders = orders.slice(0, 5).map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      orderType: o.orderType,
      grandTotal: Number(o.grandTotal),
      paymentMode: o.paymentMode,
      createdAt: o.createdAt
    }));

    return {
      totalRevenue,
      totalOrdersCount,
      totalExpenseSum,
      netProfit,
      recentOrders
    };
  } catch (err) {
    console.error('Supabase getDashboardStats error:', err.message);
    return null;
  }
}

// ─── Users (Auth) ───────────────────────────────────────────
async function getUsersFromSupabase() {
  try {
    const rows = await supabaseFetch('users?select=*');
    if (!rows || !Array.isArray(rows)) return [];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email || '',
      phone: r.phone || '',
      password: r.password,
      role: r.role || 'admin'
    }));
  } catch (err) {
    console.error('Supabase getUsers error:', err.message);
    return [];
  }
}

async function registerUserInSupabase(userData) {
  try {
    const payload = {
      name: userData.name,
      email: userData.email || '',
      phone: userData.phone || '',
      password: userData.password,
      role: userData.role || 'admin'
    };
    const res = await supabaseFetch('users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res && res[0]) {
      const r = res[0];
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        role: r.role
      };
    }
  } catch (err) {
    console.error('Supabase registerUser error:', err.message);
  }
  return null;
}

// ─── Restaurant Details ──────────────────────────────────────
async function getRestaurantDetailsFromSupabase() {
  try {
    const rows = await supabaseFetch('restaurant_details?select=*&limit=1');
    if (!rows || !Array.isArray(rows) || rows.length === 0) return null;
    const r = rows[0];
    return {
      companyName: r.company_name || 'Kish Mandhi',
      tagline: r.tagline || '',
      ownerName: r.owner_name || '',
      gstNumber: r.gst_number || '',
      fssaiNumber: r.fssai_number || '',
      phone: r.phone || '',
      email: r.email || '',
      address: r.address || '',
      taxRate: Number(r.tax_rate ?? 5),
      currency: r.currency || '₹',
      headerNote: r.header_note || '',
      footerNote: r.footer_note || '',
      logoUrl: r.logo_url || '',
      softwareIconUrl: r.software_icon_url || ''
    };
  } catch (err) {
    console.error('Supabase getRestaurantDetails error:', err.message);
    return null;
  }
}

async function saveRestaurantDetailsInSupabase(data) {
  try {
    const payload = {
      id: 1,
      company_name: data.companyName || 'Kish Mandhi',
      tagline: data.tagline || '',
      owner_name: data.ownerName || '',
      gst_number: data.gstNumber || '',
      fssai_number: data.fssaiNumber || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      tax_rate: Number(data.taxRate ?? 5),
      currency: data.currency || '₹',
      header_note: data.headerNote || '',
      footer_note: data.footerNote || '',
      logo_url: data.logoUrl || '',
      software_icon_url: data.softwareIconUrl || ''
    };
    await supabaseFetch('restaurant_details', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (err) {
    console.error('Supabase saveRestaurantDetails error:', err.message);
    return false;
  }
}

module.exports = {
  getSupabaseCredentials,
  getCategoriesFromSupabase,
  getMenuItemsFromSupabase,
  saveMenuItemInSupabase,
  updateMenuItemInSupabase,
  deleteMenuItemFromSupabase,
  getOrdersFromSupabase,
  createOrderInSupabase,
  getOrderItemsFromSupabase,
  getExpensesFromSupabase,
  addExpenseInSupabase,
  deleteExpenseFromSupabase,
  getTokensFromSupabase,
  saveTokenToSupabase,
  deleteTokenFromSupabase,
  getDashboardStatsFromSupabase,
  seedSupabaseDefaults,
  getUsersFromSupabase,
  registerUserInSupabase,
  getRestaurantDetailsFromSupabase,
  saveRestaurantDetailsInSupabase
};
