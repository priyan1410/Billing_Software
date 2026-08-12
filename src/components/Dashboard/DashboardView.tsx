import React, { useState, useEffect, useMemo } from 'react';
import { IndianRupee, ShoppingBag, ArrowDownRight, TrendingUp, ChevronRight, BarChart2, Maximize2, Download, Search, X, Calendar, Utensils } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { useAppStore } from '../../store/useAppStore';
import { DatePicker } from '../UI/DatePicker';

export const DashboardView: React.FC = () => {
  const { setActiveSection } = useAppStore();
  const [chartPeriod, setChartPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('today');
  const [showFoodSalesReportModal, setShowFoodSalesReportModal] = useState<boolean>(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrdersCount: 0,
    totalExpenseSum: 0,
    netProfit: 0,
    recentOrders: [] as any[],
    allOrders: [] as any[],
    allExpenses: [] as any[],
    topDishes: [] as any[]
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

  // Robust date parser for all string/Date formats
  const parseLocalDate = (dVal: any): Date | null => {
    if (!dVal) return null;
    if (dVal instanceof Date) return isNaN(dVal.getTime()) ? null : dVal;

    const str = String(dVal).trim();
    if (!str) return null;

    // Match DD/MM/YYYY, HH:MM:SS AM/PM
    const ddMmyyyyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?)?/i;
    const match = str.match(ddMmyyyyRegex);

    if (match) {
      let day = parseInt(match[1], 10);
      let month = parseInt(match[2], 10) - 1;
      let year = parseInt(match[3], 10);
      let hours = match[4] ? parseInt(match[4], 10) : 0;
      let minutes = match[5] ? parseInt(match[5], 10) : 0;
      let seconds = match[6] ? parseInt(match[6], 10) : 0;
      const ampm = match[7] ? match[7].toUpperCase() : null;

      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;

      const d = new Date(year, month, day, hours, minutes, seconds);
      return isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };

  const toYYYYMMDD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getTrendData = () => {
    const orders = stats.allOrders || [];
    const expenses = stats.allExpenses || [];
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
        const d = parseLocalDate(o.created_at || o.createdAt);
        if (d && toYYYYMMDD(d) === todayStr) {
          const h = d.getHours();
          const amt = Number(o.grand_total || o.grandTotal || 0);
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
        const d = parseLocalDate(e.expense_date || e.expenseDate || e.created_at);
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
        const d = parseLocalDate(o.created_at || o.createdAt);
        if (d) {
          const ymd = toYYYYMMDD(d);
          if (days[ymd]) days[ymd].Revenue += Number(o.grand_total || o.grandTotal || 0);
        }
      });

      expenses.forEach((e: any) => {
        const d = parseLocalDate(e.expense_date || e.expenseDate || e.created_at);
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
        const d = parseLocalDate(o.created_at || o.createdAt);
        if (d && toYYYYMMDD(d).startsWith(currentMonthStr)) {
          const dayNum = d.getDate();
          const amt = Number(o.grand_total || o.grandTotal || 0);
          if (dayNum <= 7) weeksMap[0].Revenue += amt;
          else if (dayNum <= 14) weeksMap[1].Revenue += amt;
          else if (dayNum <= 21) weeksMap[2].Revenue += amt;
          else weeksMap[3].Revenue += amt;
        }
      });

      expenses.forEach((e: any) => {
        const d = parseLocalDate(e.expense_date || e.expenseDate || e.created_at);
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
        const d = parseLocalDate(o.created_at || o.createdAt);
        if (d && d.getFullYear() === currentYear) {
          monthsMap[d.getMonth()].Revenue += Number(o.grand_total || o.grandTotal || 0);
        }
      });

      expenses.forEach((e: any) => {
        const d = parseLocalDate(e.expense_date || e.expenseDate || e.created_at);
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

    // 'all' period
    const yearsMap: { [yr: number]: { Revenue: number; Expenses: number } } = {};

    orders.forEach((o: any) => {
      const d = parseLocalDate(o.created_at || o.createdAt);
      if (d) {
        const yr = d.getFullYear();
        if (!yearsMap[yr]) yearsMap[yr] = { Revenue: 0, Expenses: 0 };
        yearsMap[yr].Revenue += Number(o.grand_total || o.grandTotal || 0);
      }
    });

    expenses.forEach((e: any) => {
      const d = parseLocalDate(e.expense_date || e.expenseDate || e.created_at);
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

  const trendData = getTrendData();

  // Dynamic Y-axis scale calculation
  const allValues = trendData.flatMap(d => [d.Revenue, d.Expenses, d.NetProfit]);
  const maxDataVal = Math.max(...allValues, 0);
  const minDataVal = Math.min(...allValues, 0);

  const yMax = maxDataVal === 0 ? 1000 : Math.ceil(maxDataVal * 1.15);
  const yMin = minDataVal < 0 ? Math.floor(minDataVal * 1.15) : 0;
  const yDomain = [yMin, yMax];

  // Check if all data is zero for empty state display
  const isDataEmpty = trendData.every(d => d.Revenue === 0 && d.Expenses === 0);

  const dishColors = ['#d4af37', '#38b000', '#e11d48', '#3b82f6', '#9333ea', '#f59e0b'];

  const getPieChartData = () => {
    if (stats.topDishes && stats.topDishes.length > 0) {
      const totalQty = stats.topDishes.reduce((acc: number, d: any) => acc + (d.quantity || 0), 0);
      if (totalQty > 0) {
        return stats.topDishes.map((d: any, idx: number) => {
          const percentVal = Math.round(((d.quantity || 0) / totalQty) * 100);
          return {
            name: d.name || 'Mandhi Dish',
            value: percentVal > 0 ? percentVal : 1,
            qty: d.quantity || 0,
            sales: d.totalSales || 0,
            color: dishColors[idx % dishColors.length]
          };
        });
      }
    }

    return [
      { name: 'Chicken Mandhi', value: 45, qty: 45, sales: 29250, color: '#d4af37' },
      { name: 'Mutton Mandhi', value: 25, qty: 25, sales: 24500, color: '#6b8e23' },
      { name: 'Alfaham Chicken', value: 20, qty: 20, sales: 10800, color: '#e11d48' },
      { name: 'Kunafa Dessert', value: 10, qty: 10, sales: 1800, color: '#10b981' }
    ];
  };

  const pieData = getPieChartData();
  const totalDishesSold = pieData.reduce((acc: number, d: any) => acc + (d.qty || 0), 0);

  // Render direct percentage labels on Pie Chart Slices
  const renderPieSliceLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (!percent || percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight="bold"
        className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6 select-none">
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

        {/* Revenue & Expenses Line Chart */}
        <div className="md:col-span-2 bg-olive-900 border border-gold-500/20 rounded-2xl p-5 flex flex-col justify-between">
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

          {/* Line Chart or Empty State */}
          {isDataEmpty ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-olive-950/40 rounded-xl border border-gold-500/10">
              <BarChart2 className="w-10 h-10 text-olive-400/40 mb-2" />
              <p className="text-sm font-semibold text-olive-200">No Sales or Expenses Recorded {chartPeriod === 'today' ? 'Today Yet' : 'For This Period'}</p>
              <p className="text-xs text-olive-400 mt-1 max-w-xs">New POS bills and ledger entries will automatically plot live trends here.</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#9aab9c" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#9aab9c"
                    fontSize={11}
                    domain={yDomain}
                    tickLine={false}
                    tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#131e15', borderColor: '#d4af37', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                    formatter={(value: any) => [`₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, '']}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                    formatter={(value) => <span className="text-olive-200 font-semibold px-1">{value}</span>}
                  />
                  <Line
                    type="monotone"
                    dataKey="Revenue"
                    name="Revenue"
                    stroke="#d4af37"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#d4af37' }}
                    activeDot={{ r: 7 }}
                    connectNulls={true}
                  />
                  <Line
                    type="monotone"
                    dataKey="Expenses"
                    name="Expenses"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#ef4444' }}
                    activeDot={{ r: 7 }}
                    connectNulls={true}
                  />
                  <Line
                    type="monotone"
                    dataKey="NetProfit"
                    name="Net Profit"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981' }}
                    activeDot={{ r: 7 }}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Selling Dishes Hollow Donut Pie Chart */}
        <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <h4 className="text-sm font-bold text-gold-500">Top Selling Mandhi Dishes</h4>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-olive-300 bg-olive-950/60 px-2.5 py-0.5 rounded-full border border-gold-500/10 hidden sm:inline-block">
                Live Sales
              </span>
              <button
                onClick={() => setShowFoodSalesReportModal(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 rounded-xl border border-amber-500/40 transition-all shadow-sm"
                title="Expand and view full itemized Food Sales Report"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Food Sales Report</span>
              </button>
            </div>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={76}
                  paddingAngle={4}
                  labelLine={false}
                  label={renderPieSliceLabel}
                >
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={`pie-${index}`} fill={entry.color} stroke="#1b291d" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#131e15', borderColor: '#d4af37', borderRadius: '10px', color: '#fff' }}
                  formatter={(val: any, name: any, item: any) => [
                    `${val}% (${item.payload?.qty || 0} sold • ₹${Number(item.payload?.sales || 0).toLocaleString('en-IN')})`,
                    'Share'
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Hollow Donut Center Metric Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-white">{totalDishesSold}</span>
              <span className="text-[10px] font-bold text-gold-400 uppercase tracking-wider">Dishes Sold</span>
            </div>
          </div>

          {/* Pie Chart Legend List */}
          <div className="mt-2 grid gap-1.5 text-xs">
            {pieData.map((entry: any) => (
              <div key={entry.name} className="flex items-center gap-2 px-2.5 py-1.5 bg-olive-950/60 rounded-xl border border-gold-500/10">
                <span className="inline-flex h-3 w-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-200 font-semibold truncate max-w-[140px]">{entry.name}</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[11px] text-olive-300 font-mono">{entry.qty} sold</span>
                  <span className="font-extrabold text-emerald-400">{entry.value}%</span>
                </div>
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
            className="text-xs font-semibold text-gold-400 flex items-center gap-1 hover:text-gold-300 transition-colors"
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
              {stats.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-xs text-olive-400">
                    No orders recorded today yet.
                  </td>
                </tr>
              ) : (
                stats.recentOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-olive-800/40 transition-colors">
                    <td className="p-3 font-bold text-white">{order.orderNumber}</td>
                    <td className="p-3 text-olive-300">{order.orderType}</td>
                    <td className="p-3 font-bold text-gold-400">₹{order.grandTotal.toFixed(2)}</td>
                    <td className="p-3 text-emerald-400 font-medium">{order.paymentMode}</td>
                    <td className="p-3 text-xs text-olive-300">
                      {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showFoodSalesReportModal && (
        <FoodSalesReportModal onClose={() => setShowFoodSalesReportModal(false)} />
      )}
    </div>
  );
};

const FoodSalesReportModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'custom' | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFoodSales = async () => {
    setLoading(true);
    try {
      if ((window as any).electronAPI?.getFoodSalesReport) {
        const res = await (window as any).electronAPI.getFoodSalesReport({ period, startDate, endDate });
        if (res && res.success && Array.isArray(res.data)) {
          setReportData(res.data);
        }
      }
    } catch (err) {
      console.error('fetchFoodSales error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFoodSales();
    }, 120);
    return () => clearTimeout(timer);
  }, [period, startDate, endDate]);

  const { grandTotalSales, grandTotalQty, filteredItems } = useMemo(() => {
    const totalSales = reportData.reduce((sum, item) => sum + Number(item.totalSales || 0), 0);
    const totalQty = reportData.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const query = searchQuery.toLowerCase().trim();
    const items = query ? reportData.filter(item =>
      String(item.name || '').toLowerCase().includes(query) ||
      String(item.variant || '').toLowerCase().includes(query)
    ) : reportData;
    const sorted = [...items].sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0));
    return { grandTotalSales: totalSales, grandTotalQty: totalQty, filteredItems: sorted };
  }, [reportData, searchQuery]);

  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      alert('No food sales data available to export.');
      return;
    }
    let csv = 'Dish Name,Variant,Quantity Sold,Avg Unit Price (INR),Total Sales (INR),Share of Total (%)\n';
    filteredItems.forEach(item => {
      const share = grandTotalSales > 0 ? ((item.totalSales / grandTotalSales) * 100).toFixed(1) : '0';
      csv += `"${item.name}","${item.variant}",${item.quantity},${Number(item.avgPrice || 0).toFixed(2)},${Number(item.totalSales || 0).toFixed(2)},${share}%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Food_Sales_Report_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-olive-950 border border-gold-500/30 rounded-3xl w-[80vw] h-[80vh] shadow-2xl shadow-black flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gold-500/20 bg-olive-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-wide flex items-center gap-2">
                Food Sales Report & Itemized Analytics
              </h3>
              <p className="text-xs text-olive-300">Complete food sales performance and dish breakdown with date filtering</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-olive-400 hover:text-white rounded-xl hover:bg-olive-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">
          {/* Controls Bar: Period Filter + Search + Export */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            {/* Period Pills */}
            <div className="flex bg-olive-900 p-1 rounded-xl border border-gold-500/15 gap-1">
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'week', label: '7 Days' },
                { id: 'month', label: 'This Month' },
                { id: 'year', label: 'This Year' },
                { id: 'custom', label: 'Custom Range' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setPeriod(t.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    period === t.id ? 'bg-gold-500 text-olive-950 shadow-md' : 'text-olive-300 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-olive-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search dish or variant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-olive-900 border border-gold-500/20 rounded-xl text-xs text-white placeholder-olive-400 outline-none focus:border-gold-500"
                />
              </div>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {/* Custom Date Range Controls */}
          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-olive-900 border border-gold-500/20 rounded-2xl text-xs">
              <Calendar className="w-4 h-4 text-gold-400" />
              <div className="flex items-center gap-2">
                <span className="text-olive-300">From Date:</span>
                <DatePicker
                  value={startDate}
                  onChange={(val) => setStartDate(val)}
                  className="w-28"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-olive-300">To Date:</span>
                <DatePicker
                  value={endDate}
                  onChange={(val) => setEndDate(val)}
                  className="w-28"
                />
              </div>
            </div>
          )}

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-olive-900/80 border border-gold-500/20 p-4 rounded-2xl">
              <span className="text-[11px] text-olive-300 font-semibold block">Total Food Revenue</span>
              <span className="text-xl font-bold text-emerald-400 mt-1 block">₹{grandTotalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-olive-900/80 border border-gold-500/20 p-4 rounded-2xl">
              <span className="text-[11px] text-olive-300 font-semibold block">Total Dishes Sold</span>
              <span className="text-xl font-bold text-amber-300 mt-1 block">{grandTotalQty} Items</span>
            </div>
            <div className="bg-olive-900/80 border border-gold-500/20 p-4 rounded-2xl">
              <span className="text-[11px] text-olive-300 font-semibold block">Unique Items Sold</span>
              <span className="text-xl font-bold text-cyan-300 mt-1 block">{filteredItems.length} Dishes</span>
            </div>
            <div className="bg-olive-900/80 border border-gold-500/20 p-4 rounded-2xl">
              <span className="text-[11px] text-olive-300 font-semibold block">Top Performing Dish</span>
              <span className="text-sm font-bold text-gold-400 truncate mt-1 block">{filteredItems[0]?.name || 'N/A'}</span>
            </div>
          </div>

          {/* Detailed Food Sales Table */}
          <div className="bg-olive-900 border border-gold-500/20 rounded-2xl overflow-hidden flex-1 flex flex-col min-h-[260px]">
            <div className="px-4 py-3 bg-olive-950/80 border-b border-gold-500/20 flex justify-between items-center text-xs font-bold text-gold-400 uppercase tracking-wider shrink-0">
              <span>Itemized Food Sales Ledger</span>
              <span>{filteredItems.length} Records</span>
            </div>
            <div className="flex-1 overflow-y-auto will-change-scroll" style={{ transform: 'translateZ(0)', scrollbarWidth: 'thin' }}>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gold-500/10 bg-olive-950/40 text-olive-300 text-[11px]">
                    <th className="py-2.5 px-4">Dish Name</th>
                    <th className="py-2.5 px-3">Portion / Variant</th>
                    <th className="py-2.5 px-3 text-right">Qty Sold</th>
                    <th className="py-2.5 px-3 text-right">Avg Unit Price</th>
                    <th className="py-2.5 px-4 text-right">% Share of Qty Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-500/10">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-olive-400">Loading food sales report...</td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-olive-400">No food sales recorded for this date filter.</td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const share = grandTotalQty > 0 ? (item.quantity / grandTotalQty) * 100 : 0;
                      return (
                        <tr key={idx} className="hover:bg-olive-800/40 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gold-400 shrink-0" />
                            <span>{item.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-olive-300">
                            <span className="px-2 py-0.5 rounded bg-olive-950 text-[10px] font-mono border border-gold-500/10">
                              {item.variant}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-300 font-bold">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-olive-200">₹{Number(item.avgPrice || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-olive-950 h-2 rounded-full overflow-hidden border border-gold-500/20">
                                <div className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full" style={{ width: `${Math.min(100, share)}%` }} />
                              </div>
                              <span className="font-bold text-gold-400 text-[11px] font-mono min-w-[36px]">{share.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

