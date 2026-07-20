// Global Navigation & Master App Controller

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  startLiveClock();

  // Load database status
  if (window.DbSettings) {
    window.DbSettings.checkConnectionStatus();
  }

  // Load initial dashboard metrics
  if (window.Dashboard) {
    window.Dashboard.loadMetrics();
  }
});

// Sidebar & Tab Navigation
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-target]');
  const pageTitle = document.getElementById('page-title');
  const quickNewBillBtn = document.getElementById('quick-new-bill');
  const btnGotoBilling = document.getElementById('btn-goto-billing');

  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      switchSection(targetId);
    });
  });

  if (quickNewBillBtn) {
    quickNewBillBtn.addEventListener('click', () => switchSection('billing-section'));
  }

  if (btnGotoBilling) {
    btnGotoBilling.addEventListener('click', () => switchSection('billing-section'));
  }
}

function switchSection(targetSectionId) {
  // Update sidebar active states
  const navItems = document.querySelectorAll('.nav-item[data-target]');
  navItems.forEach(item => {
    if (item.getAttribute('data-target') === targetSectionId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Toggle visible section
  const sections = document.querySelectorAll('.app-section');
  sections.forEach(sec => {
    if (sec.id === targetSectionId) {
      sec.classList.add('active');
    } else {
      sec.classList.remove('active');
    }
  });

  // Update Top Bar Title
  const titleMap = {
    'dashboard-section': 'Dashboard Overview',
    'billing-section': 'Billing & Point of Sale (POS)',
    'tokens-section': 'Token Generator & Printer',
    'expenses-section': 'Expense Tracker & Daily Ledger',
    'restaurant-section': 'Restaurant Hub & Financial Analysis',
    'db-settings-section': 'Database Connection Settings'
  };

  const pageTitle = document.getElementById('page-title');
  if (pageTitle && titleMap[targetSectionId]) {
    pageTitle.textContent = titleMap[targetSectionId];
  }

  // Trigger Section Data Refresh
  if (targetSectionId === 'dashboard-section' && window.Dashboard) {
    window.Dashboard.loadMetrics();
  } else if (targetSectionId === 'billing-section' && window.Billing) {
    window.Billing.initCatalog();
  } else if (targetSectionId === 'tokens-section' && window.Tokens) {
    window.Tokens.initCatalog();
  } else if (targetSectionId === 'expenses-section' && window.Expenses) {
    window.Expenses.loadExpenses();
  } else if (targetSectionId === 'restaurant-section' && window.Restaurant) {
    window.Restaurant.loadData();
  } else if (targetSectionId === 'db-settings-section' && window.DbSettings) {
    window.DbSettings.loadCurrentConfig();
  }
}

// Live Top Header Clock
function startLiveClock() {
  const clockEl = document.getElementById('live-datetime');
  function update() {
    const now = new Date();
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    if (clockEl) {
      clockEl.textContent = now.toLocaleDateString('en-US', options);
    }
  }
  update();
  setInterval(update, 1000);
}

window.switchSection = switchSection;
