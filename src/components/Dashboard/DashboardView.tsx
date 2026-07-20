import React, { useState, useEffect } from 'react';
import { IndianRupee, ShoppingBag, ArrowDownRight, TrendingUp, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAppStore } from '../../store/useAppStore';

export const DashboardView: React.FC = () => {
  const { setActiveSection } = useAppStore();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrdersCount: 0,
    totalExpenseSum: 0,
    netProfit: 0,
    recentOrders: [] as any[]
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

  const barData = [
    { name: 'Today Sales', amount: stats.totalRevenue, fill: '#d4af37' },
    { name: 'Expenses', amount: stats.totalExpenseSum, fill: '#d90429' },
    { name: 'Net Profit', amount: Math.max(0, stats.netProfit), fill: '#38b000' }
  ];

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
              <span className="text-xs text-olive-300 uppercase tracking-wider font-medium">Total Orders</span>
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
              <span className="text-xs text-olive-300 uppercase tracking-wider font-medium">Total Expenses</span>
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
              <span className="text-xs text-olive-300 uppercase tracking-wider font-medium">Net Profit</span>
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
          <h4 className="text-sm font-bold text-gold-500 mb-4">Revenue & Expenses Trend</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" stroke="#9aab9c" fontSize={12} />
                <YAxis stroke="#9aab9c" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1b291d', borderColor: '#d4af37', borderRadius: '8px' }} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
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
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-bold text-gold-500">Recent Completed Bills</h4>
          <button
            onClick={() => setActiveSection('billing')}
            className="text-xs font-semibold text-gold-400 hover:underline flex items-center gap-1"
          >
            Go to Billing POS <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-olive-800 text-olive-300 font-semibold border-b border-gold-500/20">
              <tr>
                <th className="p-3">Bill #</th>
                <th className="p-3">Token #</th>
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
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-gold-500 text-olive-950 rounded-md font-bold text-xs">
                      #{order.tokenNumber}
                    </span>
                  </td>
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
