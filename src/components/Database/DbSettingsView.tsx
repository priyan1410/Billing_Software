import React, { useState, useEffect, useRef } from 'react';
import { Database, Download, Upload, RefreshCw, CheckCircle2, AlertTriangle, Trash2, Edit3, Save, Search, Utensils, Receipt, Wallet, Table, FileSpreadsheet, Settings, Server, X, HelpCircle, ChevronDown, ChevronUp, Package, Cloud, Wifi, WifiOff, Clock, ShieldCheck, Maximize2, Minimize2 } from 'lucide-react';
import { Dish, Order, Expense } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import { ConfirmDialog } from '../UI/ConfirmDialog';

export const DbSettingsView: React.FC = () => {
  const { isDbConnected, dbErrorMessage, checkDbStatus } = useAppStore();
  const [activeTab, setActiveTab] = useState<'menu_items' | 'orders' | 'expenses'>('menu_items');
  const [menuItems, setMenuItems] = useState<Dish[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRawTables, setShowRawTables] = useState(false);
  const [testing, setTesting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Dish>>({});

  // In-app confirm dialog state — replaces window.confirm() to avoid Electron focus-loss cursor bug
  const [confirmDishOpen, setConfirmDishOpen] = useState(false);
  const [pendingDeleteDishId, setPendingDeleteDishId] = useState<number | null>(null);
  const [confirmExpOpen, setConfirmExpOpen] = useState(false);
  const [pendingDeleteExpId, setPendingDeleteExpId] = useState<number | null>(null);

  // ─── Cloud Sync State (Phase 5) ───────────────────────────────────────────
  const [showCloudPanel, setShowCloudPanel] = useState(false);
  const [cloudForm, setCloudForm] = useState({
    host: '', port: '3306', user: '', password: '', database: 'kish_mandhi',
    useSSL: true
  });
  const [cloudTestMsg, setCloudTestMsg] = useState<string | null>(null);
  const [cloudTestOk, setCloudTestOk] = useState<boolean | null>(null);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudTesting, setCloudTesting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const sslInputRef = useRef<HTMLInputElement>(null);

  // Full PC Migration & Backup State
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'working' | 'success' | 'error'>('idle');
  const [migrationMsg, setMigrationMsg] = useState('');

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

  // Auto-Backup & Data Protection State
  const [backupConfig, setBackupConfig] = useState({
    enabled: true,
    backupPath: 'C:\\kish_mandhi_backups',
    retentionDays: 30,
    lastBackupTime: null as string | null
  });
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [showBackupHistory, setShowBackupHistory] = useState(false);

  useEffect(() => {
    loadAllData();
    loadDbConfig();
    loadBackupDetails();
    loadCloudConfig();
    loadSyncStatus();
  }, [activeTab]);

  const loadCloudConfig = async () => {
    try {
      const api = (window as any).electronAPI;
      if (api?.getCloudConfig) {
        const res = await api.getCloudConfig();
        if (res?.success && res.data) {
          setCloudForm(prev => ({ ...prev, ...res.data, password: '' }));
        }
      }
    } catch (e) {}
  };

  const loadSyncStatus = async () => {
    try {
      const api = (window as any).electronAPI;
      if (api?.getSyncStatus) {
        const res = await api.getSyncStatus();
        if (res?.success) setSyncStatus(res.data);
      }
    } catch (e) {}
  };

  const handleTestCloudConnection = async () => {
    setCloudTesting(true);
    setCloudTestMsg('Connecting to cloud server...');
    setCloudTestOk(null);
    try {
      const api = (window as any).electronAPI;
      if (api?.testCloudConnection) {
        const res = await api.testCloudConnection({ ...cloudForm });
        setCloudTestOk(!!res.success);
        setCloudTestMsg(res.message || (res.success ? '✓ Connected!' : '❌ Failed'));
      } else {
        setCloudTestMsg('❌ Cloud API not initialized in running process. Please restart app.');
        setCloudTestOk(false);
      }
    } catch (e: any) {
      setCloudTestOk(false);
      setCloudTestMsg('❌ Error: ' + e.message);
    } finally {
      setCloudTesting(false);
    }
  };

  const handleSaveCloudConfig = async () => {
    if (!cloudForm.host || !cloudForm.user) {
      setCloudTestMsg('❌ Please enter Host and Username.');
      setCloudTestOk(false);
      return;
    }
    setCloudSaving(true);
    setCloudTestMsg('Saving cloud configuration...');
    try {
      const api = (window as any).electronAPI;
      if (api?.saveCloudConfig) {
        const res = await api.saveCloudConfig({ ...cloudForm });
        setCloudTestOk(!!res.success);
        setCloudTestMsg(res.message || (res.success ? '✓ Saved! Sync starting...' : '❌ Failed to save'));
        if (res.success) await loadSyncStatus();
      } else {
        setCloudTestMsg('❌ Cloud API not initialized in running process. Please restart app.');
        setCloudTestOk(false);
      }
    } catch (e: any) {
      setCloudTestOk(false);
      setCloudTestMsg('❌ Error: ' + e.message);
    } finally {
      setCloudSaving(false);
    }
  };

  const handleSslUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const api = (window as any).electronAPI;
      if (api?.saveSslCert) {
        const res = await api.saveSslCert(content);
        if (res?.success) {
          setCloudForm(prev => ({ ...prev, sslCertPath: res.certPath } as any));
          setCloudTestMsg('✓ SSL certificate uploaded and saved.');
          setCloudTestOk(true);
        }
      }
    } catch (e: any) {
      setCloudTestMsg('❌ SSL upload error: ' + e.message);
      setCloudTestOk(false);
    }
  };

  const [manualSyncing, setManualSyncing] = useState(false);

  useEffect(() => {
    const syncInterval = setInterval(() => {
      loadSyncStatus();
    }, 4000);
    return () => clearInterval(syncInterval);
  }, []);

  const handleTriggerSync = async () => {
    setManualSyncing(true);
    try {
      const api = (window as any).electronAPI;
      if (api?.triggerSync) {
        await api.triggerSync();
        setTimeout(loadSyncStatus, 1000);
        setTimeout(loadSyncStatus, 2500);
        setTimeout(() => {
          loadSyncStatus();
          setManualSyncing(false);
        }, 4000);
      } else {
        setManualSyncing(false);
      }
    } catch (e) {
      setManualSyncing(false);
    }
  };


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

  const loadBackupDetails = async () => {
    try {
      const api = (window as any).electronAPI;
      if (api) {
        if (api.getBackupConfig) {
          const cfgRes = await api.getBackupConfig();
          if (cfgRes && cfgRes.success && cfgRes.data) {
            setBackupConfig(cfgRes.data);
          }
        }
        if (api.listBackups) {
          const listRes = await api.listBackups();
          if (listRes && listRes.success && Array.isArray(listRes.backups)) {
            setBackupsList(listRes.backups);
          }
        }
      }
    } catch (e) {
      console.error('loadBackupDetails error:', e);
    }
  };

  const handleInstantBackup = async () => {
    setBackupLoading(true);
    setBackupMsg('Creating full system snapshot...');
    try {
      const api = (window as any).electronAPI;
      if (api?.createBackup) {
        const res = await api.createBackup();
        if (res && res.success) {
          setBackupMsg(res.message);
          await loadBackupDetails();
        } else {
          setBackupMsg('❌ Backup failed: ' + (res?.message || 'Unknown error'));
        }
      } else {
        alert('Instant backup is available in Desktop App mode.');
      }
    } catch (err: any) {
      setBackupMsg('❌ Backup Error: ' + err.message);
    } finally {
      setBackupLoading(false);
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

  const handleDeleteDish = (id: number) => {
    if (editingId === id) {
      setEditingId(null);
      setEditForm({});
    }
    setPendingDeleteDishId(id);
    setConfirmDishOpen(true);
  };

  const executeDeleteDish = async () => {
    setConfirmDishOpen(false);
    if (pendingDeleteDishId == null) return;
    const id = pendingDeleteDishId;
    setPendingDeleteDishId(null);
    if ((window as any).electronAPI) {
      await (window as any).electronAPI.deleteMenuItem(id);
      await loadAllData();
    }
  };

  const handleDeleteExpense = (id: number) => {
    setPendingDeleteExpId(id);
    setConfirmExpOpen(true);
  };

  const executeDeleteExpense = async () => {
    setConfirmExpOpen(false);
    if (pendingDeleteExpId == null) return;
    const id = pendingDeleteExpId;
    setPendingDeleteExpId(null);
    if ((window as any).electronAPI) {
      await (window as any).electronAPI.deleteExpense(id);
      await loadAllData();
    }
  };

  const handleExportFullSystem = async () => {
    try {
      if ((window as any).electronAPI?.exportFullSystem) {
        const res = await (window as any).electronAPI.exportFullSystem();
        if (res && res.success && res.data) {
          const jsonStr = JSON.stringify(res.data, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `KishMandhi_Full_System_Backup_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          alert('✓ Full System Backup exported successfully! You can copy this file to another PC and import it.');
        } else {
          alert(res?.message || 'Full system export failed.');
        }
      } else {
        alert('Full system export API unavailable in browser mode.');
      }
    } catch (err: any) {
      alert('Error exporting full system: ' + err.message);
    }
  };

  const handleImportFullSystemFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('This will import 100% of all software data, restaurant branding, custom icons, dishes, orders, and expenses into your database. Proceed with full PC migration import?')) {
      return;
    }

    setMigrationStatus('working');
    setMigrationMsg(`Reading full system backup ${file.name}...`);

    try {
      const text = await file.text();
      const backupObj = JSON.parse(text);

      if (!backupObj || typeof backupObj !== 'object') {
        setMigrationStatus('error');
        setMigrationMsg('Invalid backup file. Please select a valid Kish Mandhi full system JSON backup file.');
        return;
      }

      setMigrationMsg('Restoring restaurant branding, menu dishes, orders & expenses into database...');

      if ((window as any).electronAPI?.importFullSystem) {
        const res = await (window as any).electronAPI.importFullSystem(backupObj);
        if (res && res.success) {
          setMigrationStatus('success');
          setMigrationMsg(`✓ ${res.message || 'Full system migration completed successfully!'}`);
          useAuthStore.getState().loadRestaurantDetails();
          await loadAllData();
          setTimeout(() => setMigrationStatus('idle'), 6000);
        } else {
          setMigrationStatus('error');
          setMigrationMsg(res?.message || 'Full system migration failed.');
        }
      } else {
        setMigrationStatus('error');
        setMigrationMsg('Database API unavailable in browser mode.');
      }
    } catch (err: any) {
      console.error('Import full system error:', err);
      setMigrationStatus('error');
      setMigrationMsg(err.message || 'Error parsing full backup file.');
    }
  };

  const filteredMenuItems = menuItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredOrders = orders.filter(o => o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) || o.paymentMode.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredExpenses = expenses.filter(e => e.description.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 select-none max-w-5xl pb-10">
      {/* In-app Delete Confirmation Dialogs (replaces window.confirm to fix Electron cursor bug) */}
      <ConfirmDialog
        open={confirmDishOpen}
        title="Delete Menu Dish"
        message="Are you sure you want to permanently delete this dish from the database? This action cannot be undone."
        confirmLabel="Delete Dish"
        cancelLabel="Cancel"
        onConfirm={executeDeleteDish}
        onCancel={() => { setConfirmDishOpen(false); setPendingDeleteDishId(null); }}
      />
      <ConfirmDialog
        open={confirmExpOpen}
        title="Delete Expense Record"
        message="Are you sure you want to permanently delete this expense record? This action cannot be undone."
        confirmLabel="Delete Record"
        cancelLabel="Cancel"
        onConfirm={executeDeleteExpense}
        onCancel={() => { setConfirmExpOpen(false); setPendingDeleteExpId(null); }}
      />


      {/* Full System PC Migration & Backup Card */}
      <div className="bg-gradient-to-r from-amber-950/70 via-olive-900 to-amber-950/70 border border-gold-500/40 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-gold-400 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white tracking-wide">Full System Backup & PC Migration</h4>
              <p className="text-xs text-olive-300 mt-0.5">
                Export 100% of all data (branding, logo, icon, dishes, orders & expenses) from PC 1 and restore onto PC 2
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportFullSystem}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:scale-[1.02] transition-all"
              title="Export complete database backup containing all settings, dishes, bills, and expenses"
            >
              <Download className="w-4 h-4" />
              <span>Export Entire System Data</span>
            </button>

            <label className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg hover:scale-[1.02] transition-all cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Import & Migrate System Data</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFullSystemFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Migration Status Message */}
        {migrationStatus !== 'idle' && (
          <div className={`mt-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 ${
            migrationStatus === 'working' ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' :
            migrationStatus === 'success' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' :
            'bg-rose-500/20 border border-rose-500/40 text-rose-300'
          }`}>
            {migrationStatus === 'working' && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
            {migrationStatus === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {migrationStatus === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{migrationMsg}</span>
          </div>
        )}
      </div>

      {/* Auto-Backup & Data Protection Center (Hidden per UX layout preferences) */}


      {/* ─── RAW DATABASE TABLES INSPECTOR (COLLAPSIBLE / MINIMIZE & MAXIMIZE) ─── */}
      <div className="bg-olive-900 border border-gold-500/20 rounded-2xl shadow-lg overflow-hidden">
        {/* Collapsible Card Header */}
        <button
          onClick={() => setShowRawTables(p => !p)}
          className="w-full flex items-center justify-between p-4 bg-olive-900 hover:bg-olive-800/40 transition-colors border-b border-gold-500/10"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <Table className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Raw Database Tables Inspector
                <span className="text-[10px] bg-gold-500/20 text-gold-300 px-2 py-0.5 rounded-full border border-gold-500/30 font-semibold font-mono">
                  {menuItems.length + orders.length + expenses.length} Total Records
                </span>
              </h3>
              <p className="text-xs text-olive-300">
                Inspect, search, edit dishes & prices, export/import raw data tables
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gold-400 font-semibold bg-olive-950/60 px-3 py-1.5 rounded-xl border border-gold-500/20">
            {showRawTables ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Minimize Table</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Maximize Table</span>
              </>
            )}
          </div>
        </button>

        {showRawTables && (
          <div className="p-5 space-y-4">
            {/* Record Counter Tabs & Search */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-olive-950/80 border border-gold-500/20 p-2 rounded-2xl">
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
              <div className="bg-olive-950/60 border border-gold-500/20 rounded-2xl p-4 space-y-4">
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
                          autoFocus
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
            <div className="flex items-center gap-3">
              <label className="text-xs text-amber-300 hover:underline font-bold flex items-center gap-1 cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Import Bills (.JSON/.CSV)
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      let list: any[] = [];
                      if (file.name.endsWith('.json')) {
                        const parsed = JSON.parse(text);
                        list = Array.isArray(parsed) ? parsed : (parsed.orders || parsed.bills || []);
                      }
                      if (list.length > 0 && (window as any).electronAPI?.importBackup) {
                        const res = await (window as any).electronAPI.importBackup({ orders: list });
                        if (res && res.success) {
                          alert(`Imported ${list.length} bills successfully!`);
                          window.location.reload();
                        } else {
                          alert(res?.message || 'Import failed.');
                        }
                      }
                    } catch (err: any) {
                      alert('Error reading bill file: ' + err.message);
                    }
                  }}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleExportOrdersExcel}
                className="text-xs text-emerald-400 hover:underline font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Download Excel Sheet
              </button>
            </div>
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
              <div className="bg-olive-950/60 border border-gold-500/20 rounded-2xl p-4 space-y-4">
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
                            {formatDateDDMMYYYY(exp.expenseDate || (exp as any).expense_date)}
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
          </div>
        )}
      </div>

      {/* ─── PRIMARY DATABASE PANEL (Local MySQL - Required) ─── */}
      <div className="bg-olive-900 border border-gold-500/30 rounded-2xl shadow-lg overflow-hidden">
        <button
          onClick={() => setShowConfigModal(p => !p)}
          className="w-full flex items-center justify-between p-5 hover:bg-olive-800/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isDbConnected
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Primary Database (Local MySQL)
                {isDbConnected
                  ? <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">CONNECTED</span>
                  : <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30 font-semibold">DISCONNECTED</span>
                }
              </h3>
              <p className="text-xs text-olive-300">
                Primary database engine for instant local billing (Host: {dbConfig.host || 'localhost'}:{dbConfig.port || '3306'})
              </p>
            </div>
          </div>
          {showConfigModal ? <ChevronUp className="w-4 h-4 text-olive-300" /> : <ChevronDown className="w-4 h-4 text-olive-300" />}
        </button>

        {showConfigModal && (
          <div className="border-t border-gold-500/20 p-5 space-y-4">
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
                  className="flex-1 py-2.5 bg-olive-800 border border-gold-500/30 text-gold-400 font-bold rounded-xl hover:bg-gold-500 hover:text-olive-950 transition-colors flex items-center justify-center gap-1.5 text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} /> Test Connection
                </button>

                <button
                  type="submit"
                  disabled={savingConfig}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-1.5 text-xs"
                >
                  <Save className="w-3.5 h-3.5" /> Save & Connect
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ─── CLOUD SYNC PANEL (Phase 5) ───────────────────────────────────── */}
      <div className="bg-olive-900 border border-gold-500/20 rounded-2xl shadow-lg overflow-hidden">
        {/* Header toggle */}
        <button
          onClick={() => setShowCloudPanel(p => !p)}
          className="w-full flex items-center justify-between p-5 hover:bg-olive-800/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              syncStatus?.isCloudConfigured
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : 'bg-gold-500/10 border border-gold-500/30 text-gold-400'
            }`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Cloud Sync
                {syncStatus?.isCloudConfigured ? (
                  manualSyncing || syncStatus?.isSyncing ? (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold animate-pulse flex items-center gap-1">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-400" /> SYNCING...
                    </span>
                  ) : (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">ACTIVE</span>
                  )
                ) : (
                  <span className="text-[10px] bg-gold-500/10 text-gold-400 px-2 py-0.5 rounded-full border border-gold-500/30 font-semibold">NOT CONFIGURED</span>
                )}
              </h3>
              <p className="text-xs text-olive-300">
                {syncStatus?.isCloudConfigured
                  ? `Last sync: ${syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleTimeString() : 'Never'} • ${syncStatus.pendingCount || 0} pending`
                  : 'Connect any cloud MySQL provider — Aiven, AWS RDS, Railway, DigitalOcean, VPS...'}
              </p>
            </div>
          </div>
          {showCloudPanel ? <ChevronUp className="w-4 h-4 text-olive-300" /> : <ChevronDown className="w-4 h-4 text-olive-300" />}
        </button>

        {showCloudPanel && (
          <div className="border-t border-gold-500/20 p-5 space-y-5">

            {/* Sync Status Bar */}
            {syncStatus?.isCloudConfigured && (
              <div className="flex flex-wrap items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center gap-1.5 text-xs text-emerald-300">
                  <Wifi className="w-3.5 h-3.5" /> Cloud Connected
                </div>
                <div className="flex items-center gap-1.5 text-xs text-olive-300">
                  <Clock className="w-3.5 h-3.5" />
                  Last sync: {syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleString() : 'Pending first sync...'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gold-400">
                  Pending: {syncStatus.pendingCount || 0} records
                </div>
                <button
                  type="button"
                  onClick={handleTriggerSync}
                  disabled={manualSyncing || syncStatus?.isSyncing}
                  className="ml-auto text-[11px] px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${manualSyncing || syncStatus?.isSyncing ? 'animate-spin' : ''}`} />
                  {manualSyncing || syncStatus?.isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            )}

            {/* Credentials Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-olive-300 block mb-1 font-semibold">Host / Server Address</label>
                <input
                  type="text"
                  value={cloudForm.host}
                  onChange={e => setCloudForm(p => ({ ...p, host: e.target.value }))}
                  placeholder="mysql-xxx.aivencloud.com"
                  className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-xl text-white text-xs focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="text-xs text-olive-300 block mb-1 font-semibold">Port</label>
                <input
                  type="number"
                  value={cloudForm.port}
                  onChange={e => setCloudForm(p => ({ ...p, port: e.target.value }))}
                  placeholder="3306"
                  className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-xl text-white text-xs focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="text-xs text-olive-300 block mb-1 font-semibold">Username</label>
                <input
                  type="text"
                  value={cloudForm.user}
                  onChange={e => setCloudForm(p => ({ ...p, user: e.target.value }))}
                  placeholder="avnadmin or db_user"
                  className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-xl text-white text-xs focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="text-xs text-olive-300 block mb-1 font-semibold">Password</label>
                <input
                  type="password"
                  value={cloudForm.password}
                  onChange={e => setCloudForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-xl text-white text-xs focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="text-xs text-olive-300 block mb-1 font-semibold">Database Name</label>
                <input
                  type="text"
                  value={cloudForm.database}
                  onChange={e => setCloudForm(p => ({ ...p, database: e.target.value }))}
                  placeholder="kish_mandhi"
                  className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-xl text-white text-xs focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="text-xs text-olive-300 block mb-1 font-semibold">SSL Certificate (optional)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => sslInputRef.current?.click()}
                    className="flex-1 px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-xl text-olive-300 text-xs hover:border-gold-500/50 flex items-center gap-1.5 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
                    {(cloudForm as any).sslCertPath ? 'SSL Cert Saved ✓' : 'Upload CA Certificate .pem'}
                  </button>
                  <input
                    ref={sslInputRef}
                    type="file"
                    accept=".pem,.crt,.cer"
                    className="hidden"
                    onChange={handleSslUpload}
                  />
                  <label className="flex items-center gap-1.5 text-xs text-olive-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cloudForm.useSSL}
                      onChange={e => setCloudForm(p => ({ ...p, useSSL: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded"
                    />
                    Use SSL
                  </label>
                </div>
              </div>
            </div>

            {/* Provider Note */}
            <p className="text-[11px] text-olive-400 bg-olive-950/60 px-3 py-2 rounded-lg border border-gold-500/10">
              Compatible with: Aiven • AWS RDS • Google Cloud SQL • DigitalOcean • Railway • Hostinger • Any VPS running MySQL
            </p>

            {/* Feedback Message */}
            {cloudTestMsg && (
              <div className={`text-xs px-3 py-2 rounded-xl border font-semibold ${
                cloudTestOk
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {cloudTestMsg}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTestCloudConnection}
                disabled={cloudTesting || !cloudForm.host}
                className="flex-1 py-2.5 bg-olive-800 border border-gold-500/30 text-gold-400 font-bold rounded-xl hover:bg-gold-500 hover:text-olive-950 transition-colors flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cloudTesting ? 'animate-spin' : ''}`} />
                {cloudTesting ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                type="button"
                onClick={handleSaveCloudConfig}
                disabled={cloudSaving || !cloudForm.host || !cloudForm.user}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {cloudSaving ? 'Saving...' : 'Save & Enable Sync'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
