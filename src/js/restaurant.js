// Restaurant Hub & Profit/Loss Management Controller

const Restaurant = {
  activeTab: 'dishes-tab',
  dishesList: [],

  init() {
    this.bindEvents();
    this.loadData();
  },

  bindEvents() {
    const subnavBtns = document.querySelectorAll('#rest-subnav-tabs .filter-tab');
    subnavBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        subnavBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const targetTab = btn.getAttribute('data-tab');
        this.switchSubtab(targetTab);
      });
    });

    // Edit Dish Modal Controls
    const closeBtn1 = document.getElementById('btn-close-edit-dish-modal');
    const closeBtn2 = document.getElementById('btn-close-edit-dish-modal-2');
    const editForm = document.getElementById('edit-dish-form');

    if (closeBtn1) closeBtn1.addEventListener('click', () => this.hideEditDishModal());
    if (closeBtn2) closeBtn2.addEventListener('click', () => this.hideEditDishModal());
    if (editForm) editForm.addEventListener('submit', (e) => this.handleEditDishSubmit(e));

    // PnL Period Filter Buttons
    const periodBtns = document.querySelectorAll('#pnl-period-buttons .filter-tab');
    periodBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        periodBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedPeriod = btn.getAttribute('data-period');
        this.loadProfitAndLoss();
      });
    });

    // Custom Date Range Apply Button
    const applyDateBtn = document.getElementById('btn-apply-pnl-date');
    if (applyDateBtn) {
      applyDateBtn.addEventListener('click', () => {
        periodBtns.forEach(b => b.classList.remove('active'));
        this.selectedPeriod = 'custom';
        this.loadProfitAndLoss();
      });
    }
  },

  switchSubtab(tabId) {
    this.activeTab = tabId;
    const contents = document.querySelectorAll('.rest-subtab-content');
    contents.forEach(c => {
      if (c.id === tabId) {
        c.classList.remove('hidden');
        c.classList.add('active');
      } else {
        c.classList.add('hidden');
        c.classList.remove('active');
      }
    });

    if (tabId === 'dishes-tab') {
      this.loadDishesCatalog();
    } else if (tabId === 'pnl-tab') {
      this.loadProfitAndLoss();
    }
  },

  async loadData() {
    this.loadDishesCatalog();
    this.loadProfitAndLoss();
  },

  async loadDishesCatalog() {
    if (!window.api) return;
    const tbody = document.getElementById('dishes-catalog-tbody');
    if (!tbody) return;

    try {
      const catRes = await window.api.getCategories();
      const itemsRes = await window.api.getMenuItems('all');

      const categories = catRes.success ? catRes.data : [];
      this.dishesList = itemsRes.success ? itemsRes.data : [];

      if (this.dishesList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-td">No dishes added yet. Click "+ Add New Dish" to add items.</td></tr>';
        return;
      }

      tbody.innerHTML = this.dishesList.map(i => {
        const cat = categories.find(c => c.id === i.category_id);
        const catName = cat ? cat.name : 'General';

        return `
          <tr>
            <td><strong>${i.name}</strong></td>
            <td><span class="badge" style="background:rgba(229,169,60,0.15); color:#e5a93c; border:1px solid rgba(229,169,60,0.3);">${catName}</span></td>
            <td>${i.price_quarter > 0 ? `₹${Number(i.price_quarter).toFixed(2)}` : '-'}</td>
            <td>${i.price_half > 0 ? `₹${Number(i.price_half).toFixed(2)}` : '-'}</td>
            <td><strong>₹${Number(i.price_full).toFixed(2)}</strong></td>
            <td><span class="trend positive"><i class="fa-solid fa-circle-check"></i> Available</span></td>
            <td>
              <button style="background:rgba(229,169,60,0.15); border:1px solid rgba(229,169,60,0.3); color:#e5a93c; padding:4px 8px; border-radius:6px; font-weight:600; cursor:pointer; font-size:0.78rem; margin-right:4px;" onclick="Restaurant.openEditDishModal(${i.id})">
                <i class="fa-solid fa-pen-to-square"></i> Edit
              </button>
              <button style="background:rgba(231,76,60,0.15); border:1px solid rgba(231,76,60,0.3); color:#e74c3c; padding:4px 8px; border-radius:6px; font-weight:600; cursor:pointer; font-size:0.78rem;" onclick="Restaurant.deleteDish(${i.id})">
                <i class="fa-solid fa-trash-can"></i> Remove
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading dishes catalog:', err);
    }
  },

  openEditDishModal(id) {
    const item = this.dishesList.find(i => i.id === id);
    if (!item) return;

    document.getElementById('edit-dish-id').value = item.id;
    document.getElementById('edit-dish-name').value = item.name;
    document.getElementById('edit-dish-category').value = item.category_id || 1;
    document.getElementById('edit-dish-price-qtr').value = item.price_quarter || 0;
    document.getElementById('edit-dish-price-half').value = item.price_half || 0;
    document.getElementById('edit-dish-price-full').value = item.price_full || 0;

    const modal = document.getElementById('edit-dish-modal');
    if (modal) modal.classList.remove('hidden');
  },

  hideEditDishModal() {
    const modal = document.getElementById('edit-dish-modal');
    if (modal) modal.classList.add('hidden');
  },

  async handleEditDishSubmit(e) {
    e.preventDefault();
    const id = Number(document.getElementById('edit-dish-id').value);
    const name = document.getElementById('edit-dish-name').value.trim();
    const category_id = Number(document.getElementById('edit-dish-category').value);
    const price_quarter = Number(document.getElementById('edit-dish-price-qtr').value || 0);
    const price_half = Number(document.getElementById('edit-dish-price-half').value || 0);
    const price_full = Number(document.getElementById('edit-dish-price-full').value || 0);

    if (!id || !name || price_full <= 0) {
      alert('Please enter a valid dish name and full price.');
      return;
    }

    const payload = { id, category_id, name, price_quarter, price_half, price_full };
    try {
      const res = await window.api.updateMenuItem(payload);
      if (res.success) {
        this.hideEditDishModal();
        await this.loadDishesCatalog();

        if (window.Billing && window.Billing.initCatalog) {
          window.Billing.initCatalog();
        }
        if (window.Tokens && window.Tokens.initCatalog) {
          window.Tokens.initCatalog();
        }
      }
    } catch (err) {
      alert(`Error updating dish: ${err.message}`);
    }
  },

  async deleteDish(id) {
    if (!confirm('Are you sure you want to remove this dish from the menu catalog?')) return;
    if (!window.api) return;

    try {
      const res = await window.api.deleteMenuItem(id);
      if (res.success) {
        this.loadDishesCatalog();
        if (window.Billing && window.Billing.initCatalog) {
          window.Billing.initCatalog();
        }
        if (window.Tokens && window.Tokens.initCatalog) {
          window.Tokens.initCatalog();
        }
      }
    } catch (err) {
      alert(`Error deleting dish: ${err.message}`);
    }
  },

  async loadProfitAndLoss() {
    if (!window.api) return;
    try {
      const ordersRes = await window.api.getOrders();
      const expRes = await window.api.getExpenses();

      const orders = ordersRes.success ? ordersRes.data : [];
      const expenses = expRes.success ? expRes.data : [];

      const filteredOrders = this.filterByPeriod(orders, 'created_at');
      const filteredExpenses = this.filterByPeriod(expenses, 'expense_date');

      const totalRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.grand_total || 0), 0);
      const totalExpenseSum = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const netProfit = totalRevenue - totalExpenseSum;
      const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

      document.getElementById('pnl-gross-revenue').textContent = `₹${Number(totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      document.getElementById('pnl-total-expenses').textContent = `₹${Number(totalExpenseSum).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      document.getElementById('pnl-net-profit').textContent = `₹${Number(netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      document.getElementById('pnl-profit-margin').textContent = `${margin}%`;

      // Render PnL Breakdown Table
      this.renderPnLBreakdown(totalRevenue, totalExpenseSum, netProfit);
    } catch (err) {
      console.error('Error loading PnL stats:', err);
    }
  },

  toLocalDateString(val) {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val).split('T')[0];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  filterByPeriod(items, dateKey) {
    const period = this.selectedPeriod || 'today';
    const todayStr = this.toLocalDateString(new Date());

    if (period === 'all') return items;

    if (period === 'today') {
      return items.filter(item => {
        if (!item[dateKey]) return true;
        return this.toLocalDateString(item[dateKey]) === todayStr;
      });
    }

    if (period === 'week') {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      return items.filter(item => {
        if (!item[dateKey]) return true;
        const d = new Date(item[dateKey]);
        return d >= sevenDaysAgo;
      });
    }

    if (period === 'month') {
      const currentMonth = todayStr.substring(0, 7); // YYYY-MM
      return items.filter(item => {
        if (!item[dateKey]) return true;
        return this.toLocalDateString(item[dateKey]).substring(0, 7) === currentMonth;
      });
    }

    if (period === 'year') {
      const currentYear = todayStr.substring(0, 4); // YYYY
      return items.filter(item => {
        if (!item[dateKey]) return true;
        return this.toLocalDateString(item[dateKey]).substring(0, 4) === currentYear;
      });
    }

    if (period === 'custom') {
      const start = document.getElementById('pnl-start-date')?.value;
      const end = document.getElementById('pnl-end-date')?.value;
      if (!start && !end) return items;

      return items.filter(item => {
        if (!item[dateKey]) return true;
        const dateStr = this.toLocalDateString(item[dateKey]);
        if (start && dateStr < start) return false;
        if (end && dateStr > end) return false;
        return true;
      });
    }

    return items;
  },

  renderPnLBreakdown(sales, expenses, net) {
    const tbody = document.getElementById('pnl-breakdown-tbody');
    if (!tbody) return;

    const totalVolume = sales + expenses;
    const salesShare = totalVolume > 0 ? ((sales / totalVolume) * 100).toFixed(1) : 0;
    const expShare = totalVolume > 0 ? ((expenses / totalVolume) * 100).toFixed(1) : 0;

    tbody.innerHTML = `
      <tr>
        <td><strong>Gross Food & Beverage Revenue</strong></td>
        <td><span class="trend positive">Income</span></td>
        <td><strong style="color:var(--accent-green);">₹${Number(sales).toFixed(2)}</strong></td>
        <td>${salesShare}%</td>
      </tr>
      <tr>
        <td><strong>Total Raw Material & Operational Expenses</strong></td>
        <td><span class="trend negative">Expense</span></td>
        <td><strong style="color:var(--accent-red);">₹${Number(expenses).toFixed(2)}</strong></td>
        <td>${expShare}%</td>
      </tr>
      <tr style="background:var(--bg-card); font-size:0.95rem;">
        <td><strong>NET OPERATING PROFIT / (LOSS)</strong></td>
        <td><span class="badge" style="background:rgba(46,204,113,0.2); color:#2ecc71;">Net Earnings</span></td>
        <td><strong style="color:var(--primary-gold); font-size:1.1rem;">₹${Number(net).toFixed(2)}</strong></td>
        <td><strong>100%</strong></td>
      </tr>
    `;
  }
};

document.addEventListener('DOMContentLoaded', () => Restaurant.init());
window.Restaurant = Restaurant;
