/**
 * Kish Mandhi — Owner Mobile Companion App Engine (Professional UI Edition)
 * Zero-Trust Credential Authentication & Remote Cloud Database Viewer
 * 
 * NOTE: All backend connections, API endpoints, and data logic are preserved
 * exactly as in the original implementation. Only UI rendering has been upgraded.
 */

class MobileApp {
  constructor() {
    this.dbConfig = null;
    this.currentTab = 'db-connect';
    this.restaurantSubTab = 'pnl';
    this.pnlPeriod = 'today';
    this.isLoading = false;
    this.liveData = {
      orders: [],
      expenses: [],
      tokens: [],
      categories: [],
      menuItems: []
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSavedDbConfig();
  }

  bindEvents() {
    // Tab Switching
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Toggle Password Visibility (DB)
    const togglePassBtn = document.getElementById('toggle-pass');
    if (togglePassBtn) {
      togglePassBtn.addEventListener('click', () => {
        const input = document.getElementById('db-pass');
        const icon = togglePassBtn.querySelector('i');
        if (input.type === 'password') {
          input.type = 'text';
          icon.className = 'fa-solid fa-eye-slash';
        } else {
          input.type = 'password';
          icon.className = 'fa-solid fa-eye';
        }
      });
    }

    // Connect DB Form Submit
    const connectForm = document.getElementById('db-connect-form');
    if (connectForm) {
      connectForm.addEventListener('submit', (e) => this.handleConnectDb(e));
    }

    // Account Login Form Submit
    const accountLoginForm = document.getElementById('account-login-form');
    if (accountLoginForm) {
      accountLoginForm.addEventListener('submit', (e) => this.handleAccountLogin(e));
    }

    // Refresh Button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.querySelector('i').classList.add('fa-spin');
        this.fetchLiveData().then(() => {
          setTimeout(() => refreshBtn.querySelector('i').classList.remove('fa-spin'), 700);
        });
      });
    }

    // DB Settings Icon Header
    const dbSettingsBtn = document.getElementById('db-settings-btn');
    if (dbSettingsBtn) {
      dbSettingsBtn.addEventListener('click', () => this.switchTab('db-connect'));
    }

    // Bill Search Input
    const searchInput = document.getElementById('bills-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.renderBillsList());
    }

    // Close Modal Button
    const closeModalBtn = document.getElementById('close-bill-modal');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        document.getElementById('bill-detail-modal').classList.add('hidden');
      });
    }

    // Close modal on overlay click
    const modalOverlay = document.getElementById('bill-detail-modal');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          modalOverlay.classList.add('hidden');
        }
      });
    }
  }

  clearSavedSession() {
    localStorage.removeItem('km_mobile_db_config');
    localStorage.removeItem('km_mobile_user_session');
    this.dbConfig = null;

    const hostInput = document.getElementById('db-host');
    const portInput = document.getElementById('db-port');
    const userInput = document.getElementById('db-user');
    const passInput = document.getElementById('db-pass');
    const nameInput = document.getElementById('db-name');
    const loginUserInput = document.getElementById('user-email-phone');
    const loginPassInput = document.getElementById('user-password');

    if (hostInput) hostInput.value = '';
    if (portInput) portInput.value = '';
    if (userInput) userInput.value = '';
    if (passInput) passInput.value = '';
    if (nameInput) nameInput.value = '';
    if (loginUserInput) loginUserInput.value = '';
    if (loginPassInput) loginPassInput.value = '';

    const connectErr = document.getElementById('connect-error-msg');
    const loginErr = document.getElementById('account-login-error');
    if (connectErr) connectErr.classList.add('hidden');
    if (loginErr) loginErr.classList.add('hidden');

    this.switchTab('db-connect');
    this.switchAuthTab('database');
  }

  loadSavedDbConfig() {
    try {
      const saved = localStorage.getItem('km_mobile_db_config');
      if (saved) {
        this.dbConfig = JSON.parse(saved);
        document.getElementById('db-host').value = this.dbConfig.host || '';
        document.getElementById('db-port').value = this.dbConfig.port || '';
        document.getElementById('db-user').value = this.dbConfig.user || '';
        document.getElementById('db-pass').value = this.dbConfig.password || '';
        document.getElementById('db-name').value = this.dbConfig.database || '';
        if (this.dbConfig.ssl !== undefined) {
          document.getElementById('db-ssl').checked = !!this.dbConfig.ssl;
        }

        const noticeText = document.getElementById('db-notice-text');
        if (noticeText) {
          noticeText.textContent = `Database connected (${this.dbConfig.database || 'Cloud DB'}). Enter account login details below.`;
        }

        const session = localStorage.getItem('km_mobile_user_session');
        if (session) {
          this.switchTab('dashboard');
          this.fetchLiveData();
        } else {
          this.switchTab('db-connect');
          this.switchAuthTab('account');
        }
      } else {
        this.switchTab('db-connect');
        this.switchAuthTab('database');
      }
    } catch (e) {
      console.error('Failed to load saved db config:', e);
      this.switchTab('db-connect');
      this.switchAuthTab('database');
    }
  }

  async handleConnectDb(e) {
    e.preventDefault();
    const errorBanner = document.getElementById('connect-error-msg');
    const connectBtn = document.getElementById('connect-db-btn');
    const btnText = connectBtn?.querySelector('.btn-text');
    const btnLoader = connectBtn?.querySelector('.btn-loader');

    if (errorBanner) errorBanner.classList.add('hidden');
    if (connectBtn) connectBtn.disabled = true;
    if (btnText) btnText.classList.add('hidden');
    if (btnLoader) btnLoader.classList.remove('hidden');

    const host = document.getElementById('db-host').value.trim();
    const port = document.getElementById('db-port').value.trim();
    const user = document.getElementById('db-user').value.trim();
    const password = document.getElementById('db-pass').value.trim();
    const database = document.getElementById('db-name').value.trim();
    const ssl = document.getElementById('db-ssl').checked;

    if (!host || !port || !user || !database) {
      if (errorBanner) {
        errorBanner.textContent = 'Please fill in all database fields (Host, Port, User, Database Name).';
        errorBanner.classList.remove('hidden');
      }
      if (connectBtn) connectBtn.disabled = false;
      if (btnText) btnText.classList.remove('hidden');
      if (btnLoader) btnLoader.classList.add('hidden');
      return;
    }

    const config = { host, port, user, password, database, ssl };

    try {
      const result = await this.testConnection(config);
      if (result.success) {
        this.dbConfig = config;
        localStorage.setItem('km_mobile_db_config', JSON.stringify(config));

        if (btnText) {
          btnText.innerHTML = '<i class="fa-solid fa-circle-check"></i> Database Connected!';
          btnText.classList.remove('hidden');
        }
        if (btnLoader) btnLoader.classList.add('hidden');

        const noticeText = document.getElementById('db-notice-text');
        if (noticeText) {
          noticeText.textContent = `Database connected (${database} @ ${host}). Enter account login details below.`;
        }

        setTimeout(() => {
          if (connectBtn) {
            connectBtn.disabled = false;
            if (btnText) btnText.innerHTML = '<i class="fa-solid fa-link"></i> Save & Connect Database (Step 1)';
          }
          // Proceed to Step 2 Account Sign In
          this.switchAuthTab('account');
        }, 600);
      } else {
        if (errorBanner) {
          errorBanner.textContent = result.message || 'Connection failed. Please check database credentials.';
          errorBanner.classList.remove('hidden');
        }
        if (connectBtn) connectBtn.disabled = false;
        if (btnText) btnText.classList.remove('hidden');
        if (btnLoader) btnLoader.classList.add('hidden');
      }
    } catch (err) {
      if (errorBanner) {
        errorBanner.textContent = 'Connection Error: ' + err.message;
        errorBanner.classList.remove('hidden');
      }
      if (connectBtn) connectBtn.disabled = false;
      if (btnText) btnText.classList.remove('hidden');
      if (btnLoader) btnLoader.classList.add('hidden');
    }
  }

  switchAuthTab(type) {
    const tabAccount = document.getElementById('login-tab-account');
    const tabDb = document.getElementById('login-tab-database');
    const formAccount = document.getElementById('account-login-form');
    const formDb = document.getElementById('db-connect-form');

    if (tabAccount) {
      tabAccount.classList.toggle('active', type === 'account');
      tabAccount.setAttribute('aria-selected', type === 'account');
    }
    if (tabDb) {
      tabDb.classList.toggle('active', type === 'database');
      tabDb.setAttribute('aria-selected', type === 'database');
    }
    if (formAccount) formAccount.classList.toggle('hidden', type !== 'account');
    if (formDb) formDb.classList.toggle('hidden', type !== 'database');
  }

  toggleUserPassVisibility() {
    const passInput = document.getElementById('user-password');
    const eyeIcon = document.getElementById('user-pass-eye');
    if (passInput) {
      if (passInput.type === 'password') {
        passInput.type = 'text';
        if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye-slash';
      } else {
        passInput.type = 'password';
        if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye';
      }
    }
  }

  async handleAccountLogin(e) {
    e.preventDefault();
    const errBanner = document.getElementById('account-login-error');
    const loginBtn = document.getElementById('account-login-btn');
    const btnText = loginBtn?.querySelector('.btn-text');
    const btnLoader = loginBtn?.querySelector('.btn-loader');
    const emailOrPhone = document.getElementById('user-email-phone').value.trim();
    const password = document.getElementById('user-password').value.trim();

    if (errBanner) errBanner.classList.add('hidden');

    if (!this.dbConfig || !this.dbConfig.host || !this.dbConfig.user || !this.dbConfig.database) {
      if (errBanner) {
        errBanner.textContent = 'Please complete Step 1: Database connection first before signing in.';
        errBanner.classList.remove('hidden');
      }
      this.switchAuthTab('database');
      return;
    }

    if (loginBtn) {
      loginBtn.disabled = true;
      if (btnText) btnText.classList.add('hidden');
      if (btnLoader) btnLoader.classList.remove('hidden');
    }

    try {
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001/api/login'
        : '/api/login';

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DB-Host': this.dbConfig.host,
          'X-DB-Port': String(this.dbConfig.port),
          'X-DB-User': this.dbConfig.user,
          'X-DB-Pass': this.dbConfig.password || '',
          'X-DB-Name': this.dbConfig.database
        },
        body: JSON.stringify({ emailOrPhone, password })
      });
      const data = await res.json();

      if (data && data.success) {
        localStorage.setItem('km_mobile_user_session', JSON.stringify(data.user || { name: emailOrPhone }));
        if (btnText) {
          btnText.innerHTML = '<i class="fa-solid fa-circle-check"></i> Sign In Successful!';
          btnText.classList.remove('hidden');
        }
        if (btnLoader) btnLoader.classList.add('hidden');

        setTimeout(() => {
          if (loginBtn) {
            loginBtn.disabled = false;
            if (btnText) btnText.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to Dashboard (Step 2)';
          }
          this.switchTab('dashboard');
          this.fetchLiveData();
        }, 500);
      } else {
        if (errBanner) {
          errBanner.textContent = data.message || 'Invalid Username/Email/Phone or Password in connected database.';
          errBanner.classList.remove('hidden');
        }
        if (loginBtn) {
          loginBtn.disabled = false;
          if (btnText) btnText.classList.remove('hidden');
          if (btnLoader) btnLoader.classList.add('hidden');
        }
      }
    } catch (err) {
      if (errBanner) {
        errBanner.textContent = 'Authentication Error: ' + err.message;
        errBanner.classList.remove('hidden');
      }
      if (loginBtn) {
        loginBtn.disabled = false;
        if (btnText) btnText.classList.remove('hidden');
        if (btnLoader) btnLoader.classList.add('hidden');
      }
    }
  }

  async testConnection(config) {
    if (!config.host || !config.port || !config.user || !config.database) {
      return { success: false, message: 'Please enter all database credentials.' };
    }

    try {
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001/api/test'
        : '/api/test';

      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-DB-Host': config.host,
          'X-DB-Port': String(config.port),
          'X-DB-User': config.user,
          'X-DB-Pass': config.password || '',
          'X-DB-Name': config.database
        }
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, message: 'Could not connect to database bridge server: ' + err.message };
    }
  }

  switchTab(tabId) {
    this.currentTab = tabId;

    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    document.querySelectorAll('.view-section').forEach((sec) => {
      sec.classList.add('hidden');
    });

    const target = document.getElementById(`view-${tabId}`);
    if (target) {
      target.classList.remove('hidden');
    }

    if (tabId !== 'db-connect' && this.dbConfig) {
      this.fetchLiveData();
    }
  }

  switchRestaurantSubTab(subTabId) {
    this.restaurantSubTab = subTabId;

    document.querySelectorAll('.sub-tab-btn').forEach((btn) => {
      btn.classList.remove('active');
    });
    const activeSubBtn = document.getElementById(`subtab-${subTabId}`);
    if (activeSubBtn) activeSubBtn.classList.add('active');

    document.querySelectorAll('.rest-subview').forEach((vw) => {
      vw.classList.add('hidden');
    });
    const targetVw = document.getElementById(`rest-content-${subTabId}`);
    if (targetVw) targetVw.classList.remove('hidden');

    if (subTabId === 'pnl') this.renderPnL();
    else if (subTabId === 'dishes') this.renderDishes();
    else if (subTabId === 'categories') this.renderCategories();
  }

  switchBillsSubTab(subTabId) {
    const btnAll = document.getElementById('bills-subtab-all');
    const btnTokens = document.getElementById('bills-subtab-tokens');
    const contentAll = document.getElementById('bills-content-all');
    const contentTokens = document.getElementById('bills-content-tokens');

    if (btnAll) btnAll.classList.toggle('active', subTabId === 'all');
    if (btnTokens) btnTokens.classList.toggle('active', subTabId === 'tokens');
    if (contentAll) contentAll.classList.toggle('hidden', subTabId !== 'all');
    if (contentTokens) contentTokens.classList.toggle('hidden', subTabId !== 'tokens');

    if (subTabId === 'all') this.renderBillsList();
    else if (subTabId === 'tokens') this.renderTokensList();
  }

  setPnlPeriod(period) {
    this.pnlPeriod = period;
    document.querySelectorAll('.period-chip').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });
    this.renderPnL();
  }

  async fetchLiveData() {
    if (!this.dbConfig) return;

    const statusSubtitle = document.getElementById('header-status-subtitle');
    const connectedHost = document.getElementById('db-connected-host');
    const storageBadge = document.getElementById('db-storage-size');

    if (statusSubtitle) {
      statusSubtitle.innerHTML = `<span class="status-dot"></span> ${this.dbConfig.database || 'kish_mandhi'}`;
    }
    if (connectedHost) {
      const hostStr = this.dbConfig.host;
      connectedHost.textContent = hostStr.length > 24 ? hostStr.slice(0, 24) + '...' : hostStr;
    }

    try {
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001/api/live-data'
        : '/api/live-data';

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-DB-Host': this.dbConfig.host,
          'X-DB-Port': String(this.dbConfig.port),
          'X-DB-User': this.dbConfig.user,
          'X-DB-Pass': this.dbConfig.password || '',
          'X-DB-Name': this.dbConfig.database
        }
      });
      const res = await response.json();
      if (res && res.success && res.data) {
        this.liveData.orders = res.data.orders || [];
        this.liveData.expenses = res.data.expenses || [];
        this.liveData.tokens = res.data.tokens || [];
        if (res.data.categories && res.data.categories.length > 0) this.liveData.categories = res.data.categories;
        if (res.data.menuItems && res.data.menuItems.length > 0) this.liveData.menuItems = res.data.menuItems;

        if (storageBadge && res.data.storage) {
          storageBadge.textContent = res.data.storage;
        }
      }
    } catch (e) {
      console.warn('Could not fetch remote API live data, showing active state:', e);
    }

    this.renderDashboard();
    this.renderBillsList();
    this.renderTokensList();
    this.renderExpensesList();
    if (this.currentTab === 'restaurant') {
      this.switchRestaurantSubTab(this.restaurantSubTab);
    }
  }

  getLocalDayString(val) {
    if (!val) return '';
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    if (typeof val === 'string' && val.length >= 10) return val.slice(0, 10);
    return '';
  }

  isSameDay(dateVal, targetDayStr) {
    if (!dateVal) return false;
    const localDay = this.getLocalDayString(dateVal);
    if (localDay === targetDayStr) return true;
    const str = String(dateVal);
    return str.startsWith(targetDayStr);
  }

  renderDashboard() {
    const todayStr = this.getLocalDayString(new Date());

    const todayOrders = this.liveData.orders.filter(o =>
      this.isSameDay(o.created_at, todayStr) || this.isSameDay(o.orderDate, todayStr) || this.isSameDay(o.dateStr, todayStr)
    );
    const todayExpenses = (this.liveData.expenses || []).filter(e =>
      this.isSameDay(e.expense_date || e.expenseDate || e.created_at, todayStr)
    );

    const totalRevenue = todayOrders.reduce((sum, o) => sum + Number(o.grand_total || o.grandTotal || 0), 0);
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;

    todayOrders.forEach((o) => {
      const mode = (o.payment_mode || o.paymentMode || 'Cash').toLowerCase();
      const amt = Number(o.grand_total || o.grandTotal || 0);
      if (mode.includes('cash')) cashTotal += amt;
      else if (mode.includes('upi') || mode.includes('gpay')) upiTotal += amt;
      else if (mode.includes('card')) cardTotal += amt;
      else cashTotal += amt;
    });

    const maxVal = Math.max(totalRevenue, totalExpenses, Math.abs(netProfit), 1);

    document.getElementById('dash-today-revenue').textContent = `₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('dash-today-expenses').textContent = `₹${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('dash-net-profit').textContent = `₹${netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('dash-orders-count').textContent = todayOrders.length;

    // Animate KPI bars
    const revBar = document.querySelector('.kpi-revenue .kpi-bar-fill');
    const expBar = document.querySelector('.kpi-expense .kpi-bar-fill');
    const profBar = document.querySelector('.kpi-profit .kpi-bar-fill');
    const ordBar = document.querySelector('.kpi-orders .kpi-bar-fill');

    if (revBar) revBar.style.width = `${Math.min((totalRevenue / maxVal) * 100, 100)}%`;
    if (expBar) expBar.style.width = `${Math.min((totalExpenses / maxVal) * 100, 100)}%`;
    if (profBar) profBar.style.width = `${Math.min((Math.abs(netProfit) / maxVal) * 100, 100)}%`;
    if (ordBar) ordBar.style.width = `${Math.min((todayOrders.length / Math.max(todayOrders.length, 10)) * 100, 100)}%`;

    document.getElementById('pm-cash').textContent = `₹${cashTotal.toLocaleString('en-IN')}`;
    document.getElementById('pm-upi').textContent = `₹${upiTotal.toLocaleString('en-IN')}`;
    document.getElementById('pm-card').textContent = `₹${cardTotal.toLocaleString('en-IN')}`;

    const feedContainer = document.getElementById('dash-recent-bills-list');
    if (feedContainer) {
      if (this.liveData.orders.length === 0) {
        feedContainer.innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-receipt"></i>
            <p>No bills generated today yet</p>
          </div>`;
      } else {
        feedContainer.innerHTML = this.liveData.orders.slice(0, 5).map(o => {
          const mode = (o.payment_mode || 'Cash').toLowerCase();
          let iconClass = 'fa-money-bill-wave';
          let iconColor = 'emerald';
          if (mode.includes('upi') || mode.includes('gpay')) { iconClass = 'fa-qrcode'; iconColor = 'purple'; }
          else if (mode.includes('card')) { iconClass = 'fa-credit-card'; iconColor = 'amber'; }

          return `
          <div class="feed-item" onclick="app.showBillDetails('${o.order_number || o.id}')">
            <div class="feed-item-left">
              <div class="feed-icon ${iconColor}"><i class="fa-solid ${iconClass}"></i></div>
              <div class="feed-meta-wrap">
                <div class="feed-title">${o.order_number || 'KMIV-001'}</div>
                <div class="feed-subtitle">${o.order_type || 'Dine-In'}<span class="dot"></span>${o.payment_mode || 'Cash'}</div>
              </div>
            </div>
            <div class="feed-amount text-emerald">₹${Number(o.grand_total || 0).toFixed(2)}</div>
          </div>`;
        }).join('');
      }
    }
  }

  getPeriodDateRange(period) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (period === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (period === 'week') {
      const sevenDaysAgo = new Date(year, month, day - 7);
      const sY = sevenDaysAgo.getFullYear();
      const sM = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
      const sD = String(sevenDaysAgo.getDate()).padStart(2, '0');
      return { start: `${sY}-${sM}-${sD}`, end: todayStr };
    }
    if (period === 'month') {
      const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDayObj = new Date(year, month + 1, 0);
      const lD = String(lastDayObj.getDate()).padStart(2, '0');
      return { start: firstDay, end: `${year}-${String(month + 1).padStart(2, '0')}-${lD}` };
    }
    if (period === 'year') {
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    }
    return { start: '1970-01-01', end: todayStr };
  }

  renderPnL() {
    const incProfit = document.getElementById('pnl-flt-profit')?.checked ?? true;
    const incExpense = document.getElementById('pnl-flt-expense')?.checked ?? true;
    const incUpi = document.getElementById('pnl-flt-upi')?.checked ?? true;
    const incCash = document.getElementById('pnl-flt-cash')?.checked ?? true;
    const incCard = document.getElementById('pnl-flt-card')?.checked ?? true;

    const range = this.getPeriodDateRange(this.pnlPeriod);

    let filteredOrders = this.liveData.orders.filter(o => {
      const dStr = this.getLocalDayString(o.created_at || o.orderDate || o.expense_date);
      if (!dStr) return false;
      return dStr >= range.start && dStr <= range.end;
    });

    let filteredExpenses = this.liveData.expenses.filter(e => {
      const dStr = this.getLocalDayString(e.expense_date || e.created_at);
      if (!dStr) return false;
      return dStr >= range.start && dStr <= range.end;
    });

    const totalOrdersCount = filteredOrders.length;
    const totalExpensesCount = filteredExpenses.length;

    filteredOrders = filteredOrders.filter(o => {
      const mode = (o.payment_mode || o.paymentMode || 'Cash').toLowerCase();
      if (mode.includes('upi') && !incUpi) return false;
      if (mode.includes('cash') && !incCash) return false;
      if (mode.includes('card') && !incCard) return false;
      return true;
    });

    const grossRevenue = incProfit ? filteredOrders.reduce((s, o) => s + Number(o.grand_total || o.grandTotal || 0), 0) : 0;
    const totalExpenses = incExpense ? filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0) : 0;
    const netProfit = grossRevenue - totalExpenses;
    const profitMargin = grossRevenue > 0 ? ((netProfit / grossRevenue) * 100).toFixed(1) : '0';

    document.getElementById('pnl-gross-revenue').textContent = `₹${grossRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('pnl-total-expenses').textContent = `₹${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('pnl-net-profit').textContent = `₹${netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('pnl-profit-margin').textContent = `${profitMargin}%`;

    const ledgerContainer = document.getElementById('pnl-master-ledger-list');
    const ledgerCount = document.getElementById('pnl-ledger-count');

    let ledgerItems = [];
    if (incProfit) {
      filteredOrders.forEach(o => {
        const mode = (o.payment_mode || o.paymentMode || 'Cash').toLowerCase();
        let icon = 'fa-money-bill-wave';
        let color = 'emerald';
        if (mode.includes('upi')) { icon = 'fa-qrcode'; color = 'purple'; }
        else if (mode.includes('card')) { icon = 'fa-credit-card'; color = 'amber'; }

        ledgerItems.push({
          type: 'INCOME',
          refNo: o.order_number || o.orderNumber || 'KMIV-001',
          desc: `${o.order_type || 'Dine-In'} Revenue Bill`,
          amount: Number(o.grand_total || o.grandTotal || 0),
          mode: o.payment_mode || o.paymentMode || 'Cash',
          date: o.created_at || o.createdAt || new Date().toISOString(),
          icon,
          color
        });
      });
    }

    if (incExpense) {
      filteredExpenses.forEach(e => {
        ledgerItems.push({
          type: 'EXPENSE',
          refNo: e.category || 'Expense',
          desc: e.description || 'Outflow',
          amount: Number(e.amount || 0),
          mode: e.payment_mode || e.paid_to || e.paidTo || 'Cash',
          date: e.created_at || e.expense_date || new Date().toISOString(),
          icon: 'fa-arrow-trend-down',
          color: 'rose'
        });
      });
    }

    ledgerItems.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (ledgerCount) {
      ledgerCount.textContent = `${totalOrdersCount + totalExpensesCount} Transactions (${totalOrdersCount} Bills, ${totalExpensesCount} Expenses)`;
    }

    if (ledgerContainer) {
      if (ledgerItems.length === 0) {
        ledgerContainer.innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-scale-balanced"></i>
            <p>No transactions recorded for this period</p>
          </div>`;
      } else {
        ledgerContainer.innerHTML = ledgerItems.map((item, idx) => `
          <div class="feed-item pnl-${item.type === 'INCOME' ? 'income' : 'expense'}" style="animation: fadeIn 0.3s ${idx * 0.03}s both;">
            <div class="feed-item-left">
              <div class="feed-icon ${item.color}"><i class="fa-solid ${item.icon}"></i></div>
              <div class="feed-meta-wrap">
                <div class="feed-title">${item.refNo} — ${item.desc}</div>
                <div class="feed-subtitle">${item.mode}<span class="dot"></span>${new Date(item.date).toLocaleDateString('en-GB')}</div>
              </div>
            </div>
            <div class="feed-amount ${item.type === 'INCOME' ? 'text-emerald' : 'text-rose'}">
              ${item.type === 'INCOME' ? '+' : '-'}₹${item.amount.toFixed(2)}
            </div>
          </div>
        `).join('');
      }
    }
  }

  setCategoryFilter(catId) {
    this.selectedCategoryFilter = catId;
    this.renderDishes();
  }

  renderDishes() {
    const container = document.getElementById('dishes-master-list');
    const chipsContainer = document.getElementById('dishes-category-chips');
    if (!container) return;

    if (!this.selectedCategoryFilter) {
      this.selectedCategoryFilter = 'all';
    }

    const queryStr = (document.getElementById('dishes-search')?.value || '').toLowerCase();
    const categoriesMap = new Map();
    (this.liveData.categories || []).forEach(c => {
      categoriesMap.set(String(c.id), c.name);
    });

    const allItems = this.liveData.menuItems || [];
    const searchFiltered = allItems.filter(m => (m.name || '').toLowerCase().includes(queryStr));

    // Render Category Filter Chips Bar
    if (chipsContainer) {
      const activeCat = String(this.selectedCategoryFilter);
      let chipsHtml = `
        <button class="period-chip ${activeCat === 'all' ? 'active' : ''}" onclick="app.setCategoryFilter('all')">
          All (${allItems.length})
        </button>
      `;

      (this.liveData.categories || []).forEach(cat => {
        const catIdStr = String(cat.id);
        const count = allItems.filter(m => String(m.category_id || m.categoryId) === catIdStr).length;
        if (count > 0) {
          chipsHtml += `
            <button class="period-chip ${activeCat === catIdStr ? 'active' : ''}" onclick="app.setCategoryFilter('${catIdStr}')">
              ${cat.name} (${count})
            </button>
          `;
        }
      });
      chipsContainer.innerHTML = chipsHtml;
    }

    // Filter by selected category chip
    const finalItems = this.selectedCategoryFilter === 'all'
      ? searchFiltered
      : searchFiltered.filter(m => String(m.category_id || m.categoryId) === String(this.selectedCategoryFilter));

    if (finalItems.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-utensils"></i>
          <p>${queryStr ? 'No matching menu dishes found' : 'No dishes in this category'}</p>
        </div>`;
      return;
    }

    // Group menu items by category
    const groups = new Map();
    finalItems.forEach(item => {
      const catId = String(item.category_id || item.categoryId || 'other');
      const catName = categoriesMap.get(catId) || item.category_name || item.category || 'General Menu';
      if (!groups.has(catName)) {
        groups.set(catName, []);
      }
      groups.get(catName).push(item);
    });

    let html = '';
    let totalIdx = 0;

    groups.forEach((items, groupName) => {
      html += `
        <div class="category-group-section" style="margin-bottom: 20px;">
          <div class="category-group-header" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 4px 10px 4px; border-bottom: 1px solid rgba(212,175,55,0.25); margin-bottom: 10px;">
            <span style="font-weight: 700; font-size: 14px; color: var(--gold-400); display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-utensils" style="font-size: 12px;"></i> ${groupName}
            </span>
            <span class="badge-count" style="font-size: 11px; background: rgba(212,175,55,0.12); color: var(--gold-400); padding: 3px 10px; border-radius: 12px; border: 1px solid rgba(212,175,55,0.2);">
              ${items.length} item${items.length === 1 ? '' : 's'}
            </span>
          </div>
          <div class="category-group-body">
      `;

      items.forEach(m => {
        totalIdx++;
        const qPrice = Number(m.price_quarter || m.priceQuarter || 0);
        const hPrice = Number(m.price_half || m.priceHalf || 0);
        const fPrice = Number(m.price_full || m.priceFull || m.price || 0);

        let priceSub = [];
        if (qPrice > 0) priceSub.push(`Qtr ₹${qPrice}`);
        if (hPrice > 0) priceSub.push(`Half ₹${hPrice}`);
        if (priceSub.length === 0) priceSub.push(`Standard Rate`);

        html += `
          <div class="feed-item" style="animation: fadeIn 0.3s ${totalIdx * 0.03}s both; margin-bottom: 8px;">
            <div class="feed-item-left">
              <div class="feed-icon gold"><i class="fa-solid fa-utensils"></i></div>
              <div class="feed-meta-wrap">
                <div class="feed-title">${m.name}</div>
                <div class="feed-subtitle">${priceSub.join(' <span class="dot"></span> ')}</div>
              </div>
            </div>
            <div class="feed-amount text-gold">₹${fPrice.toFixed(2)}</div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  renderCategories() {
    const container = document.getElementById('categories-master-list');
    if (!container) return;

    container.innerHTML = this.liveData.categories.map((c, idx) => {
      const count = this.liveData.menuItems.filter(m => Number(m.categoryId) === Number(c.id)).length;
      return `
        <div class="feed-item" style="animation: fadeIn 0.3s ${idx * 0.04}s both;">
          <div class="feed-item-left">
            <div class="feed-icon gold"><i class="fa-solid fa-tags"></i></div>
            <div class="feed-meta-wrap">
              <div class="feed-title">${c.name}</div>
              <div class="feed-subtitle">${count} dish${count === 1 ? '' : 'es'} listed</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderBillsList() {
    const listContainer = document.getElementById('bills-master-list');
    if (!listContainer) return;

    const queryStr = (document.getElementById('bills-search')?.value || '').toLowerCase();
    const filtered = this.liveData.orders.filter(o =>
      (o.order_number || '').toLowerCase().includes(queryStr) ||
      (o.order_type || '').toLowerCase().includes(queryStr) ||
      (o.payment_mode || '').toLowerCase().includes(queryStr)
    );

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-receipt"></i>
          <p>${queryStr ? 'No matching bills found' : 'No bills available'}</p>
        </div>`;
      return;
    }

    listContainer.innerHTML = filtered.map((o, idx) => {
      const mode = (o.payment_mode || 'Cash').toLowerCase();
      let iconClass = 'fa-money-bill-wave';
      let iconColor = 'emerald';
      if (mode.includes('upi') || mode.includes('gpay')) { iconClass = 'fa-qrcode'; iconColor = 'purple'; }
      else if (mode.includes('card')) { iconClass = 'fa-credit-card'; iconColor = 'amber'; }

      return `
      <div class="feed-item" onclick="app.showBillDetails('${o.order_number || o.id}')" style="animation: fadeIn 0.3s ${idx * 0.03}s both;">
        <div class="feed-item-left">
          <div class="feed-icon ${iconColor}"><i class="fa-solid ${iconClass}"></i></div>
          <div class="feed-meta-wrap">
            <div class="feed-title">${o.order_number || 'KMIV-001'}</div>
            <div class="feed-subtitle">${o.order_type || 'Dine-In'}<span class="dot"></span>${o.payment_mode || 'Cash'}</div>
          </div>
        </div>
        <div class="feed-amount text-emerald">₹${Number(o.grand_total || 0).toFixed(2)}</div>
      </div>`;
    }).join('');
  }

  renderTokensList() {
    const grid = document.getElementById('tokens-master-grid');
    const badge = document.getElementById('tokens-count-badge');
    if (!grid) return;

    const activeTokens = this.liveData.tokens || [];
    if (badge) badge.textContent = `${activeTokens.length} Active`;

    if (activeTokens.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-ticket"></i>
          <p>No active kitchen tokens</p>
        </div>`;
      return;
    }

    grid.innerHTML = activeTokens.map((t, idx) => `
      <div class="token-card" style="animation: fadeIn 0.3s ${idx * 0.05}s both;">
        <div class="token-header">
          <span class="token-number">${t.token_number || t.tokenNumber || 'T-001'}</span>
          <span class="token-type">${t.order_type || 'Dine-In'}</span>
        </div>
        <p class="token-summary">${t.items_summary || 'Order items summary'}</p>
      </div>
    `).join('');
  }

  renderExpensesList() {
    const container = document.getElementById('expenses-master-list');
    const totalTag = document.getElementById('expenses-total-sum');
    if (!container) return;

    const expenses = this.liveData.expenses || [];
    const totalSum = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    if (totalTag) totalTag.textContent = `₹${totalSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    if (expenses.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-wallet"></i>
          <p>No expense entries recorded yet</p>
        </div>`;
      return;
    }

    container.innerHTML = expenses.map((e, idx) => `
      <div class="feed-item" style="animation: fadeIn 0.3s ${idx * 0.03}s both;">
        <div class="feed-item-left">
          <div class="feed-icon rose"><i class="fa-solid fa-wallet"></i></div>
          <div class="feed-meta-wrap">
            <div class="feed-title">${e.description || 'Expense'}</div>
            <div class="feed-subtitle">${e.category || 'Misc'}<span class="dot"></span>${e.paid_to || e.paidTo || 'Cash'}</div>
          </div>
        </div>
        <div class="feed-amount text-rose">₹${Number(e.amount || 0).toFixed(2)}</div>
      </div>
    `).join('');
  }

  handleSaveExpense(e) {
    e.preventDefault();
    const category = document.getElementById('exp-category')?.value || 'Misc';
    const description = document.getElementById('exp-desc')?.value.trim();
    const amount = document.getElementById('exp-amount')?.value;
    const paidTo = document.getElementById('exp-paidto')?.value.trim();

    if (!description || !amount) return;

    const newExpense = {
      id: Date.now(),
      category,
      description,
      amount: Number(amount),
      paid_to: paidTo,
      created_at: new Date().toISOString()
    };

    this.liveData.expenses.unshift(newExpense);
    const form = document.getElementById('mobile-expense-form');
    if (form) form.reset();
    this.renderDashboard();
    this.renderExpensesList();
    this.renderPnL();
  }

  showBillDetails(orderId) {
    const modal = document.getElementById('bill-detail-modal');
    const title = document.getElementById('modal-bill-title');
    const body = document.getElementById('modal-bill-body');

    const bill = this.liveData.orders.find(o => String(o.order_number || o.id) === String(orderId));
    if (!bill) return;

    title.textContent = `Bill #${bill.order_number || 'KMIV-001'}`;

    const mode = (bill.payment_mode || 'Cash').toLowerCase();
    let modeIcon = 'fa-money-bill-wave';
    let modeColor = 'text-emerald';
    if (mode.includes('upi')) { modeIcon = 'fa-qrcode'; modeColor = 'text-purple'; }
    else if (mode.includes('card')) { modeIcon = 'fa-credit-card'; modeColor = 'text-amber'; }

    body.innerHTML = `
      <div class="modal-row">
        <span class="modal-row-label">Order Type</span>
        <span class="modal-row-value">${bill.order_type || 'Dine-In'}</span>
      </div>
      <div class="modal-row">
        <span class="modal-row-label">Payment Mode</span>
        <span class="modal-row-value ${modeColor}"><i class="fa-solid ${modeIcon}" style="margin-right:6px;font-size:11px;"></i>${bill.payment_mode || 'Cash'}</span>
      </div>
      <div class="modal-row">
        <span class="modal-row-label">Date</span>
        <span class="modal-row-value">${new Date(bill.created_at || Date.now()).toLocaleDateString('en-GB')}</span>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-total">
        <span class="modal-total-label">Grand Total</span>
        <span class="modal-total-value">₹${Number(bill.grand_total || 0).toFixed(2)}</span>
      </div>
    `;

    modal.classList.remove('hidden');
  }
}

// Initialize Mobile Application
const app = new MobileApp();