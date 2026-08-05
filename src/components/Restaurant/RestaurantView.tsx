import React, { useState, useEffect, useMemo } from 'react';
import { Utensils, TrendingUp, Store, Plus, Edit2, Edit3, Trash2, Calendar, Receipt, Printer, Tags, FolderPlus, Download, FileSpreadsheet, FileJson, X, Wallet, Search, Layers, Sparkles, Filter } from 'lucide-react';
import { Dish, PnLPeriod } from '../../types';
import { BillDetailModal } from './BillDetailModal';
import { useAuthStore } from '../../store/useAuthStore';
import { formatDateDDMMYYYY, displayDateRange, isoToDDMMYYYY, ddmmyyyyToIso } from '../../utils/dateUtils';
import { ConfirmDialog } from '../UI/ConfirmDialog';

export const RestaurantView: React.FC = () => {
  const { restaurantDetails } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'pnl' | 'dishes' | 'categories'>('pnl');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([
    { id: 1, name: 'Mandhi Special' },
    { id: 2, name: 'Alfaham & Grill' },
    { id: 3, name: 'Starters & Sides' },
    { id: 4, name: 'Beverages' },
    { id: 5, name: 'Desserts' }
  ]);
  const [dishSearchQuery, setDishSearchQuery] = useState('');
  const [dishSelectedCategory, setDishSelectedCategory] = useState<string>('all');

  // Memoized Category Dishes Grouping for 60 FPS performance without render lag
  const groupedCategoryData = useMemo(() => {
    const knownCatIds = new Set(categories.map(c => Number(c.id)));
    const activeCategoriesToRender = categories.filter((cat) => {
      if (dishSelectedCategory !== 'all' && String(dishSelectedCategory) !== String(cat.id)) {
        return false;
      }
      return true;
    });

    const searchQueryLower = dishSearchQuery.toLowerCase().trim();

    const grouped = activeCategoriesToRender.map((cat) => {
      const catDishes = dishes.filter(d => {
        const isCatMatch = Number(d.categoryId) === Number(cat.id);
        const isSearchMatch = !searchQueryLower || d.name.toLowerCase().includes(searchQueryLower);
        return isCatMatch && isSearchMatch;
      });
      return { category: cat, dishes: catDishes };
    });

    const uncategorized = dishes.filter(d => {
      const isUncat = !knownCatIds.has(Number(d.categoryId));
      const isSearchMatch = !searchQueryLower || d.name.toLowerCase().includes(searchQueryLower);
      return isUncat && isSearchMatch;
    });

    const totalVisible = grouped.reduce((sum, g) => sum + g.dishes.length, 0) + uncategorized.length;

    return { grouped, uncategorized, totalVisible };
  }, [categories, dishes, dishSelectedCategory, dishSearchQuery]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPnlBill, setSelectedPnlBill] = useState<any | null>(null);

  // In-app confirm dialog state — replaces window.confirm() to avoid Electron focus-loss cursor bug
  const [confirmDishOpen, setConfirmDishOpen] = useState(false);
  const [pendingDeleteDishId, setPendingDeleteDishId] = useState<number | null>(null);
  const [confirmCatOpen, setConfirmCatOpen] = useState(false);
  const [pendingDeleteCat, setPendingDeleteCat] = useState<{ id: number; name: string } | null>(null);

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
  const [addComboItems, setAddComboItems] = useState<string[]>(['']);

  // Edit Dish Form State
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCat, setEditCat] = useState('1');
  const [editCustomCat, setEditCustomCat] = useState('');
  const [editQtr, setEditQtr] = useState('');
  const [editHalf, setEditHalf] = useState('');
  const [editFull, setEditFull] = useState('');
  const [editComboItems, setEditComboItems] = useState<string[]>(['']);

  // PnL Period Timeline State
  const [period, setPeriod] = useState<PnLPeriod>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);

  // PnL Multi-Option Filter State
  const [filterProfit, setFilterProfit] = useState<boolean>(true);
  const [filterExpense, setFilterExpense] = useState<boolean>(true);
  const [filterUpi, setFilterUpi] = useState<boolean>(true);
  const [filterCash, setFilterCash] = useState<boolean>(true);
  const [filterCard, setFilterCard] = useState<boolean>(true);

  const matchesPaymentModeFilter = (pm: string) => {
    const norm = (pm || '').toLowerCase().trim();
    if (norm.includes('upi') || norm.includes('gpay') || norm.includes('phonepe') || norm.includes('paytm')) {
      return filterUpi;
    }
    if (norm.includes('card') || norm.includes('credit') || norm.includes('debit') || norm.includes('pos')) {
      return filterCard;
    }
    if (norm.includes('cash')) {
      return filterCash;
    }
    return filterCash || filterUpi || filterCard;
  };

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

  const handleDeleteCategory = (id: number, name: string) => {
    const dishCount = dishes.filter(d => Number(d.categoryId) === Number(id)).length;
    if (dishCount > 0) {
      // Use alert replacement — a temporary info dialog; since no text input follows, alert is fine here
      // but we still use in-app pattern for future consistency
      alert(`Cannot delete category "${name}" because it contains ${dishCount} menu dish(es). Please delete or reassign those dishes first.`);
      return;
    }
    setPendingDeleteCat({ id, name });
    setConfirmCatOpen(true);
  };

  const executeDeleteCategory = async () => {
    setConfirmCatOpen(false);
    if (!pendingDeleteCat) return;
    const { id } = pendingDeleteCat;
    setPendingDeleteCat(null);

    if (editCatId === id) {
      setEditCatId(null);
      setShowEditCatModal(false);
    }

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

    const isComboCat = categories.find(c => String(c.id) === String(targetCatId))?.name.toLowerCase().includes('combo') || addCustomCat.toLowerCase().includes('combo');
    const validComboItems = isComboCat ? addComboItems.map(s => s.trim()).filter(Boolean) : [];

    const payload = {
      name: addName,
      category_id: targetCatId,
      price_quarter: isComboCat ? 0 : Number(addQtr || 0),
      price_half: isComboCat ? 0 : Number(addHalf || 0),
      price_full: Number(addFull),
      comboItems: validComboItems
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
          priceQuarter: isComboCat ? 0 : Number(addQtr || 0),
          priceHalf: isComboCat ? 0 : Number(addHalf || 0),
          priceFull: Number(addFull),
          isAvailable: true,
          comboItems: validComboItems
        }
      ]);
    }

    setAddName('');
    setAddQtr('');
    setAddHalf('');
    setAddFull('');
    setAddComboItems(['']);
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
    setEditComboItems(dish.comboItems && dish.comboItems.length > 0 ? dish.comboItems : ['']);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !editName || !editFull) return;

    const isEditComboCat = categories.find(c => String(c.id) === String(editCat))?.name.toLowerCase().includes('combo');
    const validComboItems = isEditComboCat ? editComboItems.map(s => s.trim()).filter(Boolean) : [];

    const payload = {
      id: editId,
      name: editName,
      category_id: Number(editCat),
      price_quarter: isEditComboCat ? 0 : Number(editQtr || 0),
      price_half: isEditComboCat ? 0 : Number(editHalf || 0),
      price_full: Number(editFull),
      comboItems: validComboItems
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
              priceQuarter: isEditComboCat ? 0 : Number(editQtr || 0),
              priceHalf: isEditComboCat ? 0 : Number(editHalf || 0),
              priceFull: Number(editFull),
              comboItems: validComboItems
            }
            : d
        )
      );
    }
    setShowEditModal(false);
  };


  // Delete Dish — queues confirmation in-app (avoids Electron focus-loss cursor bug)
  const handleDeleteDish = (id: number) => {
    setPendingDeleteDishId(id);
    setConfirmDishOpen(true);
  };

  const executeDeleteDish = async () => {
    setConfirmDishOpen(false);
    if (pendingDeleteDishId == null) return;
    const id = pendingDeleteDishId;
    setPendingDeleteDishId(null);

    if (editId === id) {
      setEditId(null);
      setShowEditModal(false);
    }
    if ((window as any).electronAPI) {
      await (window as any).electronAPI.deleteMenuItem(id);
      await loadDishes();
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

  const filteredOrders = filterProfit ? allOrders.filter((o) => {
    if (!filterItemByPeriod(o, 'createdAt')) return false;
    const mode = o.paymentMode || o.payment_mode || 'Cash';
    return matchesPaymentModeFilter(mode);
  }) : [];

  const filteredExpenses = filterExpense ? allExpenses.filter((e) => {
    if (!filterItemByPeriod(e, 'expenseDate')) return false;
    const mode = e.paymentMode || e.payment_mode || 'Cash';
    return matchesPaymentModeFilter(mode);
  }) : [];

  // Combine orders (Revenue +) and expenses (Outflow -) into one unified timeline ledger sorted chronologically by date/time
  const combinedPnlTransactions = [
    ...filteredOrders.map(o => ({
      id: `ORDER-${o.id}`,
      type: 'INCOME' as const,
      refNo: o.orderNumber || o.order_number || `KM-${o.id}`,
      category: o.orderType || 'Dine-In',
      description: 'Customer Invoice Bill',
      amount: Number(o.grandTotal || o.grand_total || o.total || 0),
      paymentMode: o.paymentMode || o.payment_mode || 'Cash',
      timestamp: new Date(o.createdAt || o.orderDate || o.created_at || Date.now()).getTime(),
      dateStr: formatDateDDMMYYYY(o.createdAt || o.orderDate || o.created_at),
      timeStr: (o.createdAt || o.orderDate || o.created_at) ? new Date(o.createdAt || o.orderDate || o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      originalData: o
    })),
    ...filteredExpenses.map(e => {
      const dateTimeVal = e.createdAt || e.created_at || e.expenseDate || e.expense_date;
      return {
        id: `EXPENSE-${e.id}`,
        type: 'EXPENSE' as const,
        refNo: e.category || 'Expense Outflow',
        category: e.category || 'General Expense',
        description: e.description || e.title || e.name || 'Expense Record',
        amount: Number(e.amount || 0),
        paymentMode: e.paymentMode || e.payment_mode || 'Cash',
        timestamp: new Date(dateTimeVal || Date.now()).getTime(),
        dateStr: formatDateDDMMYYYY(dateTimeVal),
        timeStr: dateTimeVal ? new Date(dateTimeVal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        originalData: e
      };
    })
  ].sort((a, b) => b.timestamp - a.timestamp);

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

    if (filterProfit) {
      targetOrders = targetOrders.filter(o => matchesPaymentModeFilter(o.paymentMode || o.payment_mode || 'Cash'));
    } else {
      targetOrders = [];
    }

    if (filterExpense) {
      targetExpenses = targetExpenses.filter(e => matchesPaymentModeFilter(e.paymentMode || e.payment_mode || 'Cash'));
    } else {
      targetExpenses = [];
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
      // CSV format: Unified Chronological Financial Ledger Table
      let csv = `PROFIT & LOSS FINANCIAL STATEMENT - ${restaurantDetails?.companyName || 'Kish Mandhi'}\n`;
      csv += `Period,${periodLabel}\n`;
      csv += `Exported At,${new Date().toLocaleString()}\n`;
      csv += `Gross Revenue (INR),${rev.toFixed(2)}\n`;
      csv += `Total Expenses (INR),${exp.toFixed(2)}\n`;
      csv += `Net Profit / Loss (INR),${net.toFixed(2)}\n`;
      csv += `Net Profit Margin (%),${margin}%\n\n`;

      csv += `--- UNIFIED CHRONOLOGICAL FINANCIAL LEDGER (${targetOrders.length + targetExpenses.length} Records) ---\n`;
      csv += `Transaction Type,Ref # / Category,Description,Amount (INR),Payment Mode,Date\n`;

      const combinedExport = [
        ...targetOrders.map(o => ({
          type: 'REVENUE (+)',
          refNo: o.orderNumber || o.order_number || `KM-${o.id}`,
          desc: 'Customer Invoice Bill',
          amount: Number(o.grandTotal || o.grand_total || o.total || 0).toFixed(2),
          mode: o.paymentMode || o.payment_mode || 'Cash',
          dt: toLocalDateString(o.createdAt || o.orderDate || o.created_at),
          timestamp: new Date(o.createdAt || o.orderDate || o.created_at || Date.now()).getTime()
        })),
        ...targetExpenses.map(e => ({
          type: 'EXPENSE (-)',
          refNo: e.category || 'General Expense',
          desc: (e.description || e.title || e.name || 'Expense Record').replace(/"/g, '""'),
          amount: `-${Number(e.amount || 0).toFixed(2)}`,
          mode: e.paymentMode || e.payment_mode || 'Cash',
          dt: toLocalDateString(e.expenseDate || e.created_at),
          timestamp: new Date(e.expenseDate || e.created_at || Date.now()).getTime()
        }))
      ].sort((a, b) => b.timestamp - a.timestamp);

      combinedExport.forEach(item => {
        csv += `"${item.type}","${item.refNo}","${item.desc}",${item.amount},"${item.mode}","${item.dt}"\n`;
      });

      downloadBlob(csv, `${baseFileName}.csv`, 'text/csv;charset=utf-8;');
    }
    setShowExportModal(false);
  };

  const isAddComboCat = categories.find(c => String(c.id) === String(addCat))?.name.toLowerCase().includes('combo') || addCustomCat.toLowerCase().includes('combo');
  const isEditComboCat = categories.find(c => String(c.id) === String(editCat))?.name.toLowerCase().includes('combo');

  return (
    <div className="space-y-6 select-none">
      {/* In-app Delete Confirmation Dialogs (replaces window.confirm to fix Electron cursor bug) */}
      <ConfirmDialog
        open={confirmDishOpen}
        title="Remove Menu Dish"
        message="Are you sure you want to permanently remove this dish from the menu? This action cannot be undone."
        confirmLabel="Remove Dish"
        cancelLabel="Cancel"
        onConfirm={executeDeleteDish}
        onCancel={() => { setConfirmDishOpen(false); setPendingDeleteDishId(null); }}
      />
      <ConfirmDialog
        open={confirmCatOpen}
        title="Delete Food Category"
        message={`Are you sure you want to delete category "${pendingDeleteCat?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Category"
        cancelLabel="Cancel"
        onConfirm={executeDeleteCategory}
        onCancel={() => { setConfirmCatOpen(false); setPendingDeleteCat(null); }}
      />
      {/* Sub Navigation Bar */}
      <div className="flex bg-olive-900 p-1 border border-gold-500/20 rounded-xl w-fit gap-1">
        <button
          onClick={() => setActiveTab('pnl')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'pnl' ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md' : 'text-olive-300'
            }`}
        >
          <TrendingUp className="w-4 h-4" /> Profit & Loss Statement
        </button>
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

      {/* TAB 1: DISHES & MENU MANAGEMENT (OPTIMIZED FAST CATEGORY GROUPED VIEW) */}
      {activeTab === 'dishes' && (
        <div className="space-y-5">
          {/* Top Controls Toolbar */}
          <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-gold-500/20 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-gold-400 flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-gold-500" /> Kish Mandhi Menu Dishes
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 font-semibold">
                    {dishes.length} Dish{dishes.length === 1 ? '' : 'es'} Total
                  </span>
                </h3>
                <p className="text-xs text-olive-300 mt-0.5">
                  Dishes grouped by food category with portion sizes & pricing controls
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gold-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={dishSearchQuery}
                    onChange={(e) => setDishSearchQuery(e.target.value)}
                    placeholder="Search dish name..."
                    className="pl-9 pr-8 py-2 bg-olive-950 border border-gold-500/30 rounded-xl text-white text-xs placeholder-olive-400 focus:outline-none focus:border-gold-500 w-60"
                  />
                  {dishSearchQuery && (
                    <button
                      onClick={() => setDishSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-olive-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 font-bold text-xs rounded-xl shadow hover:scale-105 transition-transform"
                >
                  <Plus className="w-4 h-4" /> Add New Dish
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs font-semibold text-olive-300 flex items-center gap-1 shrink-0 mr-1">
                <Filter className="w-3.5 h-3.5 text-gold-400" /> Category:
              </span>
              <button
                onClick={() => setDishSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 border ${dishSelectedCategory === 'all'
                    ? 'bg-gold-500 text-olive-950 border-gold-400 shadow'
                    : 'bg-olive-950/80 text-olive-300 border-gold-500/20 hover:border-gold-500/40 hover:text-white'
                  }`}
              >
                All Categories
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${dishSelectedCategory === 'all' ? 'bg-olive-950/20 text-olive-950' : 'bg-gold-500/20 text-gold-400'}`}>
                  {dishes.length}
                </span>
              </button>

              {categories.map((cat) => {
                const count = dishes.filter(d => Number(d.categoryId) === Number(cat.id)).length;
                const isSelected = String(dishSelectedCategory) === String(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setDishSelectedCategory(String(cat.id))}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 border ${isSelected
                        ? 'bg-gold-500 text-olive-950 border-gold-400 shadow'
                        : 'bg-olive-950/80 text-olive-300 border-gold-500/20 hover:border-gold-500/40 hover:text-white'
                      }`}
                  >
                    {cat.name}
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-olive-950/20 text-olive-950' : 'bg-gold-500/20 text-gold-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grouped Dishes Cards */}
          <div className="space-y-5">
            {groupedCategoryData.grouped.map(({ category: cat, dishes: catDishes }) => {
              if (dishSearchQuery && catDishes.length === 0) return null;

              return (
                <div
                  key={cat.id}
                  className="bg-olive-900 border border-gold-500/20 rounded-2xl p-5 shadow-lg space-y-4"
                >
                  {/* Category Header */}
                  <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-gold-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 font-bold">
                        <Tags className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          {cat.name}
                        </h4>
                        <span className="text-xs text-olive-300 font-medium">
                          {catDishes.length} dish{catDishes.length === 1 ? '' : 'es'} listed
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setAddCat(String(cat.id));
                        setShowAddModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-400 hover:bg-gold-500 hover:text-olive-950 rounded-xl font-bold text-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add to {cat.name}
                    </button>
                  </div>

                  {/* Category Dishes Table */}
                  {catDishes.length === 0 ? (
                    <div className="py-6 text-center bg-olive-950/50 rounded-xl border border-gold-500/10">
                      <p className="text-xs text-olive-400">No dishes present in {cat.name}</p>
                      <button
                        onClick={() => {
                          setAddCat(String(cat.id));
                          setShowAddModal(true);
                        }}
                        className="mt-2 text-xs text-gold-400 hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add first dish
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-olive-950 text-olive-300 font-semibold border-b border-gold-500/20">
                          <tr>
                            <th className="p-3 rounded-l-xl">Dish Name</th>
                            <th className="p-3">Quarter (₹)</th>
                            <th className="p-3">Half (₹)</th>
                            <th className="p-3">Full / Base (₹)</th>
                            <th className="p-3 text-right rounded-r-xl">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gold-500/10">
                          {catDishes.map((dish) => (
                            <tr key={dish.id} className="hover:bg-olive-800/40 transition-colors">
                              <td className="p-3 font-bold text-white">
                                <div className="flex flex-col">
                                  <span className="text-sm">{dish.name}</span>
                                  {dish.comboItems && dish.comboItems.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {dish.comboItems.map((item, idx) => (
                                        <span key={idx} className="text-[10px] bg-olive-950 text-olive-300 px-2 py-0.5 rounded border border-gold-500/20">
                                          + {item}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 font-medium text-olive-300">
                                {dish.priceQuarter > 0 ? `₹${dish.priceQuarter}` : '-'}
                              </td>
                              <td className="p-3 font-medium text-olive-300">
                                {dish.priceHalf > 0 ? `₹${dish.priceHalf}` : '-'}
                              </td>
                              <td className="p-3 font-bold text-gold-400">
                                ₹{dish.priceFull}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenEdit(dish)}
                                    className="px-2.5 py-1 bg-gold-500/10 border border-gold-500/30 text-gold-400 rounded-lg font-semibold text-[11px] flex items-center gap-1 hover:bg-gold-500 hover:text-olive-950 transition-colors"
                                  >
                                    <Edit2 className="w-3 h-3" /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDish(dish.id)}
                                    className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg font-semibold text-[11px] flex items-center gap-1 hover:bg-rose-500 hover:text-white transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" /> Remove
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Render Uncategorized Dishes if any exist */}
            {groupedCategoryData.uncategorized.length > 0 && (dishSelectedCategory === 'all' || dishSelectedCategory === 'custom') && (
              <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gold-500/20">
                  <div className="w-9 h-9 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 font-bold">
                    <FolderPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Other / Custom Category Dishes</h4>
                    <span className="text-xs text-olive-300">{groupedCategoryData.uncategorized.length} dishes</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-olive-950 text-olive-300 font-semibold border-b border-gold-500/20">
                      <tr>
                        <th className="p-3">Dish Name</th>
                        <th className="p-3">Quarter (₹)</th>
                        <th className="p-3">Half (₹)</th>
                        <th className="p-3">Full (₹)</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold-500/10">
                      {groupedCategoryData.uncategorized.map((dish) => (
                        <tr key={dish.id} className="hover:bg-olive-800/40 transition-colors">
                          <td className="p-3 font-bold text-white">{dish.name}</td>
                          <td className="p-3 font-medium text-olive-300">{dish.priceQuarter > 0 ? `₹${dish.priceQuarter}` : '-'}</td>
                          <td className="p-3 font-medium text-olive-300">{dish.priceHalf > 0 ? `₹${dish.priceHalf}` : '-'}</td>
                          <td className="p-3 font-bold text-gold-400">₹{dish.priceFull}</td>
                          <td className="p-3 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(dish)}
                              className="px-2.5 py-1 bg-gold-500/10 border border-gold-500/30 text-gold-400 rounded-lg font-semibold text-[11px] flex items-center gap-1 hover:bg-gold-500 hover:text-olive-950 transition-colors"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDish(dish.id)}
                              className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg font-semibold text-[11px] flex items-center gap-1 hover:bg-rose-500 hover:text-white transition-colors"
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

            {/* Empty Search Result State */}
            {dishSearchQuery && groupedCategoryData.totalVisible === 0 && (
              <div className="py-10 text-center bg-olive-900 border border-gold-500/20 rounded-2xl p-6">
                <Search className="w-8 h-8 text-gold-400/50 mx-auto mb-2" />
                <h4 className="text-base font-bold text-white">No dishes matched "{dishSearchQuery}"</h4>
                <p className="text-xs text-olive-300 mt-1">Try searching with a different keyword.</p>
                <button
                  onClick={() => { setDishSearchQuery(''); setDishSelectedCategory('all'); }}
                  className="mt-3 px-4 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-400 font-bold text-xs rounded-xl hover:bg-gold-500 hover:text-olive-950 transition-colors"
                >
                  Reset Search
                </button>
              </div>
            )}
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
                  { id: 'custom', label: 'Custom Range' },
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

              {/* Data Export Action Button */}
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
              </div>
            </div>
          </div>

          {/* P&L Filter Checkbox Controls Panel */}
          <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-gold-400">
                <Filter className="w-4 h-4 text-gold-400" />
                <span>Filter P&L Records:</span>
              </div>

              {/* Checkbox Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs select-none">
                {/* [ ] Profit */}
                <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer font-bold border transition-all ${filterProfit
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-sm'
                    : 'bg-olive-950/60 border-gold-500/10 text-olive-400 hover:text-olive-200'
                  }`}>
                  <input
                    type="checkbox"
                    checked={filterProfit}
                    onChange={(e) => setFilterProfit(e.target.checked)}
                    className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                  />
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Profit</span>
                </label>

                {/* [ ] Expense */}
                <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer font-bold border transition-all ${filterExpense
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-sm'
                    : 'bg-olive-950/60 border-gold-500/10 text-olive-400 hover:text-olive-200'
                  }`}>
                  <input
                    type="checkbox"
                    checked={filterExpense}
                    onChange={(e) => setFilterExpense(e.target.checked)}
                    className="w-3.5 h-3.5 accent-rose-500 rounded cursor-pointer"
                  />
                  <Receipt className="w-3.5 h-3.5 text-rose-400" />
                  <span>Expense</span>
                </label>

                <div className="h-4 w-px bg-gold-500/20 mx-1 hidden sm:block" />

                {/* [ ] UPI */}
                <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer font-bold border transition-all ${filterUpi
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-sm'
                    : 'bg-olive-950/60 border-gold-500/10 text-olive-400 hover:text-olive-200'
                  }`}>
                  <input
                    type="checkbox"
                    checked={filterUpi}
                    onChange={(e) => setFilterUpi(e.target.checked)}
                    className="w-3.5 h-3.5 accent-purple-500 rounded cursor-pointer"
                  />
                  <Wallet className="w-3.5 h-3.5 text-purple-400" />
                  <span>UPI</span>
                </label>

                {/* [ ] Cash */}
                <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer font-bold border transition-all ${filterCash
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm'
                    : 'bg-olive-950/60 border-gold-500/10 text-olive-400 hover:text-olive-200'
                  }`}>
                  <input
                    type="checkbox"
                    checked={filterCash}
                    onChange={(e) => setFilterCash(e.target.checked)}
                    className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                  />
                  <span>Cash</span>
                </label>

                {/* [ ] Card */}
                <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer font-bold border transition-all ${filterCard
                    ? 'bg-sky-500/20 border-sky-500/40 text-sky-300 shadow-sm'
                    : 'bg-olive-950/60 border-gold-500/10 text-olive-400 hover:text-olive-200'
                  }`}>
                  <input
                    type="checkbox"
                    checked={filterCard}
                    onChange={(e) => setFilterCard(e.target.checked)}
                    className="w-3.5 h-3.5 accent-sky-500 rounded cursor-pointer"
                  />
                  <span>Card</span>
                </label>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFilterProfit(true);
                  setFilterExpense(true);
                  setFilterUpi(true);
                  setFilterCash(true);
                  setFilterCard(true);
                }}
                className="px-3 py-1 bg-olive-950 border border-gold-500/20 hover:border-gold-500/40 text-olive-300 hover:text-gold-400 text-xs font-semibold rounded-xl transition-colors"
                title="Reset all filters to select everything"
              >
                Select All
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

          {/* Unified Profit & Loss Financial Ledger (Single Chronological Table) */}
          <div className="bg-olive-900 border border-gold-500/30 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-gold-500 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-gold-400" /> Unified Profit & Loss Financial Ledger
                </h4>
                <p className="text-xs text-olive-300">
                  Showing {combinedPnlTransactions.length} transaction{combinedPnlTransactions.length === 1 ? '' : 's'} ({filteredOrders.length} Revenue Bills, {filteredExpenses.length} Operating Expenses) sorted by time
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  Revenue: +₹{pnlRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-lg">
                  Expenses: -₹{pnlExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-black text-gold-400 bg-gold-500/10 border border-gold-500/30 px-2.5 py-1 rounded-lg">
                  Net Profit: ₹{pnlNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[550px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              <table className="w-full text-left text-xs">
                <thead className="bg-olive-950 text-olive-300 font-semibold border-b border-gold-500/20 sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">Ref # / Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Payment Mode</th>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-500/10">
                  {combinedPnlTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-olive-300">No transactions recorded for this period.</td>
                    </tr>
                  ) : (
                    combinedPnlTransactions.map((tx) => {
                      const isIncome = tx.type === 'INCOME';
                      return (
                        <tr
                          key={tx.id}
                          onClick={() => {
                            if (isIncome) setSelectedPnlBill(tx.originalData);
                          }}
                          className={`transition-colors ${isIncome ? 'hover:bg-gold-500/10 cursor-pointer group' : 'hover:bg-rose-500/10'}`}
                        >
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold ${isIncome
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              }`}>
                              {isIncome ? '+ Revenue Bill' : '- Expense Outflow'}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-white group-hover:text-gold-400">
                            {tx.refNo}
                          </td>
                          <td className="p-3 text-olive-200">
                            {tx.description}
                          </td>
                          <td className={`p-3 font-extrabold text-sm ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isIncome ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-olive-300 font-medium">
                            {tx.paymentMode}
                          </td>
                          <td className="p-3 text-olive-300 font-mono">
                            {tx.dateStr} {tx.timeStr && <span className="text-[11px] text-olive-400 ml-1">({tx.timeStr})</span>}
                          </td>
                          <td className="p-3 text-right">
                            {isIncome && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedPnlBill(tx.originalData); }}
                                className="px-2.5 py-1 bg-gold-500/10 border border-gold-500/30 text-gold-400 text-[11px] font-bold rounded-lg group-hover:bg-gold-500 group-hover:text-olive-950 transition-colors inline-flex items-center gap-1"
                              >
                                <Printer className="w-3 h-3" /> Print
                              </button>
                            )}
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
      )}


      {/* Add Dish Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-olive-900 border border-gold-500 rounded-2xl p-6 w-[420px] space-y-4 max-h-[90vh] overflow-y-auto">
            <h4 className="text-base font-bold text-gold-500 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add New Menu Dish / Combo
            </h4>
            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
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

              <div>
                <label className="text-olive-300 block mb-1 font-semibold">{isAddComboCat ? 'Combo Offer Name' : 'Dish Name'}</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder={isAddComboCat ? 'e.g., Family Mandhi Feast Combo' : 'e.g., Alfaham Mandhi'}
                  className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-white outline-none"
                  required
                />
              </div>

              {isAddComboCat ? (
                <div className="space-y-2 bg-olive-950/60 p-3 rounded-xl border border-gold-500/20">
                  <div className="flex justify-between items-center">
                    <label className="text-amber-400 font-bold block text-xs">Included Items Breakdown</label>
                    <button
                      type="button"
                      onClick={() => setAddComboItems(p => [...p, ''])}
                      className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[11px] font-bold hover:bg-amber-500/30 flex items-center gap-1"
                    >
                      + Add Included Item
                    </button>
                  </div>
                  {addComboItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => setAddComboItems(p => p.map((v, i) => i === idx ? e.target.value : v))}
                        placeholder={`e.g. ${idx === 0 ? '1 Full Chicken Mandhi' : idx === 1 ? '1 Alfaham' : '2 Mint Lime'}`}
                        className="flex-1 px-2.5 py-1.5 bg-olive-900 border border-gold-500/20 rounded-lg text-white outline-none text-xs"
                      />
                      {addComboItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setAddComboItems(p => p.filter((_, i) => i !== idx))}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
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
              )}

              <div>
                <label className="text-olive-300 block mb-1 font-semibold">{isAddComboCat ? 'Combo Package Price (₹)' : 'Full Price (₹)'}</label>
                <input
                  type="number"
                  value={addFull}
                  onChange={(e) => setAddFull(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-white outline-none font-bold text-gold-400"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 bg-olive-800 text-white rounded-lg font-bold">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-gradient-to-r from-gold-500 to-gold-dark text-olive-950 rounded-lg font-extrabold">
                  Save Dish / Combo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dish Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-olive-900 border border-gold-500 rounded-2xl p-6 w-[420px] space-y-4 max-h-[90vh] overflow-y-auto">
            <h4 className="text-base font-bold text-gold-500 flex items-center gap-2">
              <Edit2 className="w-5 h-5" /> Edit Dish / Combo Details
            </h4>
            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-olive-300 block mb-1 font-semibold">{isEditComboCat ? 'Combo Offer Name' : 'Dish Name'}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-white outline-none"
                  required
                />
              </div>

              {isEditComboCat ? (
                <div className="space-y-2 bg-olive-950/60 p-3 rounded-xl border border-gold-500/20">
                  <div className="flex justify-between items-center">
                    <label className="text-amber-400 font-bold block text-xs">Included Items Breakdown</label>
                    <button
                      type="button"
                      onClick={() => setEditComboItems(p => [...p, ''])}
                      className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[11px] font-bold hover:bg-amber-500/30 flex items-center gap-1"
                    >
                      + Add Included Item
                    </button>
                  </div>
                  {editComboItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => setEditComboItems(p => p.map((v, i) => i === idx ? e.target.value : v))}
                        placeholder={`Included Item ${idx + 1}`}
                        className="flex-1 px-2.5 py-1.5 bg-olive-900 border border-gold-500/20 rounded-lg text-white outline-none text-xs"
                      />
                      {editComboItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditComboItems(p => p.filter((_, i) => i !== idx))}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
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
              )}

              <div>
                <label className="text-olive-300 block mb-1 font-semibold">{isEditComboCat ? 'Combo Package Price (₹)' : 'Full Price (₹)'}</label>
                <input
                  type="number"
                  value={editFull}
                  onChange={(e) => setEditFull(e.target.value)}
                  className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-white outline-none font-bold text-gold-400"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2 bg-olive-800 text-white rounded-lg font-bold">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-gradient-to-r from-gold-500 to-gold-dark text-olive-950 rounded-lg font-extrabold">
                  Update Dish / Combo
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
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${exportPeriod === p.id
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

              {/* Filter Records Option inside Export Modal */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-olive-300 font-medium text-xs flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-gold-400" />
                    <span>Filter P&L Records to Include</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterProfit(true);
                      setFilterExpense(true);
                      setFilterUpi(true);
                      setFilterCash(true);
                      setFilterCard(true);
                    }}
                    className="text-[10px] text-gold-400 hover:underline font-semibold"
                  >
                    Select All
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 p-2.5 bg-olive-950/80 border border-gold-500/20 rounded-xl text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg hover:bg-emerald-500/20 transition-colors">
                    <input
                      type="checkbox"
                      checked={filterProfit}
                      onChange={(e) => setFilterProfit(e.target.checked)}
                      className="accent-emerald-500 w-3.5 h-3.5 rounded"
                    />
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Profit</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-lg hover:bg-rose-500/20 transition-colors">
                    <input
                      type="checkbox"
                      checked={filterExpense}
                      onChange={(e) => setFilterExpense(e.target.checked)}
                      className="accent-rose-500 w-3.5 h-3.5 rounded"
                    />
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Expense</span>
                  </label>

                  <span className="text-gold-500/30 font-light">|</span>

                  <label className="flex items-center gap-1.5 cursor-pointer text-purple-300 font-semibold bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 rounded-lg hover:bg-purple-500/20 transition-colors">
                    <input
                      type="checkbox"
                      checked={filterUpi}
                      onChange={(e) => setFilterUpi(e.target.checked)}
                      className="accent-purple-500 w-3.5 h-3.5 rounded"
                    />
                    <Wallet className="w-3.5 h-3.5" />
                    <span>UPI</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg hover:bg-amber-500/20 transition-colors">
                    <input
                      type="checkbox"
                      checked={filterCash}
                      onChange={(e) => setFilterCash(e.target.checked)}
                      className="accent-amber-500 w-3.5 h-3.5 rounded"
                    />
                    <span>Cash</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-sky-300 font-semibold bg-sky-500/10 border border-sky-500/30 px-2.5 py-1 rounded-lg hover:bg-sky-500/20 transition-colors">
                    <input
                      type="checkbox"
                      checked={filterCard}
                      onChange={(e) => setFilterCard(e.target.checked)}
                      className="accent-sky-500 w-3.5 h-3.5 rounded"
                    />
                    <span>Card</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-olive-300 block mb-1.5 font-medium">Export File Format</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${exportFormat === 'csv'
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
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${exportFormat === 'json'
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
    </div>
  );
};
