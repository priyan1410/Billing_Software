import React, { useState, useEffect } from 'react';
import { IndianRupee, ShoppingBag, ArrowDownRight, TrendingUp, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { useAppStore } from '../../store/useAppStore';

export const DashboardView: React.FC = () => {
  const { setActiveSection } = useAppStore();
  const [chartPeriod, setChartPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('today');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrdersCount: 0,
    totalExpenseSum: 0,
    netProfit: 0,
    recentOrders: [] as any[],
    allOrders: [] as any[],
    allExpenses: [] as any[]
  });

  useEffect(() => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.getDashboardStats().then((res: any) => {
        if (res.success && res.data) {
          setStats(res.data);
        }
      });
    }
  }, []);

  const getTrendData = () => {
    const orders = stats.allOrders || [];
    const expenses = stats.allExpenses || [];

    const parseLocalDate = (dVal: any) => {
      if (!dVal) return null;
      const d = new Date(dVal);
      return isNaN(d.getTime()) ? null : d;
    };

    const toYYYYMMDD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const today = new Date();
    const todayStr = toYYYYMMDD(today);

    if (chartPeriod === 'today') {
      const hoursMap: { [hourLabel: string]: { Revenue: number; Expenses: number } } = {
        '08:00 AM': { Revenue: 0, Expenses: 0 },
        '10:00 AM': { Revenue: 0, Expenses: 0 },
        '12:00 PM': { Revenue: 0, Expenses: 0 },
        '02:00 PM': { Revenue: 0, Expenses: 0 },
        '04:00 PM': { Revenue: 0, Expenses: 0 },
        '06:00 PM': { Revenue: 0, Expenses: 0 },
        '08:00 PM': { Revenue: 0, Expenses: 0 },
        '10:00 PM': { Revenue: 0, Expenses: 0 }
      };

      orders.forEach((o: any) => {
        const d = parseLocalDate(o.created_at);
        if (d && toYYYYMMDD(d) === todayStr) {
          const h = d.getHours();
          const amt = Number(o.grand_total || 0);
          if (h < 10) hoursMap['08:00 AM'].Revenue += amt;
          else if (h < 12) hoursMap['10:00 AM'].Revenue += amt;
          else if (h < 14) hoursMap['12:00 PM'].Revenue += amt;
          else if (h < 16) hoursMap['02:00 PM'].Revenue += amt;
          else if (h < 18) hoursMap['04:00 PM'].Revenue += amt;
          else if (h < 20) hoursMap['06:00 PM'].Revenue += amt;
          else if (h < 22) hoursMap['08:00 PM'].Revenue += amt;
          else hoursMap['10:00 PM'].Revenue += amt;
        }
      });

      expenses.forEach((e: any) => {
        const d = parseLocalDate(e.expense_date || e.created_at);
        if (d && toYYYYMMDD(d) === todayStr) {
          const h = d.getHours();
          const amt = Number(e.amount || 0);
          if (h < 10) hoursMap['08:00 AM'].Expenses += amt;
          else if (h < 12) hoursMap['10:00 AM'].Expenses += amt;
          else if (h < 14) hoursMap['12:00 PM'].Expenses += amt;
          else if (h < 16) hoursMap['02:00 PM'].Expenses += amt;
          else if (h < 18) hoursMap['04:00 PM'].Expenses += amt;
          else if (h < 20) hoursMap['06:00 PM'].Expenses += amt;
          else if (h < 22) hoursMap['08:00 PM'].Expenses += amt;
          else hoursMap['10:00 PM'].Expenses += amt;
        }
      });

      return Object.keys(hoursMap).map(label => ({
        name: label,
        Revenue: hoursMap[label].Revenue,
        Expenses: hoursMap[label].Expenses,
        NetProfit: hoursMap[label].Revenue - hoursMap[label].Expenses
      }));
    }

    if (chartPeriod === 'week') {
      const days: { [dayStr: string]: { label: string; Revenue: number; Expenses: number } } = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const ymd = toYYYYMMDD(d);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        days[ymd] = { label: dayName, Revenue: 0, Expenses: 0 };
      }

      orders.forEach((o: any) => {
        const d = parseLocalDate(o.created_at);
        if (d) {
          const ymd = toYYYYMMDD(d);
          if (days[ymd]) days[ymd].Revenue += Number(o.grand_total || 0);
        }
      });

      expenses.forEach((e: any) => {
        const d = parseLocalDate(e.expense_date || e.created_at);
        if (d) {
          const ymd = toYYYYMMDD(d);
          if (days[ymd]) days[ymd].Expenses += Number(e.amount || 0);
        }
      });

      return Object.keys(days).map(ymd => ({
        name: days[ymd].label,
        Revenue: days[ymd].Revenue,
        Expenses: days[ymd].Expenses,
        NetProfit: days[ymd].Revenue - days[ymd].Expenses
      }));
    }

    if (chartPeriod === 'month') {
      const weeksMap = [
        { name: 'Week 1', Revenue: 0, Expenses: 0 },
        { name: 'Week 2', Revenue: 0, Expenses: 0 },
        { name: 'Week 3', Revenue: 0, Expenses: 0 },
        { name: 'Week 4', Revenue: 0, Expenses: 0 }
      ];

      const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

      orders.forEach((o: any) => {
        const d = parseLocalDate(o.created_at);
        if (d && toYYYYMMDD(d).startsWith(currentMonthStr)) {
          const dayNum = d.getDate();
          const amt = Number(o.grand_total || 0);
          if (dayNum <= 7) weeksMap[0].Revenue += amt;
          else if (dayNum <= 14) weeksMap[1].Revenue += amt;
          else if (dayNum <= 21) weeksMap[2].Revenue += amt;
          else weeksMap[3].Revenue += amt;
        }
      });

      expenses.forEach((e: any) => {
        const d = parseLocalDate(e.expense_date || e.created_at);
        if (d && toYYYYMMDD(d).startsWith(currentMonthStr)) {
          const dayNum = d.getDate();
          const amt = Number(e.amount || 0);
          if (dayNum <= 7) weeksMap[0].Expenses += amt;
          else if (dayNum <= 14) weeksMap[1].Expenses += amt;
          else if (dayNum <= 21) weeksMap[2].Expenses += amt;
          else weeksMap[3].Expenses += amt;
        }
      });

      return weeksMap.map(w => ({
        name: w.name,
        Revenue: w.Revenue,
        Expenses: w.Expenses,
        NetProfit: w.Revenue - w.Expenses
      }));
    }

    if (chartPeriod === 'year') {
      const monthsMap: { [monthIdx: number]: { label: string; Revenue: number; Expenses: number } } = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthNames.forEach((m, idx) => {
        monthsMap[idx] = { label: m, Revenue: 0, Expenses: 0 };
      });

      const currentYear = today.getFullYear();

      orders.forEach((o: any) => {
        const d = parseLocalDate(o.created_at);
        if (d && d.getFullYear() === currentYear) {
          monthsMap[d.getMonth()].Revenue += Number(o.grand_total || 0);
        }
      });

      expenses.forEach((e: any) => {
        const d = parseLocalDate(e.expense_date || e.created_at);
        if (d && d.getFullYear() === currentYear) {
          monthsMap[d.getMonth()].Expenses += Number(e.amount || 0);
        }
      });

      return Object.keys(monthsMap).map(mIdx => ({
        name: monthsMap[Number(mIdx)].label,
        Revenue: monthsMap[Number(mIdx)].Revenue,
        Expenses: monthsMap[Number(mIdx)].Expenses,
        NetProfit: monthsMap[Number(mIdx)].Revenue - monthsMap[Number(mIdx)].Expenses
      }));
    }

    const yearsMap: { [yr: number]: { Revenue: number; Expenses: number } } = {};

    orders.forEach((o: any) => {
      const d = parseLocalDate(o.created_at);
      if (d) {
        const yr = d.getFullYear();
        if (!yearsMap[yr]) yearsMap[yr] = { Revenue: 0, Expenses: 0 };
        yearsMap[yr].Revenue += Number(o.grand_total || 0);
      }
    });

    expenses.forEach((e: any) => {
      const d = parseLocalDate(e.expense_date || e.created_at);
      if (d) {
        const yr = d.getFullYear();
        if (!yearsMap[yr]) yearsMap[yr] = { Revenue: 0, Expenses: 0 };
        yearsMap[yr].Expenses += Number(e.amount || 0);
      }
    });

    const sortedYears = Object.keys(yearsMap).map(Number).sort((a, b) => a - b);
    if (sortedYears.length === 0) {
      return [{ name: String(today.getFullYear()), Revenue: stats.totalRevenue, Expenses: stats.totalExpenseSum, NetProfit: stats.netProfit }];
    }

    return sortedYears.map(yr => ({
      name: String(yr),
      Revenue: yearsMap[yr].Revenue,
      Expenses: yearsMap[yr].Expenses,
      NetProfit: yearsMap[yr].Revenue - yearsMap[yr].Expenses
    }));
  };

  const pieData = [
    { name: 'Special Chicken Mandhi', value: 45, color: '#d4af37' },
    { name: 'Mutton Raan Mandhi', value: 25, color: '#6b8e23' },
    { name: 'Peri Peri Alfaham', value: 20, color: '#556b2f' },
    { name: 'Kunafa Dessert', value: 10, color: '#38b000' }
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-olive-900 border border-gold-500/30 rounded-2xl p-5 relative overflow-hidden shadow-lg shadow-black/40">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-olive-800 flex items-center justify-center text-gold-500">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-olive-300 uppercase tracking-wider font-medium">Today's Sales</span>
              <h3 className="text-2xl font-bold text-white mt-0.5">₹{stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5" /> Live Revenue
              </span>
            </div>
          </div>
          <div className="absolute top-0 left-0 w-1 h-full bg-gold-500"></div>
        </div>

        <div className="bg-olive-900 border border-gold-500/30 rounded-2xl p-5 relative overflow-hidden shadow-lg shadow-black/40">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-olive-800 flex items-center justify-center text-gold-400">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-olive-300 uppercase tracking-wider font-medium">Today's Orders</span>
              <h3 className="text-2xl font-bold text-white mt-0.5">{stats.totalOrdersCount}</h3>
              <span className="text-xs text-olive-300 font-medium mt-1">Dine-In & Takeaway</span>
            </div>
          </div>
          <div className="absolute top-0 left-0 w-1 h-full bg-gold-400"></div>
        </div>

        <div className="bg-olive-900 border border-gold-500/30 rounded-2xl p-5 relative overflow-hidden shadow-lg shadow-black/40">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-olive-800 flex items-center justify-center text-rose-500">
              <ArrowDownRight className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-olive-300 uppercase tracking-wider font-medium">Today's Expenses</span>
              <h3 className="text-2xl font-bold text-white mt-0.5">₹{stats.totalExpenseSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
              <span className="text-xs text-rose-400 font-medium mt-1">Operational & Supplies</span>
            </div>
          </div>
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
        </div>

        <div className="bg-olive-900 border border-gold-500/30 rounded-2xl p-5 relative overflow-hidden shadow-lg shadow-black/40">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-olive-800 flex items-center justify-center text-emerald-400">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-olive-300 uppercase tracking-wider font-medium">Today's Net Profit</span>
              <h3 className="text-2xl font-bold text-white mt-0.5">₹{stats.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
              <span className="text-xs text-emerald-400 font-medium mt-1">Sales minus Expenses</span>
            </div>
          </div>
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 bg-olive-900 border border-gold-500/20 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-bold text-gold-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gold-400" /> Revenue & Expenses Trend
            </h4>

            {/* Period Pills Filter */}
            <div className="flex bg-olive-950 p-1 rounded-xl gap-1 border border-gold-500/15">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'year', label: 'This Year' },
                { id: 'all', label: 'All Time' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setChartPeriod(p.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    chartPeriod === p.id ? 'bg-gold-500 text-olive-950 font-bold shadow' : 'text-olive-300 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getTrendData()} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#9aab9c" fontSize={11} />
                <YAxis stroke="#9aab9c" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                <Tooltip contentStyle={{ backgroundColor: '#1b291d', borderColor: '#d4af37', borderRadius: '8px', color: '#fff' }} />
                <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="Revenue" stroke="#d4af37" strokeWidth={3} dot={{ r: 4, fill: '#d4af37' }} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="Expenses" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e' }} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="NetProfit" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-gold-500 mb-4">Top Selling Mandhi Dishes</h4>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}>
                  {pieData.map((entry, index) => (
                    <Cell key={`pie-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1b291d', borderColor: '#d4af37', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="inline-flex h-3.5 w-3.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-100">{entry.name}</span>
                <span className="ml-auto text-emerald-300">{entry.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-bold text-gold-500">Recent Completed Bills</h4>
          <button
            onClick={() => setActiveSection('billing')}
            className="text-xs font-semibold text-gold-400 flex items-center gap-1"
          >
            Go to Billing POS <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-olive-800 text-olive-300 font-semibold border-b border-gold-500/20">
              <tr>
                <th className="p-3">Bill #</th>
                <th className="p-3">Type</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-500/10">
              {stats.recentOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-olive-800/40 transition-colors">
                  <td className="p-3 font-bold text-white">{order.orderNumber}</td>
                  <td className="p-3 text-olive-300">{order.orderType}</td>
                  <td className="p-3 font-bold text-gold-400">₹{order.grandTotal.toFixed(2)}</td>
                  <td className="p-3 text-emerald-400 font-medium">{order.paymentMode}</td>
                  <td className="p-3 text-xs text-olive-300">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
