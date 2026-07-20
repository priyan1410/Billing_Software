// Database Settings Controller

const DbSettings = {
  init() {
    const form = document.getElementById('db-config-form');
    const testBtn = document.getElementById('btn-test-db');

    if (form) {
      form.addEventListener('submit', (e) => this.handleSaveConfig(e));
    }
    if (testBtn) {
      testBtn.addEventListener('click', () => this.handleTestConnection());
    }
  },

  async loadCurrentConfig() {
    if (!window.api) return;
    try {
      const cfg = await window.api.getDbConfig();
      if (cfg) {
        document.getElementById('db-host').value = cfg.host || 'localhost';
        document.getElementById('db-port').value = cfg.port || 3306;
        document.getElementById('db-user').value = cfg.user || 'root';
        document.getElementById('db-password').value = cfg.password || '';
        document.getElementById('db-name').value = cfg.database || 'kish_mandhi';
      }
    } catch (err) {
      console.error('Error loading DB config:', err);
    }
  },

  getFormValues() {
    return {
      host: document.getElementById('db-host').value.trim(),
      port: document.getElementById('db-port').value.trim(),
      user: document.getElementById('db-user').value.trim(),
      password: document.getElementById('db-password').value,
      database: document.getElementById('db-name').value.trim()
    };
  },

  async handleTestConnection() {
    const feedbackBox = document.getElementById('db-feedback');
    feedbackBox.className = 'db-feedback-box info';
    feedbackBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing connection to MySQL...';
    feedbackBox.classList.remove('hidden');

    const config = this.getFormValues();
    try {
      const res = await window.api.testDbConnection(config);
      if (res.success) {
        feedbackBox.className = 'db-feedback-box success';
        feedbackBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${res.message}`;
        this.updateStatusIndicator('success', 'MySQL Connected');
      } else {
        feedbackBox.className = 'db-feedback-box error';
        feedbackBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${res.message}`;
        this.updateStatusIndicator('danger', 'MySQL Connection Failed');
      }
    } catch (err) {
      feedbackBox.className = 'db-feedback-box error';
      feedbackBox.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${err.message}`;
    }
  },

  async handleSaveConfig(e) {
    e.preventDefault();
    const feedbackBox = document.getElementById('db-feedback');
    feedbackBox.className = 'db-feedback-box info';
    feedbackBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving settings & initializing database...';
    feedbackBox.classList.remove('hidden');

    const config = this.getFormValues();
    try {
      const res = await window.api.saveDbConfig(config);
      if (res.success) {
        feedbackBox.className = 'db-feedback-box success';
        feedbackBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> Settings saved! Database schema initialized successfully.`;
        this.updateStatusIndicator('success', 'MySQL Active');
      } else {
        feedbackBox.className = 'db-feedback-box error';
        feedbackBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${res.message}`;
      }
    } catch (err) {
      feedbackBox.className = 'db-feedback-box error';
      feedbackBox.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${err.message}`;
    }
  },

  async checkConnectionStatus() {
    if (!window.api) {
      this.updateStatusIndicator('warning', 'Offline Mode');
      return;
    }
    try {
      const res = await window.api.testDbConnection();
      if (res.success) {
        this.updateStatusIndicator('success', 'MySQL Active');
      } else {
        this.updateStatusIndicator('warning', 'Offline Mode');
      }
    } catch (e) {
      this.updateStatusIndicator('warning', 'Offline Mode');
    }
  },

  updateStatusIndicator(type, text) {
    const dot = document.getElementById('db-status-dot');
    const label = document.getElementById('db-status-text');
    if (dot) dot.className = `status-dot ${type}`;
    if (label) label.textContent = text;
  }
};

document.addEventListener('DOMContentLoaded', () => DbSettings.init());
window.DbSettings = DbSettings;
