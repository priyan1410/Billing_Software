// Expense Tracker Module Controller

const Expenses = {
  expenses: [],

  init() {
    this.bindEvents();
    this.setDefaultDate();
    this.loadExpenses();
  },

  bindEvents() {
    const form = document.getElementById('add-expense-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleAddExpense(e));
    }
  },

  setDefaultDate() {
    const dateInput = document.getElementById('exp-date');
    if (dateInput) {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dateInput.value = `${year}-${month}-${day}`;
    }
  },

  async loadExpenses() {
    if (!window.api) return;
    try {
      const res = await window.api.getExpenses();
      if (res.success) {
        this.expenses = res.data;
        this.renderExpensesTable();
      }
    } catch (err) {
      console.error('Error loading expenses:', err);
    }
  },

  renderExpensesTable() {
    const tbody = document.getElementById('expenses-tbody');
    const totalAmountEl = document.getElementById('ledger-total-amount');
    if (!tbody) return;

    if (this.expenses.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading-td">No expense entries logged yet.</td></tr>';
      if (totalAmountEl) totalAmountEl.textContent = '₹0.00';
      return;
    }

    const total = this.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    if (totalAmountEl) {
      totalAmountEl.textContent = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }

    tbody.innerHTML = this.expenses.map(e => `
      <tr>
        <td>${e.expense_date || e.expenseDate ? String(e.expense_date || e.expenseDate).split('T')[0].split(' ')[0] : 'N/A'}</td>
        <td><span class="badge" style="background:rgba(231,76,60,0.15); color:#e74c3c; border:1px solid rgba(231,76,60,0.3);">${e.category}</span></td>
        <td>${e.description}</td>
        <td>${e.paid_to || '-'}</td>
        <td>${e.payment_mode}</td>
        <td><strong style="color:#e74c3c;">₹${Number(e.amount).toFixed(2)}</strong></td>
        <td>
          <button style="background:transparent; border:none; color:#e74c3c; cursor:pointer;" onclick="Expenses.deleteExpense(${e.id})" title="Delete Entry">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  async handleAddExpense(e) {
    e.preventDefault();
    const category = document.getElementById('exp-category').value;
    const description = document.getElementById('exp-description').value.trim();
    const amount = Number(document.getElementById('exp-amount').value);
    const expense_date = document.getElementById('exp-date').value;
    const paid_to = document.getElementById('exp-paid-to').value.trim();
    const payment_mode = document.getElementById('exp-pay-mode').value;

    if (!description || !amount || !expense_date) {
      alert('Please fill out all required fields.');
      return;
    }

    const payload = { category, description, amount, expense_date, paid_to, payment_mode };

    try {
      const res = await window.api.addExpense(payload);
      if (res.success) {
        document.getElementById('exp-description').value = '';
        document.getElementById('exp-amount').value = '';
        document.getElementById('exp-paid-to').value = '';

        this.loadExpenses();
        if (window.Dashboard) window.Dashboard.loadMetrics();
      }
    } catch (err) {
      alert(`Error saving expense: ${err.message}`);
    }
  },

  async deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense entry?')) return;
    if (!window.api) return;

    try {
      const res = await window.api.deleteExpense(id);
      if (res.success) {
        this.loadExpenses();
        if (window.Dashboard) window.Dashboard.loadMetrics();
      }
    } catch (err) {
      alert(`Error deleting expense: ${err.message}`);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Expenses.init());
window.Expenses = Expenses;
