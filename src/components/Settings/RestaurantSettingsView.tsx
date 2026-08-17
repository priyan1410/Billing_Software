import React, { useState, useEffect } from 'react';
import {
  Building2, Receipt, Phone, Mail, MapPin, Percent,
  FileText, Save, CheckCircle2, AlertCircle, User,
  LogOut, Shield, Store, Edit3, RefreshCw, Printer,
  Upload, Image as ImageIcon, Trash2, Crown, ChevronRight,
  ArrowLeft, Search, BarChart2, Download, Calendar
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { RestaurantDetails } from '../../types';
import { ConfirmDialog } from '../UI/ConfirmDialog';
import { DatePicker } from '../UI/DatePicker';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

const compressImage = (file: File, maxDim: number = 512, format: 'image/png' | 'image/jpeg' = 'image/png'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL(format, 0.9));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

const SectionCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; subtitle?: string }> = ({ title, icon, children, subtitle }) => (
  <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-6 space-y-5 shadow-xl">
    <div className="flex items-center gap-3 pb-4 border-b border-white/10">
      <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center text-amber-400">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const FieldRow: React.FC<{
  id: string;
  label: string;
  type?: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  half?: boolean;
}> = ({ id, label, type = 'text', value, onChange, placeholder, half }) => (
  <div className={half ? '' : 'col-span-2'}>
    <label htmlFor={id} className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5">{label}</label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all"
    />
  </div>
);

