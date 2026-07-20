// Dashboard Overview & Chart Visualizations Controller

const Dashboard = {
  revenueChart: null,
  topItemsChart: null,

  async loadMetrics() {
    if (!window.api) return;
    try {
      const res = await window.api.getDashboardStats();
      if (res.success) {
        const { totalRevenue, totalOrdersCount, totalExpenseSum, netProfit, pendingTokens, recentOrders } = res.data;

        // Update Counter Cards
        document.getElementById('dash-total-sales').textContent = `₹${Number(totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        document.getElementById('dash-total-orders').textContent = totalOrdersCount;
        document.getElementById('dash-total-expenses').textContent = `₹${Number(totalExpenseSum).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        document.getElementById('dash-net-profit').textContent = `₹${Number(netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        
        // Update Token Badge
        const tokenBadge = document.getElementById('sidebar-token-badge');
        if (tokenBadge) tokenBadge.textContent = pendingTokens || 0;

        // Render Recent Orders Table
        this.renderRecentOrders(recentOrders);

        // Render Charts
        this.renderCharts(totalRevenue, totalExpenseSum);
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  },

  renderRecentOrders(orders) {
    const tbody = document.getElementById('recent-orders-tbody');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading-td">No recent transactions recorded today.</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong>${o.order_number}</strong></td>
        <td><span class="badge" style="background:#e5a93c; color:#12141a; font-weight:700;">#${o.token_number}</span></td>
        <td>${o.order_type}</td>
        <td><strong>₹${Number(o.grand_total).toFixed(2)}</strong></td>
        <td><span class="trend positive">${o.payment_mode}</span></td>
        <td>${new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
      </tr>
    `).join('');
  },

  renderCharts(sales, expenses) {
    if (typeof Chart === 'undefined') return;

    // 1. Revenue vs Expenses Bar Chart
    const ctx1 = document.getElementById('revenueChart');
    if (ctx1) {
      if (this.revenueChart) this.revenueChart.destroy();
      this.revenueChart = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: ['Today Sales', 'Today Expenses', 'Net Profit'],
          datasets: [{
            label: 'Amount (₹)',
            data: [sales, expenses, sales - expenses],
            backgroundColor: ['#e5a93c', '#e74c3c', '#2ecc71'],
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#9499a6' }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#f5f6f8', font: { weight: 'bold' } }
            }
          }
        }
      });
    }

    // 2. Top Selling Dishes Doughnut Chart
    const ctx2 = document.getElementById('topItemsChart');
    if (ctx2) {
      if (this.topItemsChart) this.topItemsChart.destroy();
      this.topItemsChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: ['Special Chicken Mandhi', 'Mutton Raan Mandhi', 'Peri Peri Alfaham', 'Kunafa Dessert'],
          datasets: [{
            data: [45, 25, 20, 10],
            backgroundColor: ['#e5a93c', '#d9822b', '#e67e22', '#9b59b6'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#9499a6', font: { size: 11 } }
            }
          }
        }
      });
    }
  }
};

window.Dashboard = Dashboard;
