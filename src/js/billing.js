// Billing POS & Thermal Receipt Controller

const Billing = {
  menuItems: [],
  cart: [],
  activeCategory: 'all',
  searchQuery: '',
  orderType: 'Dine-In',
  paymentMode: 'Cash',
  currentReceiptData: null,

  init() {
    this.bindEvents();
    this.initCatalog();
  },

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('pos-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.renderMenuGrid();
      });
    }

    // Category Tabs
    const catTabs = document.querySelectorAll('#pos-category-tabs .cat-tab');
    catTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        catTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeCategory = tab.getAttribute('data-cat');
        this.renderMenuGrid();
      });
    });

    // Order Type toggle (Dine-In vs Takeaway)
    const typeBtns = document.querySelectorAll('.type-btn');
    const tableContainer = document.getElementById('table-select-container');
    typeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        typeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.orderType = btn.getAttribute('data-type');
        if (tableContainer) {
          tableContainer.style.display = (this.orderType === 'Dine-In') ? 'flex' : 'none';
        }
      });
    });

    // Payment Mode buttons
    const payBtns = document.querySelectorAll('.pay-btn');
    payBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        payBtns.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        this.paymentMode = btn.getAttribute('data-mode');
      });
    });

    // Clear Cart
    const clearBtn = document.getElementById('btn-clear-cart');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearCart());
    }

    // Discount Input
    const discountInput = document.getElementById('cart-discount-input');
    if (discountInput) {
      discountInput.addEventListener('input', () => this.updateCartSummary());
    }

    // Checkout Order
    const checkoutBtn = document.getElementById('btn-complete-order');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => this.handleCheckout());
    }

    // Load Token Button
    const loadTokenBtn = document.getElementById('btn-load-selected-token');
    if (loadTokenBtn) {
      loadTokenBtn.addEventListener('click', () => {
        const select = document.getElementById('pos-import-token-select');
        const tokenNum = select ? select.value : '';
        if (!tokenNum) return;
        const targetToken = (window.activeTokensList || []).find(t => String(t.tokenNumber) === String(tokenNum));
        if (targetToken) {
          this.loadTokenDataToCart(targetToken);
        }
      });
    }

    // Add Dish Modal controls
    const openDishModalBtn = document.getElementById('btn-open-add-dish-modal');
    const closeDishBtn1 = document.getElementById('btn-close-dish-modal');
    const closeDishBtn2 = document.getElementById('btn-close-dish-modal-2');
    const addDishForm = document.getElementById('add-dish-form');

    if (openDishModalBtn) openDishModalBtn.addEventListener('click', () => this.showAddDishModal());
    if (closeDishBtn1) closeDishBtn1.addEventListener('click', () => this.hideAddDishModal());
    if (closeDishBtn2) closeDishBtn2.addEventListener('click', () => this.hideAddDishModal());
    if (addDishForm) addDishForm.addEventListener('submit', (e) => this.handleAddDishSubmit(e));

    // Receipt Modal controls
    const closeBtn1 = document.getElementById('btn-close-receipt');
    const closeBtn2 = document.getElementById('btn-close-receipt-2');
    const printActionBtn = document.getElementById('btn-print-receipt-action');
    const printKotBtn = document.getElementById('btn-print-kot-action');

    if (closeBtn1) closeBtn1.addEventListener('click', () => this.hideReceiptModal());
    if (closeBtn2) closeBtn2.addEventListener('click', () => this.hideReceiptModal());
    if (printActionBtn) printActionBtn.addEventListener('click', () => this.triggerReceiptPrint());
    if (printKotBtn) printKotBtn.addEventListener('click', () => this.triggerKotPrint());
  },

  showAddDishModal() {
    const modal = document.getElementById('add-dish-modal');
    if (modal) modal.classList.remove('hidden');
  },

  hideAddDishModal() {
    const modal = document.getElementById('add-dish-modal');
    if (modal) modal.classList.add('hidden');
    const form = document.getElementById('add-dish-form');
    if (form) form.reset();
  },

  async handleAddDishSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('dish-name').value.trim();
    const category_id = Number(document.getElementById('dish-category').value);
    const price_quarter = Number(document.getElementById('dish-price-qtr').value || 0);
    const price_half = Number(document.getElementById('dish-price-half').value || 0);
    const price_full = Number(document.getElementById('dish-price-full').value || 0);

    if (!name || price_full <= 0) {
      alert('Please enter dish name and at least full price.');
      return;
    }

    const payload = { category_id, name, price_quarter, price_half, price_full };
    try {
      const res = await window.api.saveMenuItem(payload);
      if (res.success) {
        this.hideAddDishModal();
        await this.initCatalog();
        if (window.Tokens && window.Tokens.initCatalog) {
          window.Tokens.initCatalog();
        }
      }
    } catch (err) {
      alert(`Error adding dish: ${err.message}`);
    }
  },

  refreshImportTokensDropdown() {
    const select = document.getElementById('pos-import-token-select');
    if (!select) return;

    const list = window.activeTokensList || [];
    if (list.length === 0) {
      select.innerHTML = '<option value="">No Active Tokens</option>';
      return;
    }

    select.innerHTML = '<option value="">Select Token...</option>' + list.map(t => `
      <option value="${t.tokenNumber}">Token #${t.tokenNumber} - ${t.orderType} (${t.tableNo})</option>
    `).join('');
  },

  loadTokenDataToCart(tokenData) {
    if (!tokenData || !tokenData.items) return;

    // Set Order Type
    this.orderType = tokenData.orderType;
    const typeBtns = document.querySelectorAll('.type-btn');
    const tableContainer = document.getElementById('table-select-container');
    typeBtns.forEach(btn => {
      if (btn.getAttribute('data-type') === this.orderType) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (tableContainer) {
      tableContainer.style.display = (this.orderType === 'Dine-In') ? 'flex' : 'none';
    }

    // Set Table No
    const tableSelect = document.getElementById('pos-table-select');
    if (tableSelect && tokenData.tableNo && tokenData.tableNo !== 'N/A') {
      tableSelect.value = tokenData.tableNo;
    }

    // Populate Cart
    this.cart = [];
    tokenData.items.forEach(tokenItem => {
      const menuItem = this.menuItems.find(m => m.id === tokenItem.itemId || m.name === tokenItem.name);
      let price = 0;

      if (menuItem) {
        if (tokenItem.variant === 'Quarter') price = Number(menuItem.price_quarter);
        else if (tokenItem.variant === 'Half') price = Number(menuItem.price_half);
        else price = Number(menuItem.price_full);
      } else {
        price = 100; // fallback if item ID not matched
      }

      this.cart.push({
        cartKey: `${tokenItem.itemId || 1}_${tokenItem.variant}`,
        itemId: tokenItem.itemId || 1,
        name: tokenItem.name,
        variant: tokenItem.variant,
        unit_price: price,
        quantity: tokenItem.quantity,
        total_price: price * tokenItem.quantity
      });
    });

    this.renderCart();
  },

  async initCatalog() {
    if (!window.api) return;
    try {
      const res = await window.api.getMenuItems(this.activeCategory);
      if (res.success) {
        this.menuItems = res.data;
        this.renderMenuGrid();
        this.refreshImportTokensDropdown();
      }
    } catch (err) {
      console.error('Error fetching menu items:', err);
    }
  },

  renderMenuGrid() {
    const grid = document.getElementById('pos-menu-grid');
    if (!grid) return;

    let items = this.menuItems;

    // Filter by Category
    if (this.activeCategory !== 'all') {
      items = items.filter(i => String(i.category_id) === String(this.activeCategory));
    }

    // Filter by Search Query
    if (this.searchQuery) {
      items = items.filter(i => i.name.toLowerCase().includes(this.searchQuery));
    }

    if (items.length === 0) {
      grid.innerHTML = '<div class="empty-cart-msg" style="grid-column: 1/-1;"><p>No menu items found.</p></div>';
      return;
    }

    grid.innerHTML = items.map(item => `
      <div class="menu-card">
        <div class="menu-card-header">
          <h5>${item.name}</h5>
        </div>
        <div class="portion-options">
          ${item.price_quarter > 0 ? `<button class="portion-btn" onclick="Billing.addToCart(${item.id}, 'Quarter', ${item.price_quarter})">Qtr ₹${item.price_quarter}</button>` : ''}
          ${item.price_half > 0 ? `<button class="portion-btn" onclick="Billing.addToCart(${item.id}, 'Half', ${item.price_half})">Half ₹${item.price_half}</button>` : ''}
          ${item.price_full > 0 ? `<button class="portion-btn" onclick="Billing.addToCart(${item.id}, 'Full', ${item.price_full})">Full ₹${item.price_full}</button>` : ''}
        </div>
      </div>
    `).join('');
  },

  addToCart(itemId, variant, price) {
    const item = this.menuItems.find(i => i.id === itemId);
    if (!item) return;

    const cartKey = `${itemId}_${variant}`;
    const existing = this.cart.find(c => c.cartKey === cartKey);

    if (existing) {
      existing.quantity += 1;
      existing.total_price = existing.quantity * existing.unit_price;
    } else {
      this.cart.push({
        cartKey,
        itemId: item.id,
        name: item.name,
        variant,
        unit_price: Number(price),
        quantity: 1,
        total_price: Number(price)
      });
    }

    this.renderCart();
  },

  updateQty(cartKey, delta) {
    const item = this.cart.find(c => c.cartKey === cartKey);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      this.cart = this.cart.filter(c => c.cartKey !== cartKey);
    } else {
      item.total_price = item.quantity * item.unit_price;
    }

    this.renderCart();
  },

  clearCart() {
    this.cart = [];
    this.renderCart();
  },

  renderCart() {
    const list = document.getElementById('pos-cart-list');
    if (!list) return;

    if (this.cart.length === 0) {
      list.innerHTML = `
        <li class="empty-cart-msg">
          <i class="fa-solid fa-utensils"></i>
          <p>No items added yet.<br>Click menu dishes to start billing.</p>
        </li>
      `;
      this.updateCartSummary();
      return;
    }

    list.innerHTML = this.cart.map(item => `
      <li class="cart-item">
        <div class="item-details">
          <span class="item-title">${item.name}</span>
          <span class="item-variant">${item.variant} @ ₹${item.unit_price}</span>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="Billing.updateQty('${item.cartKey}', -1)">-</button>
          <span class="item-qty">${item.quantity}</span>
          <button class="qty-btn" onclick="Billing.updateQty('${item.cartKey}', 1)">+</button>
        </div>
        <div class="item-price">₹${item.total_price.toFixed(2)}</div>
      </li>
    `).join('');

    this.updateCartSummary();
  },

  updateCartSummary() {
    const subtotal = this.cart.reduce((sum, item) => sum + item.total_price, 0);
    const tax = subtotal * 0.05; // 5% GST

    const discountInput = document.getElementById('cart-discount-input');
    const discount = discountInput ? Number(discountInput.value || 0) : 0;

    const grandTotal = Math.max(0, subtotal + tax - discount);

    document.getElementById('cart-subtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('cart-tax').textContent = `₹${tax.toFixed(2)}`;
    document.getElementById('cart-grand-total').textContent = `₹${grandTotal.toFixed(2)}`;
  },

  async handleCheckout() {
    if (this.cart.length === 0) {
      alert('Cart is empty! Please add items before printing the bill.');
      return;
    }

    const subtotal = this.cart.reduce((sum, item) => sum + item.total_price, 0);
    const tax_amount = subtotal * 0.05;
    const discountInput = document.getElementById('cart-discount-input');
    const discount_amount = discountInput ? Number(discountInput.value || 0) : 0;
    const grand_total = Math.max(0, subtotal + tax_amount - discount_amount);
    const table_no = 'N/A';

    const orderPayload = {
      order_type: this.orderType,
      table_no,
      subtotal,
      tax_amount,
      discount_amount,
      grand_total,
      payment_mode: this.paymentMode,
      items: this.cart
    };

    try {
      const res = await window.api.createOrder(orderPayload);
      if (res.success) {
        this.currentReceiptData = {
          ...res.data,
          items: [...this.cart],
          subtotal,
          tax_amount,
          discount_amount,
          grand_total,
          order_type: this.orderType,
          payment_mode: this.paymentMode
        };

        // Render printable thermal receipt dialog
        this.showReceiptModal();

        // Clear cart for next order
        this.clearCart();
        if (discountInput) discountInput.value = 0;

        // Refresh tokens and dashboard if active
        if (window.Dashboard) window.Dashboard.loadMetrics();
        if (window.Tokens) window.Tokens.loadTokens();
      }
    } catch (err) {
      alert(`Failed to complete order: ${err.message}`);
    }
  },

  showReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    const paper = document.getElementById('receipt-paper-content');
    if (!modal || !paper || !this.currentReceiptData) return;

    const data = this.currentReceiptData;
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

    const taxableAmount = Math.max(0, data.subtotal - (data.discount_amount || 0));
    const taxAmt = data.tax_amount || 0;
    const cgstAmt = (taxAmt / 2).toFixed(2);
    const sgstAmt = (taxAmt / 2).toFixed(2);
    const calculatedTotal = taxableAmount + taxAmt;
    const roundedGrandTotal = Math.round(calculatedTotal);
    const roundOff = (roundedGrandTotal - calculatedTotal).toFixed(2);

    paper.innerHTML = `
      <div style="font-family: 'Courier New', monospace; font-size: 11px; color: #000; background: #fff; padding: 12px; position: relative; text-align: left;">
        <!-- Logo SVG -->
        <div style="text-align: center; margin-bottom: 4px;">
          <svg viewBox="0 0 240 70" width="160" height="46" style="margin: 0 auto; display: block;">
            <path d="M 15 42 C 30 27, 50 47, 70 37 Q 48 32, 25 44" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="15" cy="42" r="2.5" fill="#000"/>
            <path d="M 35 36 C 43 26, 55 30, 63 37" fill="none" stroke="#000" stroke-width="1.2"/>
            <path d="M 225 42 C 210 27, 190 47, 170 37 Q 192 32, 215 44" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="225" cy="42" r="2.5" fill="#000"/>
            <path d="M 205 36 C 197 26, 185 30, 177 37" fill="none" stroke="#000" stroke-width="1.2"/>
            <path d="M 106 8 L 111 17 L 120 6 L 129 17 L 134 8 L 132 21 L 108 21 Z" fill="#000"/>
            <circle cx="106" cy="6" r="2" fill="#000"/>
            <circle cx="120" cy="4" r="2" fill="#000"/>
            <circle cx="134" cy="6" r="2" fill="#000"/>
            <ellipse cx="103" cy="27" rx="4.5" ry="7" transform="rotate(-40 103 27)" fill="#000"/>
            <path d="M 106 30 L 132 56" stroke="#000" stroke-width="3" stroke-linecap="round"/>
            <path d="M 133 22 Q 132 29 127 32 L 108 56" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>
            <path d="M 132 20 L 138 27 M 135 18 L 141 25 M 138 16 L 144 23" stroke="#000" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>

        <div style="text-align: center; font-weight: bold; font-size: 15px; text-transform: uppercase;">KISH MANDHI</div>

        <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

        <div style="text-align: center; font-weight: bold; font-size: 11px; letter-spacing: 1px;">*** TAX INVOICE ***</div>

        <div style="font-size: 10.5px; margin: 4px 0;">
          <div style="display: flex; justify-content: space-between;">
            <span>Bill No &nbsp;: ${data.order_number || 'RS-000125'}</span>
            <span>Date &nbsp;: ${formattedDate}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Time &nbsp;&nbsp;&nbsp;: ${formattedTime}</span>
          </div>
        </div>

        <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

        <div style="border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 4px 0; margin: 4px 0; font-weight: bold; display: flex; justify-content: space-between;">
          <span style="flex: 2; text-align: left;">Item</span>
          <span style="width: 35px; text-align: center;">Qty</span>
          <span style="width: 60px; text-align: right;">Rate (₹)</span>
          <span style="width: 70px; text-align: right;">Amount (₹)</span>
        </div>

        <div style="margin: 4px 0;">
          ${data.items.map(i => `
            <div style="display: flex; justify-content: space-between; font-size: 10.5px; margin: 2px 0;">
              <span style="flex: 2; text-align: left; font-weight: 500;">${i.name} (${i.variant})</span>
              <span style="width: 35px; text-align: center;">${i.quantity}</span>
              <span style="width: 60px; text-align: right;">${(i.unit_price || i.total_price / i.quantity).toFixed(2)}</span>
              <span style="width: 70px; text-align: right;">${i.total_price.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>

        <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

        <div style="font-size: 10.5px;">
          <div style="display: flex; justify-content: space-between;"><span>Subtotal</span><span>${data.subtotal.toFixed(2)}</span></div>
          ${data.discount_amount > 0 ? `
            <div style="display: flex; justify-content: space-between;"><span>Discount</span><span>-${data.discount_amount.toFixed(2)}</span></div>
          ` : ''}
          <div style="display: flex; justify-content: flex-end; margin: 3px 0;"><div style="border-top: 1px dashed #000; width: 80px;"></div></div>
          <div style="display: flex; justify-content: space-between;"><span>Taxable Amount</span><span>${taxableAmount.toFixed(2)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>CGST (2.5%)</span><span>${cgstAmt}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>SGST (2.5%)</span><span>${sgstAmt}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Round Off</span><span>${roundOff}</span></div>
        </div>

        <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

        <div style="border-top: 3px double #000; border-bottom: 3px double #000; padding: 5px 0; margin: 6px 0; display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
          <span>GRAND TOTAL</span>
          <span>₹ ${data.grand_total.toFixed(2)}</span>
        </div>

        <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

        <div style="text-align: center; margin-top: 8px;">
          <div style="font-family: Georgia, serif; font-style: italic; font-weight: bold; font-size: 14px;">
            Thank You!<br/>Visit Again.
          </div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin: 6px 0;">
            <span style="border-bottom: 1px solid #000; width: 35px; display: inline-block;"></span>
            <span style="font-size: 9px;">★</span>
            <span style="border-bottom: 1px solid #000; width: 35px; display: inline-block;"></span>
          </div>
          <div style="font-size: 9.5px;">
            Goods once sold cannot be returned.<br/>
            Please visit again.
          </div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
  },

  hideReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    if (modal) modal.classList.add('hidden');
  },

  async triggerReceiptPrint() {
    const paper = document.getElementById('receipt-paper-content');
    if (!paper || !window.api) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt Print</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; width: 280px; }
        </style>
      </head>
      <body>
        ${paper.innerHTML}
      </body>
      </html>
    `;

    await window.api.printReceipt(receiptHtml);
    this.hideReceiptModal();
  },

  async triggerKotPrint() {
    if (!this.currentReceiptData || !window.api) return;
    const data = this.currentReceiptData;
    const now = new Date().toLocaleString();

    const kotHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kitchen Order Token</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 13px; margin: 0; padding: 10px; width: 280px; color: #000; }
          .center { text-align: center; }
          .token-num { font-size: 2.2rem; font-weight: 900; margin: 5px 0; }
          .meta { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 6px; }
          .items-table { width: 100%; border-collapse: collapse; margin-top: 8px; border-top: 1px solid #000; }
          .items-table th, .items-table td { padding: 6px 0; text-align: left; font-size: 0.9rem; }
          .footer { border-top: 2px dashed #000; margin-top: 12px; padding-top: 6px; text-align: center; font-size: 0.75rem; }
        </style>
      </head>
      <body>
        <div class="center" style="border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
          <h2 style="margin:0; font-size:1.2rem;">*** KITCHEN ORDER TOKEN ***</h2>
          <p style="margin:2px 0;">KISH MANDHI</p>
          <div class="token-num">TOKEN #${data.token_number}</div>
        </div>

        <div class="meta">
          <span>TYPE: <strong>${data.order_type}</strong></span>
          <span>DATE: ${now}</span>
        </div>

        <table class="items-table">
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th>QTY & ITEM DESCRIPTION</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(i => `
              <tr>
                <td style="font-weight:bold; font-size:1.05rem; padding:4px 0;">${i.quantity}x ${i.name} (${i.variant})</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p style="margin:0; font-weight:bold;">KITCHEN COPY</p>
        </div>
      </body>
      </html>
    `;

    await window.api.printReceipt(kotHtml);
  }
};

document.addEventListener('DOMContentLoaded', () => Billing.init());
window.Billing = Billing;
