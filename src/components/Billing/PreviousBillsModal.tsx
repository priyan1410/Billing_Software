import React, { useState, useEffect } from 'react';
import {
  Search, Receipt, Printer, X, Calendar, History, ShoppingCart,
  FileText, Banknote, QrCode, CreditCard, Utensils, ShoppingBag, Check
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { usePosStore } from '../../store/usePosStore';

interface PreviousBillsModalProps {
  onClose: () => void;
}

export const PreviousBillsModal: React.FC<PreviousBillsModalProps> = ({ onClose }) => {
  const { restaurantDetails } = useAuthStore();
  const { addToCart } = usePosStore();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Custom Print Settings State
  const [headerTag, setHeaderTag] = useState<string>('*** REPRINT TAX INVOICE ***');
  const [customNote, setCustomNote] = useState<string>('DUPLICATE COPY');
  const [useCurrentTime, setUseCurrentTime] = useState<boolean>(false);
  const [customDiscount, setCustomDiscount] = useState<number | null>(null);

  // Receipt visibility options pre-filled from restaurant settings
  const [showLogo, setShowLogo] = useState(restaurantDetails?.printShowLogo ?? true);
  const [showAddress, setShowAddress] = useState(restaurantDetails?.printShowAddress ?? true);
  const [showPhone, setShowPhone] = useState(restaurantDetails?.printShowPhone ?? true);
  const [showGst, setShowGst] = useState(restaurantDetails?.printShowGst ?? true);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(restaurantDetails?.printShowTaxBreakdown ?? true);
  const [showFooterNote, setShowFooterNote] = useState(restaurantDetails?.printShowFooterNote ?? true);

  const curr = restaurantDetails?.currency || '₹';
  const taxRate = restaurantDetails?.taxRate ?? 5;

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      if ((window as any).electronAPI?.getOrders) {
        const res = await (window as any).electronAPI.getOrders();
        if (res.success && Array.isArray(res.data)) {
          setOrders(res.data);
          if (res.data.length > 0) {
            handleSelectOrder(res.data[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load previous orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = async (order: any) => {
    setSelectedOrder(order);
    setCustomDiscount(null);
    setLoadingItems(true);
    try {
      if ((window as any).electronAPI?.getOrderItems) {
        const res = await (window as any).electronAPI.getOrderItems(order.id || order.orderNumber);
        if (res.success && Array.isArray(res.data)) {
          setOrderItems(res.data);
        } else {
          setOrderItems([]);
        }
      }
    } catch (err) {
      console.error('Error fetching order items:', err);
      setOrderItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q ||
      String(o.orderNumber || '').toLowerCase().includes(q) ||
      String(o.paymentMode || '').toLowerCase().includes(q) ||
      String(o.orderType || '').toLowerCase().includes(q) ||
      String(o.createdAt || '').toLowerCase().includes(q);

    const matchesPayment = selectedPaymentMode === 'all' || String(o.paymentMode).toLowerCase() === selectedPaymentMode.toLowerCase();

    return matchesQuery && matchesPayment;
  });

  // Calculate totals for selected order
  const effectiveDiscount = customDiscount !== null ? customDiscount : Number(selectedOrder?.discountAmount || 0);
  const rawSubtotal = Number(selectedOrder?.subtotal || 0);
  const taxableAmt = Math.max(0, rawSubtotal - effectiveDiscount);
  const taxAmt = taxableAmt * (taxRate / 100);
  const calculatedGrandTotal = taxableAmt + taxAmt;

  // Print custom receipt helper
  const handlePrintCustomBill = async (isKot = false) => {
    if (!selectedOrder) return;
    setIsPrinting(true);

    try {
      const now = new Date();
      let printDateStr = '';
      let printTimeStr = '';

      if (useCurrentTime || !selectedOrder.createdAt) {
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        printDateStr = `${day}/${month}/${year}`;

        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        printTimeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
      } else {
        const d = new Date(selectedOrder.createdAt);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        printDateStr = `${day}/${month}/${year}`;

        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        printTimeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
      }

      const rName = String(restaurantDetails?.companyName || 'KISH MANDHI');
      const rAddr = String(restaurantDetails?.address || '');
      const rawPhone = String(restaurantDetails?.phone || '');
      const rPhone = rawPhone ? (rawPhone.startsWith('Phone:') ? rawPhone : `Phone: ${rawPhone}`) : '';
      const rawGst = String(restaurantDetails?.gstNumber || '');
      const rGst = rawGst ? (rawGst.startsWith('GSTIN:') ? rawGst : `GSTIN: ${rawGst}`) : '';
      const cgstRate = (taxRate / 2).toFixed(1);
      const sgstRate = (taxRate / 2).toFixed(1);

      const receiptStyles = `
        <style>
          @page { size: 80mm auto; margin: 2mm; }
          body { margin: 0; padding: 4px; font-family: 'Courier New', Courier, monospace, Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
          .receipt { width: 74mm; margin: 0 auto; padding: 4px; box-sizing: border-box; text-align: left; }
          .center { text-align: center; }
          .bold { font-weight: 800; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 3px double #000; border-bottom: 3px double #000; padding: 5px 0; margin: 6px 0; }
          .table-header { border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 4px 0; margin: 4px 0; font-weight: bold; }
          .row { display: flex; justify-content: space-between; align-items: baseline; width: 100%; margin: 2px 0; }
          .col-item { flex: 2; text-align: left; word-break: break-word; font-weight: 500; }
          .col-qty { width: 35px; text-align: center; }
          .col-rate { width: 55px; text-align: right; }
          .col-amt { width: 65px; text-align: right; }
        </style>
      `;

      const billNumber = selectedOrder.orderNumber || `KMIV-001`;

      const html = isKot
        ? `<!doctype html><html><head>${receiptStyles}</head><body><div class="receipt">
            <div class="center bold"><div style="font-size:14px;">${rName}</div><div style="font-size:11px; letter-spacing:1px; margin-top:2px;">KITCHEN ORDER TICKET (REPRINT)</div></div>
            <div class="divider"></div>
            <div style="font-size:11px;"><div>Bill No: <strong>${billNumber}</strong></div><div>Type: ${selectedOrder.orderType}</div><div>Date: ${printDateStr} ${printTimeStr}</div></div>
            <div class="divider"></div>
            <div class="row table-header"><span class="col-item">ITEM DESCRIPTION</span><span class="col-qty">QTY</span></div>
            ${orderItems.map((i: any) => {
          const label = `${i.name || i.dishName}${i.variant ? ` (${i.variant})` : ''}`;
          return `<div class="row"><span class="col-item">${label}</span><span class="col-qty">${i.quantity}</span></div>`;
        }).join('')}
            <div class="divider"></div>
          </div></body></html>`
        : `<!doctype html><html><head>${receiptStyles}</head><body><div class="receipt">
            ${showLogo ? `<div class="center" style="margin-bottom: 4px;">
              <svg viewBox="0 0 240 70" width="160" height="46">
                <path d="M 15 42 C 30 27, 50 47, 70 37 Q 48 32, 25 44" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>
                <circle cx="15" cy="42" r="2.5" fill="#000"/>
                <path d="M 35 36 C 43 26, 55 30, 63 37" fill="none" stroke="#000" stroke-width="1.2"/>
                <path d="M 225 42 C 210 27, 190 47, 170 37 Q 192 32, 215 44" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>
                <circle cx="225" cy="42" r="2.5" fill="#000"/>
                <path d="M 205 36 C 197 26, 185 30, 177 37" fill="none" stroke="#000" stroke-width="1.2"/>
                <path d="M 106 8 L 111 17 L 120 6 L 129 17 L 134 8 L 132 21 L 108 21 Z" fill="#000"/>
                <circle cx="106" cy="6" r="2" fill="#000"/>
                <circle cx="120" cy="4" r="2" fill="#000"/>
                <circle cx="134" cy="6" r="2" fill="#000"/>
                <ellipse cx="103" cy="27" rx="4.5" ry="7" transform="rotate(-40 103 27)" fill="#000"/>
                <path d="M 106 30 L 132 56" stroke="#000" stroke-width="3" stroke-linecap="round"/>
                <path d="M 133 22 Q 132 29 127 32 L 108 56" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>
                <path d="M 132 20 L 138 27 M 135 18 L 141 25 M 138 16 L 144 23" stroke="#000" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>` : ''}

            <div class="center bold" style="font-size: 16px; text-transform: uppercase;">${rName}</div>
            ${showAddress && rAddr ? `<div class="center" style="font-size: 10.5px;">${rAddr}</div>` : ''}
            ${showPhone && rPhone ? `<div class="center" style="font-size: 10.5px;">${rPhone}</div>` : ''}
            ${showGst && rGst ? `<div class="center" style="font-size: 10.5px;">${rGst}</div>` : ''}

            <div class="divider"></div>
            <div class="center bold" style="font-size: 11px; letter-spacing: 1px;">${headerTag || '*** REPRINT TAX INVOICE ***'}</div>
            ${customNote ? `<div class="center" style="font-size: 10px; font-weight: bold; margin-top: 2px;">[ ${customNote} ]</div>` : ''}

            <div style="font-size: 10.5px; margin: 4px 0;">
              <div style="display: flex; justify-content: space-between;">
                <span>Bill No &nbsp;: ${billNumber}</span>
                <span>Date &nbsp;: ${printDateStr}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Time &nbsp;&nbsp;&nbsp;: ${printTimeStr}</span>
                <span>Pay Mode: ${selectedOrder.paymentMode || 'Cash'}</span>
              </div>
            </div>

            <div class="divider"></div>

            <div class="row table-header" style="font-size: 10.5px;">
              <span class="col-item">Item</span>
              <span class="col-qty">Qty</span>
              <span class="col-rate">Rate (${curr})</span>
              <span class="col-amt">Amount (${curr})</span>
            </div>

            ${(orderItems || []).map((i: any) => {
          const label = `${i.name || i.dishName}${i.variant ? ` (${i.variant})` : ''}`;
          const uNum = Number(i.unitPrice || i.price || 0);
          const tNum = Number(i.totalPrice || (uNum * (i.quantity || 1)));
          const uPrice = uNum.toFixed(2);
          const tPrice = tNum.toFixed(2);
          return `<div class="row" style="font-size: 10.5px;"><span class="col-item">${label}</span><span class="col-qty">${i.quantity || 1}</span><span class="col-rate">${uPrice}</span><span class="col-amt">${tPrice}</span></div>`;
        }).join('')}

            <div class="divider"></div>

            <div style="font-size: 10.5px;">
              <div class="row"><span>Subtotal</span><span>${rawSubtotal.toFixed(2)}</span></div>
              ${effectiveDiscount > 0 ? `<div class="row"><span>Discount</span><span>-${effectiveDiscount.toFixed(2)}</span></div>` : ''}
              <div style="display: flex; justify-content: flex-end; margin: 3px 0;"><div style="border-top: 1px dashed #000; width: 80px;"></div></div>
              <div class="row"><span>Taxable Amount</span><span>${taxableAmt.toFixed(2)}</span></div>
              ${showTaxBreakdown ? `
              <div class="row"><span>CGST (${cgstRate}%)</span><span>${(taxAmt / 2).toFixed(2)}</span></div>
              <div class="row"><span>SGST (${sgstRate}%)</span><span>${(taxAmt / 2).toFixed(2)}</span></div>
              ` : ''}
            </div>

            <div class="divider"></div>

            <div class="row double-divider bold" style="font-size: 15px;">
              <span>GRAND TOTAL</span>
              <span>${curr} ${calculatedGrandTotal.toFixed(2)}</span>
            </div>

            <div class="divider"></div>

            ${showFooterNote ? `<div class="center" style="margin-top: 8px;">
              <div style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-weight: bold; font-size: 14px;">
                Thank You!<br/>Visit Again.
              </div>
              <div style="font-size: 9.5px; margin-top: 4px;">
                ${restaurantDetails?.footerNote || 'Goods once sold cannot be returned.'}
              </div>
            </div>` : ''}
          </div></body></html>`;

      if ((window as any).electronAPI?.printReceipt) {
        await (window as any).electronAPI.printReceipt(html);
      } else {
        const w = window.open('', '_blank', 'width=400,height=700');
        if (w) { w.document.write(`<html><body>${html}</body></html>`); w.print(); }
      }
    } catch (err: any) {
      alert('Error printing bill: ' + err.message);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleLoadItemsToCart = () => {
    if (!orderItems || orderItems.length === 0) return;
    orderItems.forEach((item) => {
      const mockDish = {
        id: item.id || Math.floor(Math.random() * 10000),
        categoryId: 1,
        name: item.name || item.dishName,
        priceQuarter: item.unitPrice,
        priceHalf: item.unitPrice,
        priceFull: item.unitPrice,
        isAvailable: true
      };
      addToCart(mockDish, item.variant || 'Full');
    });
    alert(`Added ${orderItems.length} items from Bill #${selectedOrder?.orderNumber} into active POS cart!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-slate-900 border border-gold-500/30 rounded-3xl w-full max-w-6xl h-[90vh] shadow-2xl shadow-black flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
              <History className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg tracking-wide">Previous Bills History & Custom Printing</h3>
              <p className="text-xs text-slate-400">Search past customer bills, customize print notes, and reprint thermal receipts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 3-column Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden divide-x divide-slate-800 min-h-0">

          {/* ══ COLUMN 1: BILLS SEARCH & LIST (4 cols) ══════════════════════ */}
          <div className="lg:col-span-4 flex flex-col h-full bg-slate-950/50 p-4 space-y-3 min-h-0 overflow-hidden">
            {/* Search Input */}
            <div className="relative flex-shrink-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Bill #, Cash/UPI, Date..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-400 text-xs focus:outline-none focus:border-gold-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex gap-1.5 flex-shrink-0">
              {['all', 'Cash', 'UPI', 'Card'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectedPaymentMode(mode)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${selectedPaymentMode === mode
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                >
                  {mode === 'all' ? 'All Modes' : mode}
                </button>
              ))}
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0" style={{ scrollbarWidth: 'thin' }}>
              {loading ? (
                <div className="text-center py-12 text-slate-500 text-xs">Loading previous bills...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">No matching bills found.</div>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '';
                  const timeStr = order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  return (
                    <div
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${isSelected
                        ? 'bg-gold-500/10 border-gold-500 text-white shadow-md'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                        }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-extrabold text-gold-400 text-sm">{order.orderNumber}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300">
                          {order.orderType}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">{dateStr} {timeStr}</span>
                        <span className="font-bold text-emerald-400">{curr}{Number(order.grandTotal).toFixed(2)}</span>
                      </div>
                      <div className="mt-1.5 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-800/80 pt-1">
                        <span>Mode: <strong className="text-slate-200">{order.paymentMode}</strong></span>
                        <span className="text-gold-500/80">Click to Custom Print →</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ══ COLUMN 2: BILL CUSTOMIZER OPTIONS (4 cols) ════════════════════ */}
          <div className="lg:col-span-4 flex flex-col h-full bg-slate-900/60 p-4 space-y-4 min-h-0 overflow-y-auto">
            {selectedOrder ? (
              <>
                <div className="border-b border-slate-800 pb-3 flex-shrink-0">
                  <span className="text-xs font-bold text-gold-400 uppercase tracking-wider block mb-1">Bill Selected</span>
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-xl font-extrabold text-white">{selectedOrder.orderNumber}</h4>
                    <span className="text-xs text-emerald-400 font-bold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      Paid via {selectedOrder.paymentMode}
                    </span>
                  </div>
                </div>

                {/* Items Summary list */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block">Ordered Items ({orderItems.length})</span>
                  {loadingItems ? (
                    <div className="text-slate-500 py-2 text-center text-xs">Fetching items...</div>
                  ) : orderItems.length === 0 ? (
                    <div className="text-slate-500 py-2 text-center text-xs">No items recorded.</div>
                  ) : (
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {orderItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-slate-300 text-[11px]">
                          <span>{item.quantity}x {item.name || item.dishName} ({item.variant})</span>
                          <span className="font-bold">{curr}{Number(item.totalPrice).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Print Controls */}
                <div className="space-y-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-xs font-bold text-gold-400 uppercase tracking-wider block">Custom Print Settings</span>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Receipt Header Tag</label>
                    <select
                      value={headerTag}
                      onChange={(e) => setHeaderTag(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white outline-none"
                    >
                      <option value="*** REPRINT TAX INVOICE ***">*** REPRINT TAX INVOICE ***</option>
                      <option value="*** DUPLICATE TAX INVOICE ***">*** DUPLICATE TAX INVOICE ***</option>
                      <option value="*** CUSTOMER COPY ***">*** CUSTOMER COPY ***</option>
                      <option value="*** TAX INVOICE ***">*** TAX INVOICE *** (Original)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Custom Print Remark / Note</label>
                    <input
                      type="text"
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      placeholder="e.g. Duplicate copy requested by customer"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-300">Use Current Date & Time on Receipt</span>
                    <input
                      type="checkbox"
                      checked={useCurrentTime}
                      onChange={(e) => setUseCurrentTime(e.target.checked)}
                      className="w-4 h-4 accent-gold-500 cursor-pointer"
                    />
                  </div>

                  {/* Print Elements Toggles */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Visible Sections</span>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} className="accent-gold-500" />
                        Logo SVG
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={showAddress} onChange={(e) => setShowAddress(e.target.checked)} className="accent-gold-500" />
                        Address
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} className="accent-gold-500" />
                        Phone No
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={showGst} onChange={(e) => setShowGst(e.target.checked)} className="accent-gold-500" />
                        GSTIN
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={showTaxBreakdown} onChange={(e) => setShowTaxBreakdown(e.target.checked)} className="accent-gold-500" />
                        CGST/SGST
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={showFooterNote} onChange={(e) => setShowFooterNote(e.target.checked)} className="accent-gold-500" />
                        Footer Note
                      </label>
                    </div>
                  </div>
                </div>

                {/* Print Action Buttons */}
                <div className="space-y-2 pt-2 flex-shrink-0">
                  <button
                    onClick={() => handlePrintCustomBill(false)}
                    disabled={isPrinting || orderItems.length === 0}
                    className="w-full py-3 bg-gradient-to-r from-gold-500 to-gold-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20 hover:scale-[1.01] transition-transform disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" /> {isPrinting ? 'Sending to Printer...' : 'Print Custom Thermal Bill'}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePrintCustomBill(true)}
                      disabled={isPrinting || orderItems.length === 0}
                      className="flex-1 py-2.5 bg-slate-800 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Receipt className="w-3.5 h-3.5 text-amber-400" /> Reprint KOT
                    </button>
                    <button
                      onClick={handleLoadItemsToCart}
                      disabled={orderItems.length === 0}
                      className="flex-1 py-2.5 bg-slate-800 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" /> Load to POS Cart
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-24 text-slate-500 text-xs">
                Select a bill from the left list to customize and print.
              </div>
            )}
          </div>

          {/* ══ COLUMN 3: LIVE THERMAL RECEIPT PREVIEW (4 cols) ═══════════════ */}
          <div className="lg:col-span-4 flex flex-col h-full bg-slate-950 p-4 space-y-3 min-h-0 overflow-y-auto flex-shrink-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-center">Live Custom Thermal Receipt Preview</span>

            {selectedOrder ? (
              <div className="flex justify-center flex-1 overflow-y-auto pb-4">
                <div className="w-full max-w-[340px] bg-white text-black font-mono shadow-2xl p-5 relative rounded-t-sm select-text border border-slate-300 text-left text-[11px] h-fit">
                  {/* Restaurant Logo */}
                  {showLogo && (
                    <div className="flex justify-center mb-1">
                      <svg viewBox="0 0 300 60" className="w-40 h-8 text-black">
                        <circle cx="75" cy="42" r="2.5" fill="#000" />
                        <path d="M 95 36 C 103 26, 115 30, 123 37" fill="none" stroke="#000" strokeWidth="1.2" />
                        <circle cx="225" cy="42" r="2.5" fill="#000" />
                        <path d="M 205 36 C 197 26, 185 30, 177 37" fill="none" stroke="#000" strokeWidth="1.2" />
                        <path d="M 106 8 L 111 17 L 120 6 L 129 17 L 134 8 L 132 21 L 108 21 Z" fill="#000" />
                        <circle cx="106" cy="6" r="2" fill="#000" />
                        <circle cx="120" cy="4" r="2" fill="#000" />
                        <circle cx="134" cy="6" r="2" fill="#000" />
                        <ellipse cx="103" cy="27" rx="4.5" ry="7" transform="rotate(-40 103 27)" fill="#000" />
                        <path d="M 106 30 L 132 56" stroke="#000" strokeWidth="3" strokeLinecap="round" />
                        <path d="M 133 22 Q 132 29 127 32 L 108 56" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" />
                        <path d="M 132 20 L 138 27 M 135 18 L 141 25 M 138 16 L 144 23" stroke="#000" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}

                  {/* Title & Info */}
                  <div className="text-center">
                    <h2 className="text-base font-extrabold tracking-tight uppercase leading-tight font-sans text-black">
                      {restaurantDetails?.companyName || 'KISH MANDHI'}
                    </h2>
                    {showAddress && restaurantDetails?.address && <p className="text-[10px] text-slate-800">{restaurantDetails.address}</p>}
                    {showPhone && restaurantDetails?.phone && <p className="text-[10px] text-slate-800">Phone: {restaurantDetails.phone}</p>}
                    {showGst && restaurantDetails?.gstNumber && <p className="text-[10px] text-slate-800">GSTIN: {restaurantDetails.gstNumber}</p>}
                  </div>

                  <div className="border-b border-dashed border-black my-2"></div>

                  <div className="text-center font-bold text-xs tracking-wider uppercase mb-1">
                    {headerTag}
                  </div>
                  {customNote && <div className="text-center text-[10px] font-bold">[ {customNote} ]</div>}

                  <div className="text-[10px] leading-tight my-2 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Bill No: {selectedOrder.orderNumber}</span>
                      <span>Mode: {selectedOrder.paymentMode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date: {useCurrentTime ? new Date().toLocaleDateString() : (selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString() : '')}</span>
                      <span>Time: {useCurrentTime ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}</span>
                    </div>
                  </div>

                  <div className="border-b border-dashed border-black my-2"></div>

                  {/* Items Table */}
                  <div className="border-y border-black py-1 my-1 grid grid-cols-[1.4fr_0.4fr_0.8fr_0.8fr] gap-1 text-[10px] font-bold">
                    <span>Item</span>
                    <span className="text-center">Qty</span>
                    <span className="text-right">Rate</span>
                    <span className="text-right">Amount</span>
                  </div>

                  <div className="space-y-1 my-1 text-[10px]">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-[1.4fr_0.4fr_0.8fr_0.8fr] gap-1 leading-tight">
                        <span className="font-semibold break-words">{item.name || item.dishName} ({item.variant})</span>
                        <span className="text-center">{item.quantity}</span>
                        <span className="text-right">{Number(item.unitPrice).toFixed(2)}</span>
                        <span className="text-right font-semibold">{Number(item.totalPrice).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-b border-dashed border-black my-2"></div>

                  {/* Math section */}
                  <div className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between"><span>Subtotal</span><span>{rawSubtotal.toFixed(2)}</span></div>
                    {effectiveDiscount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{effectiveDiscount.toFixed(2)}</span></div>}
                    <div className="flex justify-between"><span>Taxable Amount</span><span>{taxableAmt.toFixed(2)}</span></div>
                    {showTaxBreakdown && (
                      <>
                        <div className="flex justify-between"><span>CGST ({(taxRate / 2).toFixed(1)}%)</span><span>{(taxAmt / 2).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>SGST ({(taxRate / 2).toFixed(1)}%)</span><span>{(taxAmt / 2).toFixed(2)}</span></div>
                      </>
                    )}
                  </div>

                  <div className="border-y-2 border-double border-black py-1 my-2 flex justify-between items-center text-xs font-black">
                    <span>GRAND TOTAL</span>
                    <span>{curr} {calculatedGrandTotal.toFixed(2)}</span>
                  </div>

                  {showFooterNote && (
                    <div className="text-center mt-2 text-[10px] italic">
                      Thank You! Visit Again.<br />
                      <span className="not-italic text-[9px] text-slate-700">{restaurantDetails?.footerNote || 'Goods once sold cannot be returned.'}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-24 text-slate-600 text-xs">Preview will load here...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
