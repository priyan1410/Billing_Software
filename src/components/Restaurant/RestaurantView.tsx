import React, { useState, useEffect } from 'react';
import { Utensils, TrendingUp, Store, Plus, Edit2, Edit3, Trash2, Calendar, Receipt, Printer, Tags, FolderPlus, Download, Upload, FileSpreadsheet, FileJson, X, CheckCircle2, RefreshCw } from 'lucide-react';
import { Dish, PnLPeriod } from '../../types';
import { BillDetailModal } from './BillDetailModal';
import { useAuthStore } from '../../store/useAuthStore';
import { formatDateDDMMYYYY, displayDateRange, isoToDDMMYYYY, ddmmyyyyToIso } from '../../utils/dateUtils';

export const RestaurantView: React.FC = () => {
  const { restaurantDetails } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'dishes' | 'categories' | 'pnl'>('dishes');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([
    { id: 1, name: 'Mandhi Special' },
    { id: 2, name: 'Alfaham & Grill' },
    { id: 3, name: 'Starters & Sides' },
    { id: 4, name: 'Beverages' },
    { id: 5, name: 'Desserts' }
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPnlBill, setSelectedPnlBill] = useState<any | null>(null);

  // Category Management State
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [showEditCatModal, setShowEditCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Add Dish Form State
  const [addName, setAddName] = useState('');
  const [addCat, setAddCat] = useState('1');
  const [addCustomCat, setAddCustomCat] = useState('');
  const [addQtr, setAddQtr] = useState('');
  const [addHalf, setAddHalf] = useState('');
  const [addFull, setAddFull] = useState('');

  // Edit Dish Form State
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCat, setEditCat] = useState('1');
  const [editCustomCat, setEditCustomCat] = useState('');
  const [editQtr, setEditQtr] = useState('');
  const [editHalf, setEditHalf] = useState('');
  const [editFull, setEditFull] = useState('');

  // PnL Period Timeline State
  const [period, setPeriod] = useState<PnLPeriod>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);

  const handleSelectPeriod = (selectedP: PnLPeriod) => {
    setPeriod(selectedP);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (selectedP === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (selectedP === 'week') {
      const sevenDaysAgo = new Date(year, month, day - 7);
      const sY = sevenDaysAgo.getFullYear();
      const sM = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
      const sD = String(sevenDaysAgo.getDate()).padStart(2, '0');
      setStartDate(`${sY}-${sM}-${sD}`);
      setEndDate(todayStr);
    } else if (selectedP === 'month') {
      const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDayObj = new Date(year, month + 1, 0);
      const lD = String(lastDayObj.getDate()).padStart(2, '0');
      setStartDate(firstDay);
      setEndDate(`${year}-${String(month + 1).padStart(2, '0')}-${lD}`);
    } else if (selectedP === 'year') {
      setStartDate(`${year}-01-01`);
      setEndDate(`${year}-12-31`);
    } else if (selectedP === 'all') {
      let oldest = '2020-01-01';
      if (allOrders.length > 0) {
        const sorted = allOrders
          .map(o => String(o.createdAt || o.orderDate || o.created_at || '').split('T')[0])
          .filter(Boolean)
          .sort();
        if (sorted[0]) oldest = sorted[0];
      }
      setStartDate(oldest);
      setEndDate(todayStr);
    }
  };

  useEffect(() => {
    loadCategories();
    loadDishes();
    loadFinancials();
    handleSelectPeriod('today');
  }, []);

  const loadCategories = async () => {
    try {
      if ((window as any).electronAPI?.getCategories) {
        const res = await (window as any).electronAPI.getCategories();
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setCategories(res.data.map((c: any) => ({ id: c.id, name: c.name })));
        }
      }
    } catch (err: any) {
      console.error('loadCategories error:', err.message);
    }
  };

  const loadDishes = async () => {
    try {
      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.getMenuItems('all');
        if (res && res.success && Array.isArray(res.data)) setDishes(res.data);
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
    } catch (err: any) {
      console.error('loadDishes error:', err.message);
    }
  };

  const loadFinancials = async () => {
    try {
      if ((window as any).electronAPI) {
        const ordersRes = await (window as any).electronAPI.getOrders();
        const expRes = await (window as any).electronAPI.getExpenses();
        if (ordersRes && ordersRes.success && Array.isArray(ordersRes.data)) setAllOrders(ordersRes.data);
        if (expRes && expRes.success && Array.isArray(expRes.data)) setAllExpenses(expRes.data);
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
    } catch (err: any) {
      console.error('loadFinancials error:', err.message);
    }
  };

  // Category Management Handlers
  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    if ((window as any).electronAPI?.saveCategory) {
      const res = await (window as any).electronAPI.saveCategory({ name: newCatName.trim() });
      if (res && res.success === false) {
        alert(res.message || 'Failed to save food category.');
        return;
      }
      await loadCategories();
    } else {
      const nextId = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1;
      setCategories(prev => [...prev, { id: nextId, name: newCatName.trim() }]);
    }

    setNewCatName('');
    setShowAddCatModal(false);
  };

  const handleOpenEditCategory = (cat: { id: number; name: string }) => {
    setEditCatId(cat.id);
    setEditCategoryName(cat.name);
    setShowEditCatModal(true);
  };

  const handleEditCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCatId || !editCategoryName.trim()) return;

    if ((window as any).electronAPI?.updateCategory) {
      const res = await (window as any).electronAPI.updateCategory({ id: editCatId, name: editCategoryName.trim() });
      if (res && res.success === false) {
        alert(res.message || 'Failed to update food category.');
        return;
      }
      await loadCategories();
    } else {
      setCategories(prev => prev.map(c => c.id === editCatId ? { ...c, name: editCategoryName.trim() } : c));
    }

    setShowEditCatModal(false);
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    const dishCount = dishes.filter(d => Number(d.categoryId) === Number(id)).length;
    if (dishCount > 0) {
      alert(`Cannot delete category "${name}" because it contains ${dishCount} menu dish(es). Please delete or reassign those dishes first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;

    if ((window as any).electronAPI?.deleteCategory) {
      const res = await (window as any).electronAPI.deleteCategory(id);
      if (res && res.success === false) {
        alert(res.message || 'Failed to delete category.');
        return;
      }
      await loadCategories();
    } else {
      setCategories(prev => prev.filter(c => c.id !== id));
    }
  };

  // Add Dish Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addFull) return;

    let targetCatId = Number(addCat);
    if (addCat === 'custom') {
      if (!addCustomCat.trim()) {
        alert('Please enter a custom category name');
        return;
      }
      if ((window as any).electronAPI?.saveCategory) {
        const catRes = await (window as any).electronAPI.saveCategory({ name: addCustomCat.trim() });
        if (catRes && catRes.success && catRes.data?.id) {
          targetCatId = Number(catRes.data.id);
        } else if (catRes && catRes.success === false) {
          alert(catRes.message || 'Failed to save custom category to database');
          return;
        }
        await loadCategories();
      } else {
        const newId = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1;
        const newCategoryObj = { id: newId, name: addCustomCat.trim() };
        setCategories(prev => [...prev, newCategoryObj]);
        targetCatId = newId;
      }
    }

    const payload = {
      name: addName,
      category_id: targetCatId,
      price_quarter: Number(addQtr || 0),
      price_half: Number(addHalf || 0),
      price_full: Number(addFull)
    };

    if ((window as any).electronAPI) {
      const res = await (window as any).electronAPI.saveMenuItem(payload);
      if (res && res.success === false) {
        alert(res.message || '❌ Failed to save dish to MySQL database. Please check MySQL connection.');
        return;
      }
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
      const res = await (window as any).electronAPI.updateMenuItem(payload);
      if (res && res.success === false) {
        alert(res.message || '❌ Failed to update dish in MySQL database.');
        return;
      }
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

  // Helper for local YYYY-MM-DD string
  const toLocalDateString = (val: any): string => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val).split('T')[0];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Timeline Filter Math
  const filterItemByPeriod = (item: any, dateKey: string) => {
    const rawVal = item ? item[dateKey] : null;
    if (!rawVal) return false;

    const itemDateStr = toLocalDateString(rawVal);
    const todayStr = toLocalDateString(new Date());

    if (period === 'all') return true;

    if (period === 'today') {
      return itemDateStr === todayStr;
    }
    if (period === 'week') {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const itemDate = new Date(rawVal);
      return itemDate >= sevenDaysAgo;
    }
    if (period === 'month') {
      return itemDateStr.substring(0, 7) === todayStr.substring(0, 7);
    }
    if (period === 'year') {
      return itemDateStr.substring(0, 4) === todayStr.substring(0, 4);
    }
    if (period === 'custom') {
      if (!startDate && !endDate) return true;
      if (startDate && itemDateStr < startDate) return false;
      if (endDate && itemDateStr > endDate) return false;
      return true;
    }
    return true;
  };

  const filteredOrders = allOrders.filter((o) => filterItemByPeriod(o, 'createdAt'));
  const filteredExpenses = allExpenses.filter((e) => filterItemByPeriod(e, 'expenseDate'));

  const pnlRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
  const pnlExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const pnlNet = pnlRevenue - pnlExpenses;
  const pnlMargin = pnlRevenue > 0 ? ((pnlNet / pnlRevenue) * 100).toFixed(1) : '0';

  // PnL Export & Import State
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<PnLPeriod>('month');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [importMsg, setImportMsg] = useState('');

  const downloadBlob = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPnLData = (format: 'csv' | 'json', customPeriod?: PnLPeriod, customStart?: string, customEnd?: string) => {
    const selectedP = customPeriod || exportPeriod;
    const start = customStart !== undefined ? customStart : (selectedP === 'custom' ? exportStartDate : startDate);
    const end = customEnd !== undefined ? customEnd : (selectedP === 'custom' ? exportEndDate : endDate);

    let targetOrders = allOrders;
    let targetExpenses = allExpenses;

    const todayStr = toLocalDateString(new Date());

    if (selectedP === 'today') {
      targetOrders = allOrders.filter(o => toLocalDateString(o.createdAt || o.orderDate || o.created_at) === todayStr);
      targetExpenses = allExpenses.filter(e => toLocalDateString(e.expenseDate || e.created_at) === todayStr);
    } else if (selectedP === 'week') {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      targetOrders = allOrders.filter(o => new Date(o.createdAt || o.orderDate || o.created_at) >= sevenDaysAgo);
      targetExpenses = allExpenses.filter(e => new Date(e.expenseDate || e.created_at) >= sevenDaysAgo);
    } else if (selectedP === 'month') {
      targetOrders = allOrders.filter(o => toLocalDateString(o.createdAt || o.orderDate || o.created_at).substring(0, 7) === todayStr.substring(0, 7));
      targetExpenses = allExpenses.filter(e => toLocalDateString(e.expenseDate || e.created_at).substring(0, 7) === todayStr.substring(0, 7));
    } else if (selectedP === 'year') {
      targetOrders = allOrders.filter(o => toLocalDateString(o.createdAt || o.orderDate || o.created_at).substring(0, 4) === todayStr.substring(0, 4));
      targetExpenses = allExpenses.filter(e => toLocalDateString(e.expenseDate || e.created_at).substring(0, 4) === todayStr.substring(0, 4));
    } else if (selectedP === 'custom') {
      targetOrders = allOrders.filter(o => {
        const d = toLocalDateString(o.createdAt || o.orderDate || o.created_at);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
      targetExpenses = allExpenses.filter(e => {
        const d = toLocalDateString(e.expenseDate || e.created_at);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    const rev = targetOrders.reduce((sum, o) => sum + Number(o.grandTotal || o.grand_total || o.total || 0), 0);
    const exp = targetExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const net = rev - exp;
    const margin = rev > 0 ? ((net / rev) * 100).toFixed(1) : '0';

    const periodLabel = selectedP === 'custom'
      ? `Custom_${start || 'Start'}_to_${end || 'End'}`
      : selectedP.toUpperCase();

    const timeStampStr = new Date().toISOString().slice(0, 10);
    const baseFileName = `KishMandhi_PnL_${periodLabel}_${timeStampStr}`;

    if (format === 'json') {
      const reportObj = {
        report: 'Profit & Loss Financial Statement',
        restaurant: restaurantDetails?.companyName || 'Kish Mandhi',
        period: periodLabel,
        exportDate: new Date().toISOString(),
        summary: {
          grossRevenue: rev,
          totalExpenses: exp,
          netProfit: net,
          netMarginPercent: Number(margin),
          orderCount: targetOrders.length,
          expenseCount: targetExpenses.length
        },
        orders: targetOrders,
        expenses: targetExpenses
      };
      downloadBlob(JSON.stringify(reportObj, null, 2), `${baseFileName}.json`, 'application/json');
    } else {
      // CSV format
      let csv = `PROFIT & LOSS FINANCIAL STATEMENT - ${restaurantDetails?.companyName || 'Kish Mandhi'}\n`;
      csv += `Period,${periodLabel}\n`;
      csv += `Exported At,${new Date().toLocaleString()}\n`;
      csv += `Gross Revenue (INR),${rev.toFixed(2)}\n`;
      csv += `Total Expenses (INR),${exp.toFixed(2)}\n`;
      csv += `Net Profit / Loss (INR),${net.toFixed(2)}\n`;
      csv += `Net Profit Margin (%),${margin}%\n\n`;

      csv += `--- INVOICE ORDERS LEDGER (${targetOrders.length} Records) ---\n`;
      csv += `Order #,Date,Payment Mode,Subtotal,Tax,Discount,Grand Total\n`;
      targetOrders.forEach(o => {
        const num = o.orderNumber || o.order_number || `KM-${o.id}`;
        const dt = toLocalDateString(o.createdAt || o.orderDate || o.created_at);
        const pm = o.paymentMode || o.payment_mode || 'Cash';
        const sub = Number(o.subtotal || 0).toFixed(2);
        const tax = Number(o.taxAmount || o.tax_amount || 0).toFixed(2);
        const disc = Number(o.discountAmount || o.discount_amount || 0).toFixed(2);
        const total = Number(o.grandTotal || o.grand_total || o.total || 0).toFixed(2);
        csv += `"${num}","${dt}","${pm}",${sub},${tax},${disc},${total}\n`;
      });

      csv += `\n--- OPERATING EXPENSES LEDGER (${targetExpenses.length} Records) ---\n`;
      csv += `Expense ID,Date,Title / Description,Category,Payment Method,Amount\n`;
      targetExpenses.forEach(e => {
        const id = e.id || '';
        const dt = toLocalDateString(e.expenseDate || e.created_at);
        const title = (e.description || e.title || e.name || '').replace(/"/g, '""');
        const cat = e.category || 'General';
        const pm = e.paymentMode || e.payment_mode || 'Cash';
        const amt = Number(e.amount || 0).toFixed(2);
        csv += `"${id}","${dt}","${title}","${cat}","${pm}",${amt}\n`;
      });

      downloadBlob(csv, `${baseFileName}.csv`, 'text/csv;charset=utf-8;');
    }
    setShowExportModal(false);
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('importing');
    setImportMsg('Reading financial data file...');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        let parsedOrders: any[] = [];
        let parsedExpenses: any[] = [];

        if (file.name.endsWith('.json')) {
          const jsonObj = JSON.parse(content);
          if (jsonObj.orders && Array.isArray(jsonObj.orders)) parsedOrders = jsonObj.orders;
          if (jsonObj.expenses && Array.isArray(jsonObj.expenses)) parsedExpenses = jsonObj.expenses;
          if (Array.isArray(jsonObj)) {
            parsedOrders = jsonObj.filter(item => item.grandTotal || item.grand_total || item.orderNumber);
            parsedExpenses = jsonObj.filter(item => item.amount && !item.grandTotal);
          }
        } else {
          // CSV Parsing
          const lines = content.split(/\r\n|\n/);
          let currentSection: 'orders' | 'expenses' | null = null;

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.includes('INVOICE ORDERS LEDGER')) {
              currentSection = 'orders';
              continue;
            }
            if (trimmed.includes('OPERATING EXPENSES LEDGER')) {
              currentSection = 'expenses';
              continue;
            }

            if (currentSection === 'orders' && !trimmed.startsWith('Order #')) {
              const parts = trimmed.split(',').map(p => p.replace(/^"|"$/g, '').trim());
              if (parts.length >= 7) {
                parsedOrders.push({
                  order_number: parts[0],
                  created_at: parts[1],
                  payment_mode: parts[2],
                  subtotal: parseFloat(parts[3]) || 0,
                  tax_amount: parseFloat(parts[4]) || 0,
                  discount_amount: parseFloat(parts[5]) || 0,
                  grand_total: parseFloat(parts[6]) || 0
                });
              }
            } else if (currentSection === 'expenses' && !trimmed.startsWith('Expense ID')) {
              const parts = trimmed.split(',').map(p => p.replace(/^"|"$/g, '').trim());
              if (parts.length >= 6) {
                parsedExpenses.push({
                  expense_date: parts[1],
                  description: parts[2],
                  category: parts[3],
                  payment_mode: parts[4],
                  amount: parseFloat(parts[5]) || 0
                });
              }
            }
          }
        }

        if (parsedOrders.length === 0 && parsedExpenses.length === 0) {
          setImportStatus('error');
          setImportMsg('No valid orders or expenses found in the selected file.');
          return;
        }

        if ((window as any).electronAPI?.importBackup) {
          const res = await (window as any).electronAPI.importBackup({ orders: parsedOrders, expenses: parsedExpenses });
          if (res && res.success) {
            setImportStatus('success');
            setImportMsg(`✓ Successfully imported ${res.data?.importedOrders || parsedOrders.length} Orders and ${res.data?.importedExpenses || parsedExpenses.length} Expenses!`);
            await loadFinancials();
            setTimeout(() => {
              setShowImportModal(false);
              setImportStatus('idle');
            }, 2500);
          } else {
            setImportStatus('error');
            setImportMsg(res?.message || 'Failed to save imported financial records.');
          }
        } else {
          setImportStatus('error');
          setImportMsg('Electron Database API not available in web preview mode.');
        }
      } catch (err: any) {
        setImportStatus('error');
        setImportMsg('Failed to parse file: ' + err.message);
      }
    };

    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="space-y-6 select-none">
      {/* Sub Navigation Bar */}
      <div className="flex bg-olive-900 p-1 border border-gold-500/20 rounded-xl w-fit gap-1">
        <button
          onClick={() => setActiveTab('dishes')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'dishes' ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md' : 'text-olive-300'
            }`}
        >
          <Utensils className="w-4 h-4" /> Dishes & Menu
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'categories' ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md' : 'text-olive-300'
            }`}
        >
          <Tags className="w-4 h-4" /> Food Categories
        </button>
        <button
          onClick={() => setActiveTab('pnl')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'pnl' ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md' : 'text-olive-300'
            }`}
        >
          <TrendingUp className="w-4 h-4" /> Profit & Loss Statement
        </button>
      </div>

      {/* TAB: FOOD CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-gold-500/20">
            <div>
              <h3 className="text-base font-bold text-gold-500">Food Categories Management</h3>
              <span className="text-xs text-olive-300">Add, edit, or remove menu categories across POS Billing & Tokens</span>
            </div>
            <button
              onClick={() => {
                setNewCatName('');
                setShowAddCatModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 font-bold text-xs rounded-xl shadow-md hover:scale-105 transition-transform"
            >
              <FolderPlus className="w-4 h-4" /> Add Food Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const dishCount = dishes.filter(d => Number(d.categoryId) === Number(cat.id)).length;
              return (
                <div key={cat.id} className="bg-olive-950 border border-gold-500/20 rounded-xl p-4 flex justify-between items-center shadow-lg hover:border-gold-500/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 font-bold">
                      <Tags className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{cat.name}</h4>
                      <p className="text-xs text-olive-300 mt-0.5">{dishCount} dish{dishCount === 1 ? '' : 'es'} in menu</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditCategory(cat)}
                      className="p-2 bg-olive-800 text-gold-400 border border-gold-500/30 rounded-lg hover:bg-gold-500 hover:text-olive-950 transition-colors"
                      title="Edit Category Name"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="p-2 bg-olive-800 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-600 hover:text-white transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          {/* Timeline Period & Data Actions Bar */}
          <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
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
                    onClick={() => handleSelectPeriod(p.id as PnLPeriod)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p.id ? 'bg-gold-500 text-olive-950 font-bold shadow' : 'text-olive-300'
                      }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Range & Data Tools */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs bg-olive-950 p-1.5 px-3 rounded-xl border border-gold-500/15">
                <span className="text-olive-300 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gold-400" /> Custom Range:</span>
                
                {/* From Date Input (DD/MM/YYYY) */}
                <div className="relative inline-flex items-center">
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={isoToDDMMYYYY(startDate)}
                    onChange={(e) => setStartDate(ddmmyyyyToIso(e.target.value))}
                    className="w-28 px-2 py-1 bg-olive-900 border border-gold-500/20 rounded text-white text-xs outline-none text-center font-mono placeholder-olive-500 focus:border-gold-500"
                  />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 opacity-0 cursor-pointer"
                    title="Choose Date"
                  />
                  <Calendar className="w-3.5 h-3.5 text-gold-400/60 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
                </div>

                <span className="text-olive-300">to</span>

                {/* To Date Input (DD/MM/YYYY) */}
                <div className="relative inline-flex items-center">
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={isoToDDMMYYYY(endDate)}
                    onChange={(e) => setEndDate(ddmmyyyyToIso(e.target.value))}
                    className="w-28 px-2 py-1 bg-olive-900 border border-gold-500/20 rounded text-white text-xs outline-none text-center font-mono placeholder-olive-500 focus:border-gold-500"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 opacity-0 cursor-pointer"
                    title="Choose Date"
                  />
                  <Calendar className="w-3.5 h-3.5 text-gold-400/60 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
                </div>

                <button
                  onClick={() => setPeriod('custom')}
                  className="px-3 py-1 bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 font-bold rounded text-xs hover:scale-105 transition-transform"
                >
                  Apply Range
                </button>
                {period === 'custom' && (
                  <button
                    onClick={() => handleExportPnLData('csv', 'custom', startDate, endDate)}
                    title="Download Custom Period Data as CSV Spreadsheet"
                    className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold rounded text-xs hover:bg-emerald-500 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Download Custom CSV
                  </button>
                )}
              </div>

              {/* Data Import & Export Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setExportPeriod(period);
                    setExportStartDate(startDate);
                    setExportEndDate(endDate);
                    setShowExportModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xs rounded-xl shadow-md hover:from-amber-400 hover:to-amber-500 transition-all"
                  title="Export P&L Financial Statement Report"
                >
                  <Download className="w-3.5 h-3.5" /> Export P&L Data
                </button>
                <button
                  onClick={() => {
                    setImportStatus('idle');
                    setImportMsg('');
                    setShowImportModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-olive-950 border border-gold-500/30 text-gold-400 font-bold text-xs rounded-xl hover:bg-gold-500 hover:text-olive-950 transition-all"
                  title="Import Financial Statement Records"
                >
                  <Upload className="w-3.5 h-3.5" /> Import P&L Data
                </button>
              </div>
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

          <div className="bg-olive-900 border border-gold-500/30 rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="text-base font-bold text-gold-500">Invoice Bills</h4>
                <p className="text-xs text-olive-300">Showing {filteredOrders.length} completed bill{filteredOrders.length === 1 ? '' : 's'} for the selected period.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-olive-800 text-olive-300 font-semibold border-b border-gold-500/20">
                  <tr>
                    <th className="p-3">Bill #</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-500/10">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-olive-300">No bills found for this period.</td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedPnlBill(order)}
                        className="hover:bg-gold-500/10 cursor-pointer transition-colors group"
                        title="Click to view & print bill"
                      >
                        <td className="p-3 font-semibold text-white group-hover:text-gold-400 flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-gold-500" />
                          {order.orderNumber || order.order_number || `KM-${order.id}`}
                        </td>
                        <td className="p-3 font-bold text-gold-400">₹{Number(order.grandTotal || order.grand_total || order.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-emerald-300">{order.paymentMode || order.payment_mode || 'Cash'}</td>
                        <td className="p-3 text-olive-300">
                          {formatDateDDMMYYYY(order.createdAt || order.orderDate || order.created_at)}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedPnlBill(order); }}
                            className="px-2.5 py-1 bg-gold-500/10 border border-gold-500/30 text-gold-400 text-[11px] font-bold rounded-lg group-hover:bg-gold-500 group-hover:text-olive-950 transition-colors inline-flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" /> Print
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="custom">+ Add Custom Category...</option>
                </select>
                {addCat === 'custom' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={addCustomCat}
                      onChange={(e) => setAddCustomCat(e.target.value)}
                      placeholder="Enter new category name"
                      className="w-full px-3 py-2 bg-olive-950 border border-gold-500/30 rounded-lg text-white outline-none focus:border-gold-500"
                      required
                    />
                  </div>
                )}
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
      {/* Add Food Category Modal */}
      {showAddCatModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-olive-900 border border-gold-500 rounded-2xl p-6 w-[400px] space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-gold-500 flex items-center gap-2">
              <FolderPlus className="w-5 h-5" /> Add New Food Category
            </h4>
            <form onSubmit={handleAddCategorySubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-olive-300 block mb-1 font-medium">Category Name</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g., Soups & Salads, Mandhi Combos"
                  className="w-full px-3.5 py-2.5 bg-olive-950 border border-gold-500/20 rounded-xl text-white outline-none focus:border-gold-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(false)}
                  className="flex-1 py-2.5 bg-olive-800 text-white rounded-xl font-bold hover:bg-olive-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-gold-500 to-gold-dark text-olive-950 rounded-xl font-extrabold shadow-md hover:scale-[1.02] transition-transform"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Food Category Modal */}
      {showEditCatModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-olive-900 border border-gold-500 rounded-2xl p-6 w-[400px] space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-gold-500 flex items-center gap-2">
              <Edit3 className="w-5 h-5" /> Edit Food Category
            </h4>
            <form onSubmit={handleEditCategorySubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-olive-300 block mb-1 font-medium">Category Name</label>
                <input
                  type="text"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-olive-950 border border-gold-500/20 rounded-xl text-white outline-none focus:border-gold-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditCatModal(false)}
                  className="flex-1 py-2.5 bg-olive-800 text-white rounded-xl font-bold hover:bg-olive-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-gold-500 to-gold-dark text-olive-950 rounded-xl font-extrabold shadow-md hover:scale-[1.02] transition-transform"
                >
                  Update Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Details & Print Modal for PnL Statement */}
      {selectedPnlBill && (
        <BillDetailModal order={selectedPnlBill} onClose={() => setSelectedPnlBill(null)} />
      )}

      {/* Export PnL Data Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-olive-900 border border-gold-500 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gold-500/20">
              <h4 className="text-base font-bold text-gold-500 flex items-center gap-2">
                <Download className="w-5 h-5" /> Export P&L Financial Report
              </h4>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 text-olive-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-olive-300 block mb-1.5 font-medium">Select Time Period / Date Range</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'week', label: 'This Week' },
                    { id: 'month', label: 'This Month' },
                    { id: 'year', label: 'This Year' },
                    { id: 'all', label: 'All Time' },
                    { id: 'custom', label: 'Custom Range' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setExportPeriod(p.id as PnLPeriod)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                        exportPeriod === p.id
                          ? 'bg-gold-500 text-olive-950 shadow-md'
                          : 'bg-olive-950 text-olive-300 border border-gold-500/20 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {exportPeriod === 'custom' && (
                  <div className="p-3 bg-olive-950 rounded-xl border border-gold-500/20 grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="text-olive-300 block text-[11px] mb-1">From Date</label>
                      <div className="relative inline-flex items-center w-full">
                        <input
                          type="text"
                          placeholder="DD/MM/YYYY"
                          value={isoToDDMMYYYY(exportStartDate)}
                          onChange={(e) => setExportStartDate(ddmmyyyyToIso(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-olive-900 border border-gold-500/20 rounded-lg text-white text-xs outline-none font-mono placeholder-olive-500 focus:border-gold-500"
                        />
                        <input
                          type="date"
                          value={exportStartDate}
                          onChange={(e) => setExportStartDate(e.target.value)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 opacity-0 cursor-pointer"
                          title="Choose Date"
                        />
                        <Calendar className="w-3.5 h-3.5 text-gold-400/60 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                    <div>
                      <label className="text-olive-300 block text-[11px] mb-1">To Date</label>
                      <div className="relative inline-flex items-center w-full">
                        <input
                          type="text"
                          placeholder="DD/MM/YYYY"
                          value={isoToDDMMYYYY(exportEndDate)}
                          onChange={(e) => setExportEndDate(ddmmyyyyToIso(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-olive-900 border border-gold-500/20 rounded-lg text-white text-xs outline-none font-mono placeholder-olive-500 focus:border-gold-500"
                        />
                        <input
                          type="date"
                          value={exportEndDate}
                          onChange={(e) => setExportEndDate(e.target.value)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 opacity-0 cursor-pointer"
                          title="Choose Date"
                        />
                        <Calendar className="w-3.5 h-3.5 text-gold-400/60 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-olive-300 block mb-1.5 font-medium">Export File Format</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      exportFormat === 'csv'
                        ? 'bg-gold-500/15 border-gold-500 text-gold-400 font-bold'
                        : 'bg-olive-950 border-gold-500/20 text-olive-300 hover:text-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-6 h-6" />
                    <span>CSV Spreadsheet</span>
                    <span className="text-[10px] text-olive-400 font-normal">Excel compatible</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('json')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      exportFormat === 'json'
                        ? 'bg-gold-500/15 border-gold-500 text-gold-400 font-bold'
                        : 'bg-olive-950 border-gold-500/20 text-olive-300 hover:text-white'
                    }`}
                  >
                    <FileJson className="w-6 h-6" />
                    <span>JSON Backup</span>
                    <span className="text-[10px] text-olive-400 font-normal">Re-importable data</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gold-500/20">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 py-2.5 bg-olive-800 text-white rounded-xl font-bold hover:bg-olive-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPnLData(exportFormat, exportPeriod)}
                  className="flex-1 py-2.5 bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 rounded-xl font-extrabold shadow-md hover:scale-[1.02] transition-transform flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download P&L File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import PnL Data Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-olive-900 border border-gold-500 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gold-500/20">
              <h4 className="text-base font-bold text-gold-500 flex items-center gap-2">
                <Upload className="w-5 h-5" /> Import Financial Statement Records
              </h4>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 text-olive-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-olive-300">
                Select a previously exported P&L JSON or CSV file to import orders & expense ledger items directly into your database.
              </p>

              <label className="border-2 border-dashed border-gold-500/30 hover:border-gold-500 bg-olive-950/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group">
                <Upload className="w-8 h-8 text-gold-400 group-hover:scale-110 transition-transform mb-2" />
                <span className="font-bold text-white text-sm">Choose JSON or CSV File</span>
                <span className="text-[11px] text-olive-400 mt-1">Supports PnL JSON backups & CSV exports</span>
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleImportFileChange}
                  className="hidden"
                />
              </label>

              {importStatus !== 'idle' && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  importStatus === 'importing' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300' :
                  importStatus === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
                  'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                }`}>
                  {importStatus === 'importing' && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
                  {importStatus === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{importMsg}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-5 py-2.5 bg-olive-800 text-white rounded-xl font-bold hover:bg-olive-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
