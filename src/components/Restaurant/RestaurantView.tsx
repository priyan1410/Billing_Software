import React, { useState, useEffect } from 'react';
import { Utensils, TrendingUp, Store, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { Dish, PnLPeriod } from '../../types';

export const RestaurantView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dishes' | 'pnl' | 'about'>('dishes');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Add Dish Form State
  const [addName, setAddName] = useState('');
  const [addCat, setAddCat] = useState('1');
  const [addQtr, setAddQtr] = useState('');
  const [addHalf, setAddHalf] = useState('');
  const [addFull, setAddFull] = useState('');

  // Edit Dish Form State
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCat, setEditCat] = useState('1');
  const [editQtr, setEditQtr] = useState('');
  const [editHalf, setEditHalf] = useState('');
  const [editFull, setEditFull] = useState('');

  // PnL Period Timeline State
  const [period, setPeriod] = useState<PnLPeriod>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);

  useEffect(() => {
    loadDishes();
    loadFinancials();
  }, []);

  const loadDishes = async () => {
    if ((window as any).electronAPI) {
      const res = await (window as any).electronAPI.getMenuItems('all');
      if (res.success) setDishes(res.data);
    } else {
      setDishes([
        { id: 1, categoryId: 1, name: 'Special Chicken Mandhi (ஸ்பெஷல் சிக்கன் மந்தி)', priceQuarter: 220, priceHalf: 420, priceFull: 790, isAvailable: true },
        { id: 2, categoryId: 1, name: 'Mutton Raan Mandhi (மட்டன் ரான் மந்தி)', priceQuarter: 350, priceHalf: 680, priceFull: 1290, isAvailable: true },
        { id: 3, categoryId: 1, name: 'Beef Ribs Mandhi (பீஃப் ரிப்ஸ் மந்தி)', priceQuarter: 280, priceHalf: 520, priceFull: 980, isAvailable: true },
        { id: 4, categoryId: 2, name: 'Peri Peri Alfaham (பெரி பெரி அல்ஃபஹாம்)', priceQuarter: 160, priceHalf: 310, priceFull: 590, isAvailable: true },
        { id: 5, categoryId: 2, name: 'Honey Chili Alfaham (ஹனி சில்லி அல்ஃபஹாம்)', priceQuarter: 170, priceHalf: 330, priceFull: 620, isAvailable: true },
        { id: 6, categoryId: 3, name: 'Kubboos (குபூஸ் - 2 Pcs)', priceQuarter: 30, priceHalf: 30, priceFull: 30, isAvailable: true },
        { id: 7, categoryId: 3, name: 'Special Garlic Sauce / Mayonnaise (பூண்டு சாஸ்)', priceQuarter: 40, priceHalf: 40, priceFull: 40, isAvailable: true },
        { id: 8, categoryId: 4, name: 'Fresh Mint Lime Mojito (புதினா மோஹிட்டோ)', priceQuarter: 70, priceHalf: 70, priceFull: 70, isAvailable: true }
      ]);
    }
  };

  const loadFinancials = async () => {
    if ((window as any).electronAPI) {
      const ordersRes = await (window as any).electronAPI.getOrders();
      const expRes = await (window as any).electronAPI.getExpenses();
      if (ordersRes.success) setAllOrders(ordersRes.data);
      if (expRes.success) setAllExpenses(expRes.data);
    } else {
      setAllOrders([
        { grandTotal: 829.5, createdAt: new Date().toISOString() },
        { grandTotal: 421, createdAt: new Date().toISOString() }
      ]);
      setAllExpenses([
        { amount: 4500, expenseDate: new Date().toISOString().split('T')[0] },
        { amount: 8200, expenseDate: new Date().toISOString().split('T')[0] },
        { amount: 3600, expenseDate: new Date().toISOString().split('T')[0] }
      ]);
    }
  };

  // Add Dish Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addFull) return;

    const payload = {
      name: addName,
      category_id: Number(addCat),
      price_quarter: Number(addQtr || 0),
      price_half: Number(addHalf || 0),
      price_full: Number(addFull)
    };

    if ((window as any).electronAPI) {
      await (window as any).electronAPI.saveMenuItem(payload);
      loadDishes();
    } else {
      setDishes([
        ...dishes,
        {
          id: dishes.length + 1,
          categoryId: Number(addCat),
          name: addName,
          priceQuarter: Number(addQtr || 0),
          priceHalf: Number(addHalf || 0),
          priceFull: Number(addFull),
          isAvailable: true
        }
      ]);
    }

    setAddName('');
    setAddQtr('');
    setAddHalf('');
    setAddFull('');
    setShowAddModal(false);
  };

  // Edit Dish Submit
  const handleOpenEdit = (dish: Dish) => {
    setEditId(dish.id);
    setEditName(dish.name);
    setEditCat(String(dish.categoryId));
    setEditQtr(String(dish.priceQuarter || 0));
    setEditHalf(String(dish.priceHalf || 0));
    setEditFull(String(dish.priceFull || 0));
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !editName || !editFull) return;

    const payload = {
      id: editId,
      name: editName,
      category_id: Number(editCat),
      price_quarter: Number(editQtr || 0),
      price_half: Number(editHalf || 0),
      price_full: Number(editFull)
    };

    if ((window as any).electronAPI) {
      await (window as any).electronAPI.updateMenuItem(payload);
      loadDishes();
    } else {
      setDishes(
        dishes.map((d) =>
          d.id === editId
            ? {
                ...d,
                name: editName,
                categoryId: Number(editCat),
                priceQuarter: Number(editQtr || 0),
                priceHalf: Number(editHalf || 0),
                priceFull: Number(editFull)
              }
            : d
        )
      );
    }
    setShowEditModal(false);
  };

  // Delete Dish
  const handleDeleteDish = async (id: number) => {
    if (!confirm('Are you sure you want to remove this dish from the menu?')) return;
    if ((window as any).electronAPI) {
      await (window as any).electronAPI.deleteMenuItem(id);
      loadDishes();
    } else {
      setDishes(dishes.filter((d) => d.id !== id));
    }
  };

  // Timeline Filter Math
  const filterItemByPeriod = (item: any, dateKey: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (period === 'all') return true;

    if (period === 'today') {
      return (item[dateKey] || '').split('T')[0] === todayStr;
    }
    if (period === 'week') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(item[dateKey] || Date.now()) >= sevenDaysAgo;
    }
    if (period === 'month') {
      return (item[dateKey] || '').substring(0, 7) === todayStr.substring(0, 7);
    }
    if (period === 'year') {
      return (item[dateKey] || '').substring(0, 4) === todayStr.substring(0, 4);
    }
    if (period === 'custom') {
      if (!startDate || !endDate) return true;
      const d = (item[dateKey] || '').split('T')[0];
      return d >= startDate && d <= endDate;
    }
    return true;
  };

  const filteredOrders = allOrders.filter((o) => filterItemByPeriod(o, 'createdAt'));
  const filteredExpenses = allExpenses.filter((e) => filterItemByPeriod(e, 'expenseDate'));

  const pnlRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
  const pnlExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const pnlNet = pnlRevenue - pnlExpenses;
  const pnlMargin = pnlRevenue > 0 ? ((pnlNet / pnlRevenue) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 select-none">
      {/* Sub Navigation Bar */}
      <div className="flex bg-olive-900 p-1 border border-gold-500/20 rounded-xl w-fit gap-1">
        <button
          onClick={() => setActiveTab('dishes')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'dishes' ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md' : 'text-olive-300'
          }`}
        >
          <Utensils className="w-4 h-4" /> Dishes & Menu
        </button>
        <button
          onClick={() => setActiveTab('pnl')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'pnl' ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md' : 'text-olive-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Profit & Loss Statement
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'about' ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md' : 'text-olive-300'
          }`}
        >
          <Store className="w-4 h-4" /> About Kish Mandhi
        </button>
      </div>

      {/* TAB 1: DISHES & MENU MANAGEMENT */}
      {activeTab === 'dishes' && (
        <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-gold-500/20">
            <div>
              <h3 className="text-base font-bold text-gold-500">Kish Mandhi Menu Dishes</h3>
              <span className="text-xs text-olive-300">Manage dishes, portion sizes & pricing</span>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 font-bold text-xs rounded-xl shadow-md hover:scale-105 transition-transform"
            >
              <Plus className="w-4 h-4" /> Add New Dish
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-olive-800 text-olive-300 font-semibold border-b border-gold-500/20">
                <tr>
                  <th className="p-3">Dish Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Quarter (₹)</th>
                  <th className="p-3">Half (₹)</th>
                  <th className="p-3">Full (₹)</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-500/10">
                {dishes.map((dish) => (
                  <tr key={dish.id} className="hover:bg-olive-800/40 transition-colors">
                    <td className="p-3 font-bold text-white">{dish.name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-gold-500/10 text-gold-400 border border-gold-500/30 rounded-md font-semibold text-[10px]">
                        Category #{dish.categoryId}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-olive-300">{dish.priceQuarter > 0 ? `₹${dish.priceQuarter}` : '-'}</td>
                    <td className="p-3 font-medium text-olive-300">{dish.priceHalf > 0 ? `₹${dish.priceHalf}` : '-'}</td>
                    <td className="p-3 font-bold text-gold-400">₹{dish.priceFull}</td>
                    <td className="p-3 flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(dish)}
                        className="px-2.5 py-1 bg-gold-500/10 border border-gold-500/30 text-gold-400 rounded-md font-semibold text-[11px] flex items-center gap-1 hover:bg-gold-500 hover:text-olive-950 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDish(dish.id)}
                        className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-md font-semibold text-[11px] flex items-center gap-1 hover:bg-rose-500 hover:text-white transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PROFIT & LOSS STATEMENT WITH TIMELINE */}
      {activeTab === 'pnl' && (
        <div className="space-y-5">
          {/* Timeline Period Filter Bar */}
          <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4">
            <div className="flex bg-olive-950 p-1 rounded-xl gap-1">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'year', label: 'This Year' },
                { id: 'all', label: 'All Time' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id as PnLPeriod)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    period === p.id ? 'bg-gold-500 text-olive-950 font-bold shadow' : 'text-olive-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-olive-300 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Custom:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 bg-olive-950 border border-gold-500/20 rounded text-white text-xs outline-none"
              />
              <span className="text-olive-300">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 bg-olive-950 border border-gold-500/20 rounded text-white text-xs outline-none"
              />
              <button
                onClick={() => setPeriod('custom')}
                className="px-3 py-1 bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 font-bold rounded text-xs"
              >
                Apply Range
              </button>
            </div>
          </div>

          {/* PnL Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="bg-olive-900 border border-gold-500/30 rounded-2xl p-5">
              <span className="text-xs text-olive-300 font-medium">Gross Food & Beverage Revenue</span>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">₹{pnlRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-olive-900 border border-gold-500/30 rounded-2xl p-5">
              <span className="text-xs text-olive-300 font-medium">Total Operating Expenses</span>
              <h3 className="text-2xl font-bold text-rose-500 mt-1">₹{pnlExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-olive-900 border border-gold-500/30 rounded-2xl p-5">
              <span className="text-xs text-olive-300 font-medium">Net Profit / (Loss)</span>
              <h3 className="text-2xl font-bold text-gold-500 mt-1">₹{pnlNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-olive-900 border border-gold-500/30 rounded-2xl p-5">
              <span className="text-xs text-olive-300 font-medium">Net Profit Margin Rate</span>
              <h3 className="text-2xl font-bold text-white mt-1">{pnlMargin}%</h3>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ABOUT KISH MANDHI */}
      {activeTab === 'about' && (
        <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-gold-500 flex items-center gap-2">
            <Store className="w-5 h-5" /> Kish Mandhi Profile
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-olive-800 border border-gold-500/20 rounded-xl space-y-1">
              <span className="text-olive-300">Restaurant Name</span>
              <p className="font-bold text-white text-sm">Kish Mandhi Arabic Restaurant</p>
            </div>
            <div className="p-4 bg-olive-800 border border-gold-500/20 rounded-xl space-y-1">
              <span className="text-olive-300">Cuisine Specialty</span>
              <p className="font-bold text-white text-sm">Authentic Yemeni & Malabar Mandhi Grill</p>
            </div>
            <div className="p-4 bg-olive-800 border border-gold-500/20 rounded-xl space-y-1">
              <span className="text-olive-300">GSTIN Tax Code</span>
              <p className="font-bold text-gold-400 text-sm">33AAACK8901M1Z5 (5% GST)</p>
            </div>
            <div className="p-4 bg-olive-800 border border-gold-500/20 rounded-xl space-y-1">
              <span className="text-olive-300">Outlet Location</span>
              <p className="font-bold text-white text-sm">Main Branch Highway Outlet</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Dish Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-olive-900 border border-gold-500 rounded-2xl p-6 w-[400px] space-y-4">
            <h4 className="text-base font-bold text-gold-500 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add New Menu Dish
            </h4>
            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-olive-300 block mb-1">Dish Name</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g., Alfaham Mandhi"
                  className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-olive-300 block mb-1">Category</label>
                <select
                  value={addCat}
                  onChange={(e) => setAddCat(e.target.value)}
                  className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-white outline-none"
                >
                  <option value="1">Mandhi Special</option>
                  <option value="2">Alfaham & Grill</option>
                  <option value="3">Starters & Sides</option>
                  <option value="4">Beverages</option>
                  <option value="5">Desserts</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-olive-300 block mb-1">Quarter Price (₹)</label>
                  <input
                    type="number"
                    value={addQtr}
                    onChange={(e) => setAddQtr(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-olive-300 block mb-1">Half Price (₹)</label>
                  <input
                    type="number"
                    value={addHalf}
                    onChange={(e) => setAddHalf(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-olive-300 block mb-1">Full Price (₹)</label>
                <input
                  type="number"
                  value={addFull}
                  onChange={(e) => setAddFull(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-white outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 bg-olive-800 text-white rounded-lg font-bold">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-gradient-to-r from-gold-500 to-gold-dark text-olive-950 rounded-lg font-extrabold">
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dish Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-olive-900 border border-gold-500 rounded-2xl p-6 w-[400px] space-y-4">
            <h4 className="text-base font-bold text-gold-500 flex items-center gap-2">
              <Edit2 className="w-5 h-5" /> Edit Dish Prices
            </h4>
            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-olive-300 block mb-1">Dish Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-white outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-olive-300 block mb-1">Quarter Price (₹)</label>
                  <input
                    type="number"
                    value={editQtr}
                    onChange={(e) => setEditQtr(e.target.value)}
                    className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-olive-300 block mb-1">Half Price (₹)</label>
                  <input
                    type="number"
                    value={editHalf}
                    onChange={(e) => setEditHalf(e.target.value)}
                    className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-olive-300 block mb-1">Full Price (₹)</label>
                <input
                  type="number"
                  value={editFull}
                  onChange={(e) => setEditFull(e.target.value)}
                  className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-white outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2 bg-olive-800 text-white rounded-lg font-bold">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-gradient-to-r from-gold-500 to-gold-dark text-olive-950 rounded-lg font-extrabold">
                  Update Prices
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
