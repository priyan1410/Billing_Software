import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, RefreshCw, CheckCircle2, AlertTriangle, Trash2, Edit3, Save, Search, Utensils, Receipt, Wallet, Table, FileSpreadsheet, Settings, Server, X, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Dish, Order, Expense } from '../../types';
import { useAppStore } from '../../store/useAppStore';

export const DbSettingsView: React.FC = () => {
  const { isDbConnected, dbErrorMessage, checkDbStatus } = useAppStore();
  const [activeTab, setActiveTab] = useState<'menu_items' | 'orders' | 'expenses'>('menu_items');
  const [menuItems, setMenuItems] = useState<Dish[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [testing, setTesting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Dish>>({});

  // MySQL Connection Settings State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '',
    database: 'kish_mandhi'
  });
  const [dbStatusMsg, setDbStatusMsg] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    loadAllData();
    loadDbConfig();
  }, [activeTab]);


  const loadDbConfig = async () => {
    try {
      if ((window as any).electronAPI?.getDbConfig) {
        const res = await (window as any).electronAPI.getDbConfig();
        if (res && res.success && res.data) {
          setDbConfig(prev => ({
            ...prev,
            host: res.data.host || 'localhost',
            port: String(res.data.port || 3306),
            user: res.data.user || 'root',
            database: res.data.database || 'kish_mandhi'
          }));
        }
      }
    } catch (e) {
      console.error('loadDbConfig error:', e);
    }
  };

  const loadAllData = async () => {
    try {
      if ((window as any).electronAPI) {
        const itemsRes = await (window as any).electronAPI.getMenuItems('all');
        const ordersRes = await (window as any).electronAPI.getOrders();
        const expRes = await (window as any).electronAPI.getExpenses();

        if (itemsRes && itemsRes.success && Array.isArray(itemsRes.data)) setMenuItems(itemsRes.data);
        if (ordersRes && ordersRes.success && Array.isArray(ordersRes.data)) setOrders(ordersRes.data);
        if (expRes && expRes.success && Array.isArray(expRes.data)) setExpenses(expRes.data);
      }
    } catch (err: any) {
      console.error('loadAllData error:', err.message);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.testDbConnection();
        await checkDbStatus();
        if (res && res.message) {
          alert(res.message);
        } else {
          alert('✓ Database status check completed.');
        }
      }
    } catch (e: any) {
      alert('Database Ping Error: ' + e.message);
    } finally {
      setTesting(false);
    }
  };

  const handleTestCustomDbConnection = async () => {
    setTesting(true);
    setDbStatusMsg('Connecting to MySQL server...');
    try {
      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.testDbConnection(dbConfig);
        await checkDbStatus();
        if (res && res.message) {
          setDbStatusMsg(res.message);
        } else {
          setDbStatusMsg('Connection test completed.');
        }
      }
    } catch (err: any) {
      setDbStatusMsg('❌ Connection Failed: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveDbConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setDbStatusMsg('Connecting and saving MySQL credentials...');
    try {
      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.saveDbConfig(dbConfig);
        await checkDbStatus();
        if (res && res.success) {
          alert(res.message || '✓ MySQL Connected & Saved Successfully!');
          setShowConfigModal(false);
          await loadAllData();
        } else {
          setDbStatusMsg(res?.message || '❌ Could not connect to MySQL with these credentials.');
        }
      }
    } catch (err: any) {
      setDbStatusMsg('❌ Error: ' + err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // Helper to trigger Excel CSV download with UTF-8 BOM for Microsoft Excel compatibility
  const downloadCsvForExcel = (filename: string, csvContent: string) => {
    const bom = "\uFEFF"; // UTF-8 Byte Order Mark for Excel
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMenuExcel = () => {
    let csv = "ID,Category ID,Dish Name (English & Tamil),Quarter Price (INR),Half Price (INR),Full Price (INR),Available\n";
    menuItems.forEach((item) => {
      const cleanName = `"${item.name.replace(/"/g, '""')}"`;
      csv += `${item.id},${item.categoryId},${cleanName},${item.priceQuarter},${item.priceHalf},${item.priceFull},${item.isAvailable ? 'Yes' : 'No'}\n`;
    });
    downloadCsvForExcel(`Kish_Mandhi_Menu_Dishes_${Date.now()}.csv`, csv);
    alert('✓ Menu Dishes exported as Excel Spreadsheet (.CSV)!');
  };

  const handleExportOrdersExcel = () => {
    let csv = "Order Number,Order Type,Subtotal (INR),GST Tax (INR),Discount (INR),Grand Total (INR),Payment Mode,Created Date\n";
    orders.forEach((o) => {
      csv += `"${o.orderNumber}","${o.orderType}",${o.subtotal},${o.taxAmount},${o.discountAmount},${o.grandTotal},"${o.paymentMode}","${o.createdAt || ''}"\n`;
    });
    downloadCsvForExcel(`Kish_Mandhi_Completed_Orders_${Date.now()}.csv`, csv);
    alert('✓ Completed Orders exported as Excel Spreadsheet (.CSV)!');
  };

  const handleExportExpensesExcel = () => {
    let csv = "ID,Category,Description,Amount (INR),Date,Payment Mode\n";
    expenses.forEach((e) => {
      const cleanDesc = `"${e.description.replace(/"/g, '""')}"`;
      csv += `${e.id},"${e.category}",${cleanDesc},${e.amount},"${e.expenseDate}","${e.paymentMode || 'Cash'}"\n`;
    });
    downloadCsvForExcel(`Kish_Mandhi_Expenses_Ledger_${Date.now()}.csv`, csv);
    alert('✓ Expenses Ledger exported as Excel Spreadsheet (.CSV)!');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r\n|\n/);
        if (lines.length <= 1) {
          alert('Excel CSV file is empty or missing headers!');
          return;
        }

        const newDishes: any[] = [];
        // Skip header row (line 0)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
          if (parts.length >= 6) {
            const id = parseInt(parts[0].replace(/"/g, '')) || (100 + i);
            const categoryId = parseInt(parts[1].replace(/"/g, '')) || 1;
            const name = parts[2].replace(/^"|"$/g, '').trim();
            const priceQuarter = parseFloat(parts[3].replace(/"/g, '')) || 0;
            const priceHalf = parseFloat(parts[4].replace(/"/g, '')) || 0;
            const priceFull = parseFloat(parts[5].replace(/"/g, '')) || 0;

            if (name) {
              newDishes.push({
                id,
                categoryId,
                name,
                priceQuarter,
                priceHalf,
                priceFull,
                isAvailable: true
              });
            }
          }
        }

        if (newDishes.length > 0 && (window as any).electronAPI) {
          await (window as any).electronAPI.importBackup({ menuItems: newDishes });
          await loadAllData();
          alert(`✓ Successfully imported ${newDishes.length} menu dishes from Excel Spreadsheet!`);
        } else {
          alert('No valid dish rows found in Excel CSV file.');
        }
      } catch (err) {
        alert('Failed to parse Excel CSV file. Ensure columns match: ID, Category ID, Dish Name, Quarter, Half, Full.');
      }
    };
  };

  const handleStartEditDish = (dish: Dish) => {
    setEditingId(dish.id);
    setEditForm({ ...dish });
  };

  const handleSaveEditDish = async () => {
    if (!editingId || !editForm.name) return;
    if ((window as any).electronAPI) {
      await (window as any).electronAPI.updateMenuItem({ id: editingId, ...editForm });
      setEditingId(null);
      await loadAllData();
      alert('✓ Dish record updated in database!');
    }
  };

  const handleDeleteDish = async (id: number) => {
    if (confirm('Delete this dish item from database?')) {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.deleteMenuItem(id);
        await loadAllData();
      }
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (confirm('Delete this expense record?')) {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.deleteExpense(id);
        await loadAllData();
      }
    }
  };

  const filteredMenuItems = menuItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredOrders = orders.filter(o => o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) || o.paymentMode.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredExpenses = expenses.filter(e => e.description.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 select-none max-w-5xl pb-10">
      {/* Database Engine Header */}
      <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDbConnected ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'}`}>
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Database Controller & Excel Spreadsheet Manager</h3>
                {isDbConnected ? (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> MYSQL CONNECTED & ACTIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold rounded-md flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-rose-400" /> MYSQL DISCONNECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-olive-300 mt-1">Configure MySQL database server or export/import tables as Excel spreadsheets</p>
            </div>
          </div>


          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setDbStatusMsg(null);
                loadDbConfig();
                setShowConfigModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 hover:opacity-90 font-extrabold text-xs rounded-xl shadow-md transition-all"
            >
              <Settings className="w-3.5 h-3.5" /> Configure MySQL
            </button>

            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center gap-1.5 px-3 py-2 bg-olive-800 border border-gold-500/30 text-gold-400 hover:bg-gold-500 hover:text-olive-950 font-bold text-xs rounded-xl transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} /> Ping DB
            </button>

            <button
              onClick={
                activeTab === 'menu_items'
                  ? handleExportMenuExcel
                  : activeTab === 'orders'
                  ? handleExportOrdersExcel
                  : handleExportExpensesExcel
              }
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md hover:scale-[1.02] transition-transform"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel (.CSV)
            </button>

            <label className="flex items-center gap-1.5 px-3 py-2 bg-olive-800 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-olive-950 font-extrabold text-xs rounded-xl cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5" /> Import Excel (.CSV)
              <input type="file" accept=".csv, .xlsx" onChange={handleImportExcel} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Record Counter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-olive-900 border border-gold-500/20 p-2 rounded-2xl">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('menu_items')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'menu_items'
                ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md'
                : 'text-olive-300 hover:text-white'
            }`}
          >
            <Utensils className="w-4 h-4" /> `menu_items` ({menuItems.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md'
                : 'text-olive-300 hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4" /> `orders` ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'expenses'
                ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md'
                : 'text-olive-300 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" /> `expenses` ({expenses.length})
          </button>
        </div>

        {/* Live Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-olive-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab} data...`}
            className="w-full pl-9 pr-3 py-1.5 bg-olive-950 border border-gold-500/20 rounded-xl text-xs text-white placeholder-olive-300 focus:outline-none focus:border-gold-500"
          />
        </div>
      </div>

      {/* Table 1: menu_items Data Editor */}
      {activeTab === 'menu_items' && (
        <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-gold-500 flex items-center gap-2">
              <Table className="w-4 h-4" /> Raw Table: `menu_items` (Dishes & Prices Editor)
            </h4>
            <button
              onClick={handleExportMenuExcel}
              className="text-xs text-emerald-400 hover:underline font-bold flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Download Excel Sheet
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-olive-950 text-gold-400 border-b border-gold-500/20">
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Dish Name & Tamil Translation</th>
                  <th className="py-2.5 px-3">Quarter (₹)</th>
                  <th className="py-2.5 px-3">Half (₹)</th>
                  <th className="py-2.5 px-3">Full (₹)</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-500/10">
                {filteredMenuItems.map((dish) => (
                  <tr key={dish.id} className="hover:bg-olive-800/40">
                    <td className="py-3 px-3 font-mono text-olive-300">{dish.id}</td>
                    <td className="py-3 px-3 font-bold text-white max-w-xs">
                      {editingId === dish.id ? (
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full bg-olive-950 border border-gold-500/30 rounded p-1 text-xs text-white"
                        />
                      ) : (
                        dish.name
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold text-gold-400">
                      {editingId === dish.id ? (
                        <input
                          type="number"
                          value={editForm.priceQuarter || 0}
                          onChange={(e) => setEditForm({ ...editForm, priceQuarter: Number(e.target.value) })}
                          className="w-20 bg-olive-950 border border-gold-500/30 rounded p-1 text-xs text-white"
                        />
                      ) : (
                        `₹${dish.priceQuarter}`
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold text-gold-400">
                      {editingId === dish.id ? (
                        <input
                          type="number"
                          value={editForm.priceHalf || 0}
                          onChange={(e) => setEditForm({ ...editForm, priceHalf: Number(e.target.value) })}
                          className="w-20 bg-olive-950 border border-gold-500/30 rounded p-1 text-xs text-white"
                        />
                      ) : (
                        `₹${dish.priceHalf}`
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold text-gold-400">
                      {editingId === dish.id ? (
                        <input
                          type="number"
                          value={editForm.priceFull || 0}
                          onChange={(e) => setEditForm({ ...editForm, priceFull: Number(e.target.value) })}
                          className="w-20 bg-olive-950 border border-gold-500/30 rounded p-1 text-xs text-white"
                        />
                      ) : (
                        `₹${dish.priceFull}`
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {editingId === dish.id ? (
                        <button onClick={handleSaveEditDish} className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-500 transition-colors">
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => handleStartEditDish(dish)} className="p-1.5 bg-olive-800 text-gold-400 border border-gold-500/30 rounded hover:bg-gold-500 hover:text-olive-950 transition-colors">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteDish(dish.id)} className="p-1.5 bg-olive-800 text-rose-400 border border-rose-500/30 rounded hover:bg-rose-600 hover:text-white transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table 2: orders Data Inspector */}
      {activeTab === 'orders' && (
        <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-gold-500 flex items-center gap-2">
              <Table className="w-4 h-4" /> Raw Table: `orders` (Completed Billing History)
            </h4>
            <button
              onClick={handleExportOrdersExcel}
              className="text-xs text-emerald-400 hover:underline font-bold flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Download Excel Sheet
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-olive-950 text-gold-400 border-b border-gold-500/20">
                  <th className="py-2.5 px-3">Order #</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Subtotal</th>
                  <th className="py-2.5 px-3">GST Tax</th>
                  <th className="py-2.5 px-3">Grand Total</th>
                  <th className="py-2.5 px-3">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-500/10">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-olive-300">No completed orders logged yet.</td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-olive-800/40">
                      <td className="py-3 px-3 font-bold text-white">{o.orderNumber}</td>
                      <td className="py-3 px-3 font-semibold text-olive-300">{o.orderType}</td>
                      <td className="py-3 px-3">₹{Number(o.subtotal || 0).toFixed(2)}</td>
                      <td className="py-3 px-3">₹{Number(o.taxAmount || 0).toFixed(2)}</td>
                      <td className="py-3 px-3 font-extrabold text-gold-400">₹{Number(o.grandTotal || 0).toFixed(2)}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">{o.paymentMode}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table 3: expenses Data Inspector */}
      {activeTab === 'expenses' && (
        <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-gold-500 flex items-center gap-2">
              <Table className="w-4 h-4" /> Raw Table: `expenses` (Financial Ledger)
            </h4>
            <button
              onClick={handleExportExpensesExcel}
              className="text-xs text-emerald-400 hover:underline font-bold flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Download Excel Sheet
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-olive-950 text-gold-400 border-b border-gold-500/20">
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Amount (₹)</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-500/10">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-olive-800/40">
                    <td className="py-3 px-3 font-bold text-white">{exp.category}</td>
                    <td className="py-3 px-3 text-olive-300">{exp.description}</td>
                    <td className="py-3 px-3 font-bold text-rose-400">₹{Number(exp.amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono text-olive-300">
                      {typeof exp.expenseDate === 'string' ? exp.expenseDate : exp.expenseDate ? new Date(exp.expenseDate).toISOString().split('T')[0] : '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 bg-olive-800 text-rose-400 border border-rose-500/30 rounded hover:bg-rose-600 hover:text-white transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MySQL Connection Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-olive-900 border border-gold-500 rounded-2xl p-6 w-full max-w-lg space-y-4 relative shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-gold-500/20">
              <div className="flex items-center gap-2 text-gold-500">
                <Server className="w-5 h-5" />
                <h4 className="text-base font-bold">Configure MySQL Database Connection</h4>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="text-olive-300 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {dbStatusMsg && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${dbStatusMsg.includes('✓') ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : dbStatusMsg.includes('Connecting') ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300 animate-pulse' : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'}`}>
                {dbStatusMsg}
              </div>
            )}

            {/* Accordion Guide */}
            <div className="bg-olive-950/80 border border-gold-500/20 rounded-xl overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="w-full px-3.5 py-2 bg-gold-500/10 hover:bg-gold-500/20 text-gold-300 font-bold flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-gold-400" />
                  <span>How to install & setup MySQL Server</span>
                </div>
                {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showGuide && (
                <div className="p-3.5 space-y-2 text-olive-200 bg-olive-950 leading-relaxed border-t border-gold-500/10 text-[11px] max-h-60 overflow-y-auto">
                  <p className="font-bold text-gold-400">Step-by-Step MySQL Installation Guide:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-olive-300">
                    <li><b>Download Installer:</b> Go to <span className="text-gold-400 font-mono">dev.mysql.com/downloads/installer/</span> and download <i>mysql-installer-community</i>.</li>
                    <li><b>Run Setup:</b> Select <b>Server Only</b> (or Developer Default) and click Next.</li>
                    <li><b>Port Configuration:</b> Keep TCP/IP Port set to <code className="text-gold-400 font-mono">3306</code> and click Next.</li>
                    <li><b>Set Password:</b> Enter a Root Password (e.g. <code className="text-gold-400 font-mono">Suriy@24</code>). Remember this password!</li>
                    <li><b>Windows Service:</b> Ensure <i>Start MySQL at System Startup</i> is checked and click Execute.</li>
                    <li><b>Connect App:</b> Enter Host (<code className="text-gold-400 font-mono">localhost</code>), Port (<code className="text-gold-400 font-mono">3306</code>), User (<code className="text-gold-400 font-mono">root</code>), and Password below, then click <b>Save & Connect</b>.</li>
                  </ol>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveDbConfig} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-olive-300 block mb-1 font-semibold">MySQL Host / IP</label>
                  <input
                    type="text"
                    value={dbConfig.host}
                    onChange={e => {
                      setDbConfig({ ...dbConfig, host: e.target.value });
                      setDbStatusMsg(null);
                    }}
                    placeholder="localhost or 192.168.1.50"
                    className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-xl text-white focus:outline-none focus:border-gold-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-olive-300 block mb-1 font-semibold">Port</label>
                  <input
                    type="number"
                    value={dbConfig.port}
                    onChange={e => {
                      setDbConfig({ ...dbConfig, port: e.target.value });
                      setDbStatusMsg(null);
                    }}
                    placeholder="3306"
                    className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-xl text-white focus:outline-none focus:border-gold-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-olive-300 block mb-1 font-semibold">Username</label>
                  <input
                    type="text"
                    value={dbConfig.user}
                    onChange={e => {
                      setDbConfig({ ...dbConfig, user: e.target.value });
                      setDbStatusMsg(null);
                    }}
                    placeholder="root"
                    className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-xl text-white focus:outline-none focus:border-gold-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-olive-300 block mb-1 font-semibold">Password</label>
                  <input
                    type="password"
                    value={dbConfig.password}
                    onChange={e => {
                      setDbConfig({ ...dbConfig, password: e.target.value });
                      setDbStatusMsg(null);
                    }}
                    placeholder="e.g. Suriy@24"
                    className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-xl text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-olive-300 block mb-1 font-semibold">Database Name</label>
                <input
                  type="text"
                  value={dbConfig.database}
                  onChange={e => {
                    setDbConfig({ ...dbConfig, database: e.target.value });
                    setDbStatusMsg(null);
                  }}
                  placeholder="kish_mandhi"
                  className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-xl text-white focus:outline-none focus:border-gold-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestCustomDbConnection}
                  disabled={testing}
                  className="flex-1 py-2.5 bg-olive-800 border border-gold-500/30 text-gold-400 font-bold rounded-xl hover:bg-gold-500 hover:text-olive-950 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} /> Test Connection
                </button>

                <button
                  type="submit"
                  disabled={savingConfig}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
