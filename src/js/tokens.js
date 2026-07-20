// Token Order & Receipt Printer Controller (No Prices / Pure Token Generator)

const Tokens = {
  menuItems: [],
  cart: [],
  activeCategory: 'all',
  searchQuery: '',
  orderType: 'Dine-In',

  init() {
    this.bindEvents();
    this.initCatalog();
  },

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('token-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.renderMenuGrid();
      });
    }

    // Category Tabs
    const catTabs = document.querySelectorAll('#token-category-tabs .cat-tab');
    catTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        catTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeCategory = tab.getAttribute('data-cat');
        this.renderMenuGrid();
      });
    });

    // Order Type toggle (Dine-In vs Takeaway)
    const typeBtns = document.querySelectorAll('.token-type-btn');
    const tableContainer = document.getElementById('token-table-select-container');
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

    // Clear Cart
    const clearBtn = document.getElementById('btn-clear-token-cart');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearCart());
    }

    // Print Token Direct Button (Opens Modal Preview)
    const printBtn = document.getElementById('btn-print-token-direct');
    if (printBtn) {
      printBtn.addEventListener('click', () => this.showTokenPreviewModal());
    }

    // Modal controls
    const closeBtn1 = document.getElementById('btn-close-token-modal');
    const closeBtn2 = document.getElementById('btn-close-token-modal-2');
    const actionPrintBtn = document.getElementById('btn-print-token-action');
    const sendToBillingBtn = document.getElementById('btn-send-token-to-billing');

    if (closeBtn1) closeBtn1.addEventListener('click', () => this.hideTokenModal());
    if (closeBtn2) closeBtn2.addEventListener('click', () => this.hideTokenModal());
    if (actionPrintBtn) actionPrintBtn.addEventListener('click', () => this.triggerPrintToken());
    if (sendToBillingBtn) sendToBillingBtn.addEventListener('click', () => this.sendCurrentTokenToBilling());
  },

  async initCatalog() {
    if (!window.api) return;
    try {
      const res = await window.api.getMenuItems(this.activeCategory);
      if (res.success) {
        this.menuItems = res.data;
        this.renderMenuGrid();
      }
    } catch (err) {
      console.error('Error fetching token menu items:', err);
    }
  },

  renderMenuGrid() {
    const grid = document.getElementById('token-menu-grid');
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

    // Notice: NO PRICES ARE SHOWN on portion buttons for tokens!
    grid.innerHTML = items.map(item => `
      <div class="menu-card">
        <div class="menu-card-header">
          <h5>${item.name}</h5>
        </div>
        <div class="portion-options">
          ${item.price_quarter > 0 ? `<button class="portion-btn" onclick="Tokens.addToCart(${item.id}, 'Quarter')">Quarter</button>` : ''}
          ${item.price_half > 0 ? `<button class="portion-btn" onclick="Tokens.addToCart(${item.id}, 'Half')">Half</button>` : ''}
          ${item.price_full > 0 ? `<button class="portion-btn" onclick="Tokens.addToCart(${item.id}, 'Full')">Full</button>` : ''}
        </div>
      </div>
    `).join('');
  },

  addToCart(itemId, variant) {
    const item = this.menuItems.find(i => i.id === itemId);
    if (!item) return;

    const cartKey = `${itemId}_${variant}`;
    const existing = this.cart.find(c => c.cartKey === cartKey);

    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({
        cartKey,
        itemId: item.id,
        name: item.name,
        variant,
        quantity: 1
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
    }

    this.renderCart();
  },

  clearCart() {
    this.cart = [];
    this.renderCart();
  },

  renderCart() {
    const list = document.getElementById('token-cart-list');
    const totalQtyEl = document.getElementById('token-total-items-qty');
    if (!list) return;

    const totalQty = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQtyEl) totalQtyEl.textContent = `${totalQty} Pcs`;

    if (this.cart.length === 0) {
      list.innerHTML = `
        <li class="empty-cart-msg">
          <i class="fa-solid fa-ticket"></i>
          <p>No items added.<br>Click menu dishes to build token.</p>
        </li>
      `;
      return;
    }

    // Render Cart Items (Strictly NO PRICES displayed)
    list.innerHTML = this.cart.map(item => `
      <li class="cart-item">
        <div class="item-details">
          <span class="item-title">${item.name}</span>
          <span class="item-variant">${item.variant} Portion</span>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="Tokens.updateQty('${item.cartKey}', -1)">-</button>
          <span class="item-qty">${item.quantity}</span>
          <button class="qty-btn" onclick="Tokens.updateQty('${item.cartKey}', 1)">+</button>
        </div>
      </li>
    `).join('');
  },

  showTokenPreviewModal() {
    if (this.cart.length === 0) {
      alert('Token is empty! Please select dishes before previewing.');
      return;
    }

    const modal = document.getElementById('token-modal');
    const paper = document.getElementById('token-paper-content');
    if (!modal || !paper) return;

    const tokenNumber = Math.floor(100 + Math.random() * 900);
    const now = new Date().toLocaleString();

    window.activeTokensList = window.activeTokensList || [];
    this.currentTokenData = {
      tokenNumber,
      orderType: this.orderType,
      items: JSON.parse(JSON.stringify(this.cart)),
      timestamp: now
    };

    // Add to active tokens list for import in Billing section
    window.activeTokensList.unshift(this.currentTokenData);
    if (window.Billing && window.Billing.refreshImportTokensDropdown) {
      window.Billing.refreshImportTokensDropdown();
    }

    this.currentHtml = `
      <div style="text-align:center; border-bottom:2px dashed #000; padding-bottom:8px; margin-bottom:8px;">
        <h2 style="margin:0; font-size:1.3rem;">KISH MANDHI</h2>
        <p style="margin:2px 0; font-weight:bold;">ORDER TOKEN</p>
        <div style="font-size:2.2rem; font-weight:900; margin:5px 0; color:#d35400;">TOKEN #${tokenNumber}</div>
      </div>

      <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:6px;">
        <span>ORDER TYPE: <strong>${this.orderType}</strong></span>
        <span>DATE & TIME: ${now}</span>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-top:8px; border-top:1px solid #000; font-size:0.95rem;">
        <thead>
          <tr style="border-bottom:1px solid #000;">
            <th style="text-align:left; padding:4px 0;">QTY & ITEM DESCRIPTION</th>
          </tr>
        </thead>
        <tbody>
          ${this.cart.map(item => `
            <tr>
              <td style="font-weight:bold; padding:5px 0; text-align:left;">• ${item.quantity}x ${item.name} (${item.variant})</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="border-top:2px dashed #000; margin-top:14px; padding-top:6px; text-align:center; font-size:0.75rem;">
        <p style="margin:0; font-weight:bold;">KITCHEN / COUNTER TOKEN COPY</p>
        <p style="margin:2px 0; color:#666;">NON-BILLING TOKEN SLIP</p>
      </div>
    `;

    paper.innerHTML = this.currentHtml;
    modal.classList.remove('hidden');
  },

  hideTokenModal() {
    const modal = document.getElementById('token-modal');
    if (modal) modal.classList.add('hidden');
  },

  sendCurrentTokenToBilling() {
    if (!this.currentTokenData) return;
    this.hideTokenModal();

    if (window.Billing && window.Billing.loadTokenDataToCart) {
      window.Billing.loadTokenDataToCart(this.currentTokenData);
    }
    if (window.switchSection) {
      window.switchSection('billing-section');
    }
    this.clearCart();
  },

  async triggerPrintToken() {
    if (!this.currentHtml || !window.api) return;

    const fullPrintHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Token Receipt</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 13px; margin: 0; padding: 10px; width: 280px; color: #000; }
        </style>
      </head>
      <body>
        ${this.currentHtml}
      </body>
      </html>
    `;

    await window.api.printReceipt(fullPrintHtml);
    this.hideTokenModal();
    this.clearCart();
  }
};

document.addEventListener('DOMContentLoaded', () => Tokens.init());
window.Tokens = Tokens;