export const RestaurantSettingsView: React.FC = () => {
  const { restaurantDetails, user, updateRestaurantDetails, loadRestaurantDetails, logout } = useAuthStore();
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState<RestaurantDetails & { taxRateStr: string; totalTablesStr: string }>({
    ...restaurantDetails,
    taxRateStr: String(restaurantDetails.taxRate ?? 0),
    totalTablesStr: String(restaurantDetails.totalTables ?? 10)
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [repStartDate, setRepStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Last 30 days default
    return d.toISOString().split('T')[0];
  });
  const [repEndDate, setRepEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [repIsGenerating, setRepIsGenerating] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const [systemPrinters, setSystemPrinters] = useState<{ name: string; displayName?: string; isDefault?: boolean }[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);

  const fetchPrinters = async () => {
    setLoadingPrinters(true);
    try {
      const api = (window as any).electronAPI;
      const getPrintersFn = api?.getSystemPrinters || api?.getPrinters;
      if (getPrintersFn) {
        const res = await getPrintersFn();
        if (res && res.success && Array.isArray(res.printers)) {
          setSystemPrinters(res.printers);
        }
      }
    } catch (e) {
      console.error('fetchPrinters error:', e);
    } finally {
      setLoadingPrinters(false);
    }
  };

  useEffect(() => {
    loadRestaurantDetails();
    fetchPrinters();
  }, []);

  useEffect(() => {
    setForm({
      ...restaurantDetails,
      taxRateStr: String(restaurantDetails.taxRate ?? 0),
      totalTablesStr: String(restaurantDetails.totalTables ?? 10)
    });
    setIsDirty(false);
  }, [restaurantDetails]);

  const update = (key: keyof RestaurantDetails | 'taxRateStr' | 'totalTablesStr', value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    const parsedTax = Number(form.taxRateStr);
    const payload: Partial<RestaurantDetails> = {
      companyName: form.companyName,
      tagline: form.tagline,
      ownerName: form.ownerName,
      gstNumber: form.gstNumber,
      fssaiNumber: form.fssaiNumber,
      phone: form.phone,
      email: form.email,
      address: form.address,
      taxRate: isNaN(parsedTax) ? 0 : parsedTax,
      totalTables: Math.max(1, Number(form.totalTablesStr) || 10),
      currency: form.currency,
      headerNote: form.headerNote,
      footerNote: form.footerNote,
      logoUrl: form.logoUrl || '',
      softwareIconUrl: form.softwareIconUrl || '',
      printShowLogo: form.printShowLogo ?? true,
      printShowAddress: form.printShowAddress ?? true,
      printShowPhone: form.printShowPhone ?? true,
      printShowGst: form.printShowGst ?? true,
      printShowHeaderNote: form.printShowHeaderNote ?? true,
      printShowTime: form.printShowTime ?? true,
      printShowTaxBreakdown: form.printShowTaxBreakdown ?? true,
      printShowRoundOff: form.printShowRoundOff ?? true,
      printShowFooterNote: form.printShowFooterNote ?? true,
      printWithToken: form.printWithToken ?? true,
      printOption: form.printWithToken === false ? 'bill' : (form.printOption || 'both'),
      printer1Name: form.printer1Name || '',
      printer1Target: form.printer1Target || 'both',
      printer2Name: form.printer2Name || '',
      printer2Target: form.printer2Target || (form.printer2Name ? 'token' : 'none')
    };

    const res = await updateRestaurantDetails(payload);
    if (res.success) {
      setSaveStatus('saved');
      setSaveMsg('Settings saved successfully!');
      setIsDirty(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('error');
      setSaveMsg(res.message || 'Failed to save settings');
    }
  };

  const handleDownloadPDF = async () => {
    if (repIsGenerating) return;
    setRepIsGenerating(true);
    try {
      const startStr = repStartDate;
      const endStr = repEndDate;

      if (!(window as any).electronAPI) {
        showToast('System backend is not connected.', 'error');
        setRepIsGenerating(false);
        return;
      }

      const formatDateStr = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
      };

      // 1. Fetch data
      const pnlRes = await (window as any).electronAPI.getPnLSummary({ startDate: startStr, endDate: endStr });
      const foodRes = await (window as any).electronAPI.getFoodSalesReport({
        period: 'custom',
        startDate: startStr,
        endDate: endStr
      });

      if (!pnlRes.success || !foodRes.success) {
        showToast('Failed to retrieve business metrics data.', 'error');
        setRepIsGenerating(false);
        return;
      }

      const { totalRevenue, totalExpenses, netProfit, orders, expenses } = pnlRes.data;
      const foodSales = foodRes.data || [];

      // 2. Initialize jsPDF
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Color scheme tokens (matching our Palladian, Oatmeal, Truffle, Abyssal Anchorfish scheme)
      const primaryColor: [number, number, number] = [27, 38, 50]; // Abyssal Anchorfish Blue (#1B2632)
      const accentColor: [number, number, number] = [163, 81, 57]; // Truffle Trouble (#A35139)
      const goldColor: [number, number, number] = [255, 177, 98]; // Burning Flame (#FFB162)
      const lightBgColor: [number, number, number] = [238, 233, 223]; // Palladian (#EEE9DF)

      // Utility to draw header banner
      const drawHeader = (titleText: string) => {
        // Draw primary header border line
        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setLineWidth(1);
        doc.line(14, 25, pageWidth - 14, 25);

        // Restaurant Brand Header
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(restaurantDetails?.companyName || 'KISH MANDHI', 14, 15);

        doc.setFont('Helvetica', 'oblique');
        doc.setFontSize(9);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(restaurantDetails?.tagline || 'Arabic Grill & Fine Dining', 14, 20);

        // Right side metadata
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`Report Period: ${formatDateStr(startStr)} to ${formatDateStr(endStr)}`, pageWidth - 14, 14, { align: 'right' });
        doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth - 14, 19, { align: 'right' });

        // Section Title banner
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text(titleText, 14, 32);
      };

      // Utility to draw footer on each page
      const drawFooter = (pageNum: number, totalPages: number) => {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Kish Mandhi Billing Software System Summary', 14, pageHeight - 10);
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
      };

      // ─────────────────────────────────────────────────────────────
      // PAGE 1: EXECUTIVE FINANCIAL SUMMARY & EXPENSE LOGS
      // ─────────────────────────────────────────────────────────────
      drawHeader('I. EXECUTIVE FINANCIAL STATEMENT');

      // Draw KPI rectangles
      const kpiWidth = (pageWidth - 28 - 8) / 3; // split width for 3 cards
      const kpiHeight = 22;
      const kpiY = 38;

      // 1. Total Revenue Card
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.roundedRect(14, kpiY, kpiWidth, kpiHeight, 3, 3, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('TOTAL REVENUE', 18, kpiY + 6);
      doc.setFontSize(12);
      doc.text(`Rs. ${Number(totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 18, kpiY + 14);

      // 2. Total Expenses Card
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.roundedRect(14 + kpiWidth + 4, kpiY, kpiWidth, kpiHeight, 3, 3, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('TOTAL EXPENSES', 18 + kpiWidth + 4, kpiY + 6);
      doc.setFontSize(12);
      doc.text(`Rs. ${Number(totalExpenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 18 + kpiWidth + 4, kpiY + 14);

      // 3. Net Profit Card
      const profitColor = netProfit >= 0 ? [39, 174, 96] : [192, 57, 43]; // green if profit, red if loss
      doc.setFillColor(profitColor[0], profitColor[1], profitColor[2]);
      doc.roundedRect(14 + (kpiWidth + 4) * 2, kpiY, kpiWidth, kpiHeight, 3, 3, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS', 18 + (kpiWidth + 4) * 2, kpiY + 6);
      doc.setFontSize(12);
      doc.text(`Rs. ${Number(netProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 18 + (kpiWidth + 4) * 2, kpiY + 14);

      // Itemized Expenses Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('ITEMIZED EXPENSES RECORD', 14, kpiY + kpiHeight + 10);

      // Draw Expenses Table
      const expensesBody = expenses.map((e: any) => [
        e.expenseDate || e.expense_date || '-',
        e.category || '-',
        e.description || '-',
        e.paidTo || e.paid_to || '-',
        e.paymentMode || e.payment_mode || '-',
        `Rs. ${Number(e.amount || 0).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: kpiY + kpiHeight + 14,
        head: [['Date', 'Category', 'Description', 'Paid To', 'Mode', 'Amount']],
        body: expensesBody.length > 0 ? expensesBody : [['No expenses recorded for this period', '', '', '', '', '']],
        headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [248, 246, 242] },
        margin: { left: 14, right: 14 },
        styles: { font: 'Helvetica' }
      });

      // ─────────────────────────────────────────────────────────────
      // PAGE 2: FOOD SALES & ITEMISED DISH SHARE
      // ─────────────────────────────────────────────────────────────
      doc.addPage();
      drawHeader('II. ITEMISED FOOD SALES & DISH SHARE');

      // Grand total of item sales quantity and value
      const grandTotalSalesVal = foodSales.reduce((sum: number, item: any) => sum + Number(item.totalSales || 0), 0);
      const grandTotalQtySold = foodSales.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);

      const foodSalesBody = foodSales.map((item: any) => {
        const share = grandTotalSalesVal > 0 ? ((item.totalSales / grandTotalSalesVal) * 100).toFixed(1) : '0';
        return [
          item.name || '-',
          item.variant || 'Standard',
          item.quantity || '0',
          `Rs. ${Number(item.avgPrice || 0).toFixed(2)}`,
          `Rs. ${Number(item.totalSales || 0).toFixed(2)}`,
          `${share}%`
        ];
      });

      if (foodSales.length > 0) {
        foodSalesBody.push([
          'TOTAL FOOD SALES SUMMARY',
          '',
          String(grandTotalQtySold),
          '',
          `Rs. ${grandTotalSalesVal.toFixed(2)}`,
          '100%'
        ]);
      }

      autoTable(doc, {
        startY: 38,
        head: [['Dish Name', 'Variant', 'Qty Sold', 'Avg Price', 'Total Sales', 'Share %']],
        body: foodSalesBody.length > 0 ? foodSalesBody : [['No food sales transactions in this period', '', '', '', '', '']],
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [248, 246, 242] },
        margin: { left: 14, right: 14 },
        styles: { font: 'Helvetica' },
        didParseCell: (data: any) => {
          if (foodSales.length > 0 && data.row.index === foodSalesBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [238, 233, 223];
          }
        }
      });

      // ─────────────────────────────────────────────────────────────
      // PAGE 3: ORDER TRANSACTION LOGS (COMPLETED BILLS)
      // ─────────────────────────────────────────────────────────────
      doc.addPage();
      drawHeader('III. COMPLETED TRANSACTION & BILLING LOGS');

      const ordersBody = orders.map((o: any) => {
        let paymentModeText = o.paymentMethod || o.payment_mode || o.payment_method || '-';
        if (String(paymentModeText).toUpperCase().startsWith('DEO')) {
          let c = Number(o.cashAmount || o.cash_amount || 0);
          let u = Number(o.upiAmount || o.upi_amount || 0);
          if (c === 0 && u === 0 && paymentModeText) {
            const cashMatch = paymentModeText.match(/Cash:\s*₹?\s*([\d\.]+)/i);
            const upiMatch = paymentModeText.match(/UPI:\s*₹?\s*([\d\.]+)/i);
            if (cashMatch && cashMatch[1]) c = parseFloat(cashMatch[1]) || 0;
            if (upiMatch && upiMatch[1]) u = parseFloat(upiMatch[1]) || 0;
          }
          if (c > 0 || u > 0) {
            paymentModeText = `DEO (Cash: Rs. ${c} + UPI: Rs. ${u})`;
          } else {
            paymentModeText = 'DEO (Dual)';
          }
        }
        return [
          o.billNo || o.bill_no || '-',
          o.customerName || o.customer_name || 'Walk-in',
          o.customerPhone || o.customer_phone || '-',
          paymentModeText,
          o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-',
          `Rs. ${Number(o.grandTotal || o.grand_total || 0).toFixed(2)}`
        ];
      });

      autoTable(doc, {
        startY: 38,
        head: [['Bill Number', 'Customer Name', 'Phone', 'Payment Mode', 'Date', 'Amount']],
        body: ordersBody.length > 0 ? ordersBody : [['No orders found in this period', '', '', '', '', '']],
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [248, 246, 242] },
        margin: { left: 14, right: 14 },
        styles: { font: 'Helvetica' }
      });

      // Apply page footers
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(i, totalPages);
      }

      // Save PDF
      doc.save(`Kish_Mandhi_Business_Report_${startStr}_to_${endStr}.pdf`);
      showToast('Business report downloaded successfully.');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showToast('Error generating PDF. Check console logs.', 'error');
    } finally {
      setRepIsGenerating(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const sectionHeadings = [
    {
      id: 'identity',
      title: 'Restaurant Identity',
      subtitle: 'Core company name, tagline, owner name, and currency symbol',
      icon: <Building2 className="w-5 h-5 text-amber-400" />,
      badge: form.companyName || 'Not set',
      keywords: 'identity name company tagline owner currency'
    },
    {
      id: 'branding',
      title: 'Branding, Custom Logo & Software Icon',
      subtitle: 'Upload and edit custom restaurant logo and software app window icon',
      icon: <ImageIcon className="w-5 h-5 text-amber-400" />,
      badge: form.logoUrl || form.softwareIconUrl ? 'Custom Icon Active' : 'Default Icon',
      keywords: 'branding logo software icon app photo image picture window'
    },
    {
      id: 'tax',
      title: 'Compliance & Tax Rate',
      subtitle: 'GSTIN number, FSSAI license, and default tax percentage',
      icon: <Receipt className="w-5 h-5 text-amber-400" />,
      badge: `Tax Rate: ${form.taxRateStr}%`,
      keywords: 'compliance tax gst gstin fssai rate percent'
    },
    {
      id: 'contact',
      title: 'Contact Details',
      subtitle: 'Restaurant phone number, email address, and physical address',
      icon: <Phone className="w-5 h-5 text-amber-400" />,
      badge: form.phone || form.email ? 'Configured' : 'Not set',
      keywords: 'contact phone email address location mobile'
    },
    {
      id: 'receipts',
      title: 'Receipt Notes & Bill Print Options',
      subtitle: 'Header/footer receipt messages and thermal bill print visibility settings',
      icon: <Printer className="w-5 h-5 text-amber-400" />,
      badge: 'Thermal Bill Options',
      keywords: 'receipt print notes header footer thermal printer layout'
    },
    {
      id: 'account',
      title: 'Account Information',
      subtitle: 'Logged-in user details, role permissions, and session logout',
      icon: <Shield className="w-5 h-5 text-amber-400" />,
      badge: user?.role || 'Admin',
      keywords: 'account admin user role session logout security'
    },
    {
      id: 'reports',
      title: 'Business Reports',
      subtitle: 'Generate and download financial summaries, expenses, and food sales as PDF',
      icon: <BarChart2 className="w-5 h-5 text-amber-400" />,
      badge: 'Download PDF',
      keywords: 'report reports pdf export download stats sales revenue expense profit'
    }
  ];

  const filteredHeadings = sectionHeadings.filter(h => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return h.title.toLowerCase().includes(q) || h.subtitle.toLowerCase().includes(q) || h.keywords.includes(q);
  });

  const activeHeading = sectionHeadings.find(h => h.id === activeSectionId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto select-none">

      {/* Save Status Banner */}
      {saveStatus === 'saved' && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {saveMsg}
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {saveMsg}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1ST VIEW: LIST OF HEADINGS MENU (NATIVE APP / MOBILE STYLE) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSectionId === null ? (
        <div className="space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Store className="w-6 h-6 text-amber-400" />
                Settings
              </h2>
              <p className="text-sm text-white/40 mt-1">Select a section heading below to view and edit its contents</p>
            </div>
            {isDirty && (
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl text-sm hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20"
              >
                {saveStatus === 'saving' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            )}
          </div>

          {/* Quick Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings (e.g. logo, tax, phone, receipt notes)..."
              className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all"
            />
          </div>

          {/* Headings List */}
          <div className="grid grid-cols-1 gap-2.5">
            {filteredHeadings.length === 0 ? (
              <div className="p-8 text-center bg-white/5 rounded-2xl text-white/40 text-sm">
                No setting sections match "{searchQuery}"
              </div>
            ) : (
              filteredHeadings.map((heading) => (
                <div
                  key={heading.id}
                  onClick={() => setActiveSectionId(heading.id)}
                  className="group flex items-center p-4 bg-white/5 hover:bg-amber-500/15 rounded-2xl cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-white/5 group-hover:bg-amber-500/20 rounded-xl flex items-center justify-center transition-all shrink-0">
                      {heading.icon}
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                      {heading.title}
                    </h3>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      ) : (

        /* ───────────────────────────────────────────────────────────── */
        /* 2ND VIEW: SEPARATE SECTION CONTENTS VIEW (INSIDE A HEADING)   */
        /* ───────────────────────────────────────────────────────────── */
        <div className="space-y-6">

          {/* Section Breadcrumb Navigation Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveSectionId(null)}
                className="flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 rounded-xl text-xs font-bold transition-all group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Settings List
              </button>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {activeHeading?.title}
                </h2>
                <p className="text-xs text-white/40">{activeHeading?.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isDirty && (
                <span className="text-xs text-amber-400 flex items-center gap-1 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">
                  <Edit3 className="w-3 h-3" /> Unsaved
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={!isDirty || saveStatus === 'saving'}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl text-xs hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saveStatus === 'saving' ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                ) : saveStatus === 'saved' ? (
                  <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Section</>
                )}
              </button>
            </div>
          </div>

          {/* Dedicated Section Contents */}
          <div>

            {/* 1. RESTAURANT IDENTITY CONTENT */}
            {activeSectionId === 'identity' && (
              <SectionCard title="Restaurant Identity" icon={<Building2 className="w-5 h-5" />} subtitle="Core branding and company details">
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow id="s-company" label="Company / Restaurant Name *" value={form.companyName} onChange={(v) => update('companyName', v)} placeholder="Kish Mandhi" />
                  <FieldRow id="s-tagline" label="Tagline / Description" value={form.tagline || ''} onChange={(v) => update('tagline', v)} placeholder="Arabic Grill & Fine Dining" />
                  <FieldRow id="s-owner" label="Owner / Manager Name" value={form.ownerName || ''} onChange={(v) => update('ownerName', v)} placeholder="Your Name" half />
                  <FieldRow id="s-currency" label="Currency Symbol" value={form.currency || '₹'} onChange={(v) => update('currency', v)} placeholder="₹" half />
                </div>
              </SectionCard>
            )}

            {/* 2. BRANDING, LOGO & SOFTWARE ICON CONTENT */}
            {activeSectionId === 'branding' && (
              <SectionCard title="Branding, Custom Logo & Software Icon" icon={<ImageIcon className="w-5 h-5" />} subtitle="Upload and edit your custom restaurant logo and software app icon">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Custom Logo Card */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-amber-400" /> Custom Logo
                        </label>
                        {form.logoUrl ? (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            Custom Logo Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mb-4">
                        Displayed on software sidebar header, POS billing preview, login page, and thermal receipt prints.
                      </p>

                      {/* Logo Preview */}
                      <div className="w-full h-36 bg-black/40 border border-dashed border-white/15 rounded-xl flex flex-col items-center justify-center p-3 relative overflow-hidden group">
                        {form.logoUrl ? (
                          <img src={form.logoUrl} alt="Custom Logo Preview" className="max-h-full max-w-full object-contain drop-shadow-md" />
                        ) : (
                          <div className="flex flex-col items-center text-center text-white/30">
                            <Store className="w-10 h-10 mb-2 stroke-1" />
                            <span className="text-xs font-medium">No Custom Logo Uploaded</span>
                            <span className="text-[10px] text-white/20 mt-0.5">Supports PNG, JPG, WEBP, SVG</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2">
                      <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 rounded-xl text-xs font-bold cursor-pointer transition-all">
                        <Upload className="w-4 h-4" />
                        {form.logoUrl ? 'Change Logo' : 'Upload Logo'}
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp, image/svg+xml"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImage(file, 600, 'image/png');
                                update('logoUrl', compressed);
                               } catch (err) {
                                 showToast('Error reading logo file', 'error');
                               }
                            }
                          }}
                        />
                      </label>
                      {form.logoUrl && (
                        <button
                          type="button"
                          onClick={() => update('logoUrl', '')}
                          className="px-3 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                          title="Remove custom logo"
                        >
                          <Trash2 className="w-4 h-4" /> Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Custom Software Icon Card */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-400" /> Software App Icon
                        </label>
                        {form.softwareIconUrl ? (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            Custom Icon Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                            Default Crown
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mb-4">
                        Used as the OS Desktop Taskbar icon, Window Icon, browser favicon, and app title badge.
                      </p>

                      {/* Software Icon Preview */}
                      <div className="w-full h-36 bg-black/40 border border-dashed border-white/15 rounded-xl flex flex-col items-center justify-center p-3 relative overflow-hidden group">
                        {form.softwareIconUrl ? (
                          <div className="flex flex-col items-center gap-2">
                            <img src={form.softwareIconUrl} alt="Software Icon Preview" className="w-16 h-16 object-contain rounded-xl shadow-lg border border-amber-500/30" />
                            <span className="text-[11px] text-amber-300 font-mono">App Icon Active</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-center text-white/30">
                            <Crown className="w-10 h-10 mb-2 stroke-1 text-amber-400/40" />
                            <span className="text-xs font-medium">Default Crown Icon Active</span>
                            <span className="text-[10px] text-white/20 mt-0.5">Recommended 128x128 PNG or ICO</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2">
                      <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 rounded-xl text-xs font-bold cursor-pointer transition-all">
                        <Upload className="w-4 h-4" />
                        {form.softwareIconUrl ? 'Change Icon' : 'Upload Software Icon'}
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/x-icon, image/webp, image/svg+xml"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImage(file, 256, 'image/png');
                                update('softwareIconUrl', compressed);
                               } catch (err) {
                                 showToast('Error reading software icon file', 'error');
                               }
                            }
                          }}
                        />
                      </label>
                      {form.softwareIconUrl && (
                        <button
                          type="button"
                          onClick={() => update('softwareIconUrl', '')}
                          className="px-[12px] py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                          title="Remove custom app icon"
                        >
                          <Trash2 className="w-4 h-4" /> Remove
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </SectionCard>
            )}

            {/* 3. TAX & COMPLIANCE CONTENT */}
            {activeSectionId === 'tax' && (
              <SectionCard title="Compliance & Tax" icon={<Receipt className="w-5 h-5" />} subtitle="GST, FSSAI license, and tax rate configuration">
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow id="s-gst" label="GSTIN / GST Number" value={form.gstNumber || ''} onChange={(v) => update('gstNumber', v)} placeholder="33ABCDE1234F1Z5" half />
                  <FieldRow id="s-fssai" label="FSSAI License Number" value={form.fssaiNumber || ''} onChange={(v) => update('fssaiNumber', v)} placeholder="12421008000123" half />
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor="s-tax" className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5">Default Tax / GST Rate (%)</label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/60 pointer-events-none" />
                      <input
                        id="s-tax"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.taxRateStr}
                        onChange={(e) => update('taxRateStr', e.target.value)}
                        placeholder="5"
                        className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-white/30 mt-1.5">Applied on all bills. Shown as GST on receipts.</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor="s-tables" className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5">Total Restaurant Tables</label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/60 pointer-events-none" />
                      <input
                        id="s-tables"
                        type="number"
                        min="1"
                        max="100"
                        value={form.totalTablesStr}
                        onChange={(e) => update('totalTablesStr', e.target.value)}
                        placeholder="10"
                        className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-white/30 mt-1.5">Generates table selection buttons (Table 1 to Table N) in Tokens section.</p>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* 4. CONTACT DETAILS CONTENT */}
            {activeSectionId === 'contact' && (
              <SectionCard title="Contact Details" icon={<Phone className="w-5 h-5" />} subtitle="Restaurant phone, email, and physical address">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="s-phone" className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/60 pointer-events-none" />
                      <input id="s-phone" type="tel" value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} placeholder="+91 98765 43210" className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="s-email" className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/60 pointer-events-none" />
                      <input id="s-email" type="email" value={form.email || ''} onChange={(e) => update('email', e.target.value)} placeholder="contact@restaurant.com" className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all" />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="s-address" className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5">Full Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-amber-500/60 pointer-events-none" />
                      <textarea id="s-address" value={form.address || ''} onChange={(e) => update('address', e.target.value)} placeholder="Street, Area, City, State, PIN Code" rows={2} className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all resize-none" />
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* 5. RECEIPT & PRINT OPTIONS CONTENT */}
            {activeSectionId === 'receipts' && (
              <div className="space-y-6">
                <SectionCard title="Receipt Notes" icon={<FileText className="w-5 h-5" />} subtitle="Custom text printed on top and bottom of receipts">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label htmlFor="s-header" className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5">Receipt Header Note</label>
                      <textarea id="s-header" value={form.headerNote || ''} onChange={(e) => update('headerNote', e.target.value)} placeholder="e.g. Welcome to Kish Mandhi - Arabian Hospitality" rows={2} className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all resize-none" />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="s-footer" className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5">Receipt Footer Note</label>
                      <textarea id="s-footer" value={form.footerNote || ''} onChange={(e) => update('footerNote', e.target.value)} placeholder="e.g. Thank you for dining with us!" rows={2} className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all resize-none" />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Bill Print Customization" icon={<Printer className="w-5 h-5" />} subtitle="Select which fields to include or hide on printed thermal bills">
                  <div className="space-y-4">
                    <div
                      onClick={() => {
                        const nextVal = !(form.printWithToken ?? true);
                        setForm(prev => ({
                          ...prev,
                          printWithToken: nextVal,
                          printOption: nextVal ? 'both' : 'bill'
                        }));
                        setIsDirty(true);
                      }}
                      className="flex items-center justify-between p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl cursor-pointer hover:bg-amber-500/15 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3">
                        <Printer className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span className="text-xs font-bold text-amber-300">Print Token with Bill</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(form.printWithToken ?? true)}
                        onChange={() => {}}
                        className="w-4 h-4 accent-amber-500 rounded pointer-events-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { id: 'printShowLogo', label: 'Show Restaurant Logo Header', value: form.printShowLogo ?? true },
                      { id: 'printShowAddress', label: 'Show Restaurant Address', value: form.printShowAddress ?? true },
                      { id: 'printShowPhone', label: 'Show Phone Number', value: form.printShowPhone ?? true },
                      { id: 'printShowGst', label: 'Show GSTIN / Tax Number', value: form.printShowGst ?? true },
                      { id: 'printShowHeaderNote', label: 'Show Receipt Header Note', value: form.printShowHeaderNote ?? true },
                      { id: 'printShowTime', label: 'Show Print Time', value: form.printShowTime ?? true },
                      { id: 'printShowTaxBreakdown', label: 'Show Tax Breakdown (CGST / SGST)', value: form.printShowTaxBreakdown ?? true },
                      { id: 'printShowRoundOff', label: 'Show Round Off Amount', value: form.printShowRoundOff ?? true },
                      { id: 'printShowFooterNote', label: 'Show Footer Note & Terms', value: form.printShowFooterNote ?? true }
                    ].map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors select-none"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(item.value)}
                          onChange={(e) => update(item.id as any, e.target.checked)}
                          className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-white">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </SectionCard>

              {/* DUAL PRINTER & KITCHEN KOT ROUTING CONTROLS */}
              <SectionCard title="Dual Printer & Kitchen KOT Routing Controls" icon={<Printer className="w-5 h-5 text-amber-400" />} subtitle="Configure separate printers for Counter Bills and Kitchen LAN Tokens">
                <div className="space-y-5">
                  <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl">
                    <div className="flex items-center gap-2.5 text-xs text-amber-300 font-semibold">
                      <Printer className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Configure 2 Independent Printers (USB Counter POS + LAN Kitchen Printer)</span>
                    </div>
                    <button
                      type="button"
                      onClick={fetchPrinters}
                      disabled={loadingPrinters}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingPrinters ? 'animate-spin' : ''}`} />
                      <span>{loadingPrinters ? 'Scanning Printers...' : 'Detect Printers'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* PRINTER 1 CARD */}
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Printer 1 (Counter POS / Main)</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">PRIMARY</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-white/70 uppercase mb-1">Select System Printer Device</label>
                        {systemPrinters.length > 0 ? (
                          <select
                            value={form.printer1Name || ''}
                            onChange={(e) => update('printer1Name' as any, e.target.value)}
                            className="w-full bg-black/40 border border-white/15 text-white rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-amber-500/50 outline-none"
                          >
                            <option value="">-- Default System Printer --</option>
                            {systemPrinters.map((p, i) => (
                              <option key={i} value={p.name}>
                                {p.name} {p.isDefault ? '(Windows Default)' : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={form.printer1Name || ''}
                            onChange={(e) => update('printer1Name' as any, e.target.value)}
                            placeholder="e.g. POS-80-Counter or Thermal-POS"
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-white/70 uppercase mb-1">Printer 1 Target Role</label>
                        <select
                          value={form.printer1Target || 'both'}
                          onChange={(e) => update('printer1Target' as any, e.target.value)}
                          className="w-full bg-black/40 border border-white/15 text-amber-300 font-bold rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-amber-500/50 outline-none"
                        >
                          <option value="both">🖨️ Print Both (Bill & Kitchen Token)</option>
                          <option value="bill">📄 Bill Only (Counter Receipts)</option>
                          <option value="token">🏷️ Kitchen Token Only (KOT)</option>
                          <option value="none">🚫 Disabled (No Print Output)</option>
                        </select>
                      </div>
                    </div>

                    {/* PRINTER 2 CARD */}
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Printer 2 (Kitchen LAN / Secondary)</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">LAN KITCHEN</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-white/70 uppercase mb-1">Select LAN / Kitchen Printer Device</label>
                        {systemPrinters.length > 0 ? (
                          <select
                            value={form.printer2Name || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setForm((prev) => ({
                                ...prev,
                                printer2Name: val,
                                printer2Target: val && (!prev.printer2Target || prev.printer2Target === 'none') ? 'token' : (prev.printer2Target || 'token')
                              }));
                              setIsDirty(true);
                            }}
                            className="w-full bg-black/40 border border-white/15 text-white rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500/50 outline-none"
                          >
                            <option value="">-- Select Kitchen LAN Printer --</option>
                            {systemPrinters.map((p, i) => (
                              <option key={i} value={p.name}>
                                {p.name} {p.isDefault ? '(Default)' : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={form.printer2Name || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setForm((prev) => ({
                                ...prev,
                                printer2Name: val,
                                printer2Target: val && (!prev.printer2Target || prev.printer2Target === 'none') ? 'token' : (prev.printer2Target || 'token')
                              }));
                              setIsDirty(true);
                            }}
                            placeholder="e.g. Kitchen-LAN-Printer or 192.168.1.100"
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-white/70 uppercase mb-1">Printer 2 Target Role</label>
                        <select
                          value={form.printer2Target || 'none'}
                          onChange={(e) => update('printer2Target' as any, e.target.value)}
                          className="w-full bg-black/40 border border-white/15 text-emerald-300 font-bold rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        >
                          <option value="token">🏷️ Kitchen Token Only (KOT)</option>
                          <option value="bill">📄 Bill Only (Counter Receipts)</option>
                          <option value="both">🖨️ Print Both (Bill & Kitchen Token)</option>
                          <option value="none">🚫 Disabled (No Print Output)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>
              </div>
            )}

            {/* 6. ACCOUNT & SESSION CONTENT */}
            {activeSectionId === 'account' && (
              <SectionCard title="Account Information" icon={<Shield className="w-5 h-5" />} subtitle="Logged-in user and session management">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-amber-500/20">
                      {user?.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{user?.name || 'Admin'}</p>
                      <p className="text-sm text-white/40">{user?.email || '-'}</p>
                      {user?.phone && <p className="text-xs text-white/30">{user.phone}</p>}
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold bg-amber-400/10 border border-amber-400/20 text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <User className="w-3 h-3" /> {user?.role || 'Admin'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm rounded-xl hover:bg-red-500/20 hover:border-red-500/40 transition-all"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </SectionCard>
            )}

            {/* 7. BUSINESS REPORTS CONTENT */}
            {activeSectionId === 'reports' && (
              <SectionCard title="Business Reports & Analytics" icon={<BarChart2 className="w-5 h-5 text-amber-400" />} subtitle="Select custom date range and download full business report as PDF">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl">
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" /> Start Date / From
                      </label>
                      <DatePicker
                        value={repStartDate}
                        onChange={(val) => setRepStartDate(val)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" /> End Date / To
                      </label>
                      <DatePicker
                        value={repEndDate}
                        onChange={(val) => setRepEndDate(val)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadPDF}
                    disabled={repIsGenerating}
                    className="px-5 py-3 bg-gold-500 hover:bg-gold-400 text-olive-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-gold-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {repIsGenerating ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Generating Report PDF...</>
                    ) : (
                      <><Download className="w-4 h-4" /> Download Business Summary Report (PDF)</>
                    )}
                  </button>
                </div>
              </SectionCard>
            )}

          </div>

        </div>
      )}

      {/* Sticky Save Button when editing in detail view */}
      {isDirty && activeSectionId !== null && (
        <div className="sticky bottom-0 pb-2 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl text-sm shadow-xl shadow-amber-500/30 hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-60"
          >
            {saveStatus === 'saving' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saveStatus === 'saving' ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to sign out of your account? Any unsaved settings changes will be lost."
        confirmLabel="Logout"
        cancelLabel="Stay Logged In"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[250] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl transition-all duration-300 font-bold text-xs ${
          toast.type === 'success'
            ? 'bg-emerald-500 text-olive-950 border-emerald-400'
            : 'bg-rose-500 text-white border-rose-400'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
