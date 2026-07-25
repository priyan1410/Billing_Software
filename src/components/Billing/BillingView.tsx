import React, { useState, useEffect } from 'react';
import {
  Search, ShoppingCart, Trash2, Printer, Utensils, ShoppingBag,
  CreditCard, QrCode, Banknote, X, CheckCircle2, AlertTriangle, Receipt, User, Phone,
  Edit3, History
} from 'lucide-react';
import { usePosStore } from '../../store/usePosStore';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Dish, OrderPayload, PortionVariant } from '../../types';
import { formatPosInvoiceHtml, formatPosTokenHtml, getPosInvoiceTextBody, getPosTokenTextBody, combinePosSlips } from '../../utils/posFormatter';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number, curr = '₹') =>
  `${curr}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtN = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CATS = [
  { id: 'all', label: 'All Items' },
  { id: '1', label: 'Mandhi Special' },
  { id: '2', label: 'Alfaham & Grill' },
  { id: '3', label: 'Starters & Sides' },
  { id: '4', label: 'Beverages' },
  { id: '5', label: 'Desserts' },
];

// ─── Confirm Order Modal ────────────────────────────────────────────────────
const ConfirmOrderModal: React.FC<{
  cart: any[];
  orderType: string;
  paymentMode: string;
  subtotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  taxRate: number;
  curr: string;
  billNumber: string;
  restaurantDetails?: any;
  onSaveOnly: () => void;
  onPrintAndSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
}> = ({ cart, orderType, paymentMode, subtotal, tax, discount, grandTotal, taxRate, curr, billNumber, restaurantDetails, onSaveOnly, onPrintAndSave, onCancel, isLoading }) => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const invoiceDate = `${day}/${month}/${year}`;

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const invoiceTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

  const storeName = String(restaurantDetails?.companyName || 'KISH MANDHI');
  const tagline = String(restaurantDetails?.tagline || '');
  const address = String(restaurantDetails?.address || '');
  const rawPhone = String(restaurantDetails?.phone || '');
  const phone = rawPhone ? (rawPhone.startsWith('Phone:') ? rawPhone : `Phone: ${rawPhone}`) : '';
  const rawGst = String(restaurantDetails?.gstNumber || restaurantDetails?.gstNo || '');
  const gstVal = rawGst.replace(/^GSTIN:\s*/i, '').trim();
  const rawFssai = String(restaurantDetails?.fssaiNumber || restaurantDetails?.fssaiNo || '');
  const fssaiVal = rawFssai.replace(/^FSSAI:\s*/i, '').trim();

  let taxGstFssaiLine = '';
  if (restaurantDetails?.printShowGst ?? true) {
    if (gstVal && fssaiVal) {
      taxGstFssaiLine = `GSTIN: ${gstVal}  |  FSSAI: ${fssaiVal}`;
    } else if (gstVal) {
      taxGstFssaiLine = `GSTIN: ${gstVal}`;
    } else if (fssaiVal) {
      taxGstFssaiLine = `FSSAI: ${fssaiVal}`;
    }
  }

  const printShowLogo = restaurantDetails?.printShowLogo ?? true;
  const logoUrl = restaurantDetails?.logoUrl || '';
  const printShowAddress = restaurantDetails?.printShowAddress ?? true;
  const printShowPhone = restaurantDetails?.printShowPhone ?? true;
  const printShowHeaderNote = restaurantDetails?.printShowHeaderNote ?? true;
  const printShowTime = restaurantDetails?.printShowTime ?? true;
  const printShowTaxBreakdown = restaurantDetails?.printShowTaxBreakdown ?? true;
  const printShowRoundOff = restaurantDetails?.printShowRoundOff ?? true;
  const printShowFooterNote = restaurantDetails?.printShowFooterNote ?? true;

  const taxableAmount = Math.max(0, subtotal - discount);
  const cgstRate = (taxRate / 2).toFixed(1);
  const sgstRate = (taxRate / 2).toFixed(1);
  const cgstAmt = tax / 2;
  const sgstAmt = tax / 2;
  const calculatedTotal = taxableAmount + tax;
  const roundedGrandTotal = Math.round(calculatedTotal);
  const roundOff = roundedGrandTotal - calculatedTotal;
  const finalTotal = grandTotal || roundedGrandTotal;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl shadow-black/80 max-h-[92vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-800 bg-slate-950 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h4 className="font-bold text-white text-base uppercase tracking-[0.15em]">Receipt Preview</h4>
            <p className="text-xs text-slate-400">Review thermal bill layout before printing</p>
          </div>
          <button onClick={onCancel} className="ml-auto text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/80 flex justify-center">
          <div className="w-full max-w-[370px] bg-white text-black font-mono shadow-2xl p-6 rounded-sm select-text border border-slate-300 text-left h-fit mb-4">

            {/* Restaurant Title & Tagline */}
            <div className="text-center">
              {printShowLogo && logoUrl && (
                <img src={logoUrl} alt="Logo" className="max-h-12 max-w-[140px] mx-auto mb-1.5 object-contain" />
              )}
              <h2 className="text-xl font-extrabold tracking-tight uppercase leading-tight font-sans text-black">
                {storeName}
              </h2>
              {tagline && <p className="text-[11px] text-slate-800 font-semibold tracking-wide mt-0.5">{tagline}</p>}
              {printShowAddress && address && <p className="text-[11px] text-slate-900 font-medium mt-0.5">{address}</p>}
              {printShowPhone && phone && <p className="text-[11px] text-slate-900 font-medium">{phone}</p>}
              {taxGstFssaiLine && <p className="text-[11px] text-slate-900 font-medium">{taxGstFssaiLine}</p>}
              {printShowHeaderNote && restaurantDetails?.headerNote && (
                <p className="text-[10px] text-slate-700 italic font-semibold mt-1">{restaurantDetails.headerNote}</p>
              )}
            </div>

            {/* Dashed Line */}
            <div className="border-b border-dashed border-black my-2.5"></div>

            {/* Tax Invoice Subheader */}
            <div className="text-center font-bold text-xs tracking-wider uppercase mb-2">
              *** TAX INVOICE ***
            </div>

            {/* Invoice Metadata */}
            <div className="text-[11px] leading-relaxed mb-2">
              <div className="flex justify-between">
                <span>Bill No &nbsp;: {billNumber}</span>
                <span>Date &nbsp;: {invoiceDate}</span>
              </div>
              {printShowTime && (
                <div className="flex justify-between">
                  <span>Time &nbsp;&nbsp;&nbsp;: {invoiceTime}</span>
                </div>
              )}
            </div>

            {/* Dashed Line */}
            <div className="border-b border-dashed border-black my-2"></div>

            {/* Items Table Header */}
            <div className="border-y-2 border-black py-1 my-1.5 grid grid-cols-[1.4fr_0.4fr_0.8fr_0.8fr] gap-1 text-[11px] font-bold">
              <span>Item</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Rate ({curr})</span>
              <span className="text-right">Amount ({curr})</span>
            </div>

            {/* Items List */}
            <div className="space-y-1.5 my-2 text-[11px]">
              {(cart || []).map((item, idx) => {
                const isCombo = item.comboItems && item.comboItems.length > 0;
                const label = `${item.name}${item.variant ? ` (${item.variant})` : ''}`;
                const unitP = Number(item.unitPrice || item.price || 0);
                const totalP = Number(item.totalPrice || (unitP * (item.quantity || 1)));
                return (
                  <div key={idx} className="flex flex-col gap-0.5">
                    <div className="grid grid-cols-[1.4fr_0.4fr_0.8fr_0.8fr] gap-1 text-[11px] leading-tight items-baseline">
                      <span className={`break-words ${isCombo ? 'font-extrabold text-black uppercase' : 'font-semibold text-black'}`}>{label}</span>
                      <span className="text-center">{item.quantity || 1}</span>
                      <span className="text-right">{unitP.toFixed(2)}</span>
                      <span className="text-right font-semibold">{totalP.toFixed(2)}</span>
                    </div>
                    {isCombo && (
                      <div className="pl-3 text-[10px] text-slate-700 font-medium leading-tight">
                        {item.comboItems.map((sub: string, sIdx: number) => (
                          <div key={sIdx}>• {sub}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Dashed Line */}
            <div className="border-b border-dashed border-black my-2"></div>

            {/* Subtotal & Calculations */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{Number(subtotal || 0).toFixed(2)}</span>
              </div>

              {Number(discount || 0) > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-{Number(discount || 0).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-end my-1">
                <div className="border-b border-dashed border-black w-24"></div>
              </div>

              <div className="flex justify-between">
                <span>Taxable Amount</span>
                <span>{Number(taxableAmount || 0).toFixed(2)}</span>
              </div>

              {printShowTaxBreakdown && (
                <>
                  <div className="flex justify-between">
                    <span>CGST ({cgstRate}%)</span>
                    <span>{Number(cgstAmt || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST ({sgstRate}%)</span>
                    <span>{Number(sgstAmt || 0).toFixed(2)}</span>
                  </div>
                </>
              )}

              {printShowRoundOff && (
                <div className="flex justify-between">
                  <span>Round Off</span>
                  <span>{Number(roundOff || 0).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Dashed Line */}
            <div className="border-b border-dashed border-black my-2"></div>

            {/* Grand Total Box with double line */}
            <div className="border-y-[3px] border-double border-black py-1.5 my-2 flex justify-between items-center text-sm font-black tracking-wide">
              <span>GRAND TOTAL</span>
              <span className="text-base">{curr} {Number(finalTotal || 0).toFixed(2)}</span>
            </div>

            {/* Dashed Line */}
            <div className="border-b border-dashed border-black my-2"></div>

            {/* Footer Text */}
            {printShowFooterNote && (
              <div className="text-center mt-3 pt-1">
                <div className="font-serif italic font-bold text-sm text-black leading-snug">
                  Thank You!<br />
                  Visit Again.
                </div>
                <div className="flex items-center justify-center gap-2 my-2">
                  <div className="h-[1px] bg-black w-10"></div>
                  <span className="text-[10px]">★</span>
                  <div className="h-[1px] bg-black w-10"></div>
                </div>
                <div className="text-[10px] text-slate-800 leading-tight">
                  {restaurantDetails?.footerNote || 'Goods once sold cannot be returned.'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Controls */}
        <div className="flex gap-2.5 p-4 border-t border-slate-800 bg-slate-950 flex-shrink-0">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onSaveOnly}
            disabled={isLoading}
            className="flex-1 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {isLoading ? 'Saving...' : 'Save Only'}
          </button>
          <button
            onClick={onPrintAndSave}
            disabled={isLoading}
            className="flex-[1.3] py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl text-xs font-extrabold shadow-lg shadow-amber-500/20 hover:scale-[1.01] transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            {isLoading ? 'Processing...' : 'Print & Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main BillingView ─────────────────────────────────────────────────────────
export const BillingView: React.FC = () => {
  const {
    cart, orderType, paymentMode, discount,
    editingBillNumber, editingOrderId,
    setOrderType, setPaymentMode, setDiscount,
    addToCart, updateQty, clearCart, loadTokenToCart,
    startEditingBill, cancelEditBill
  } = usePosStore();
  const { activeTokensList, removeActiveToken, loadActiveTokens } = useAppStore();
  const { restaurantDetails, updateRestaurantDetails } = useAuthStore();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; label: string }>>([
    { id: 'all', label: 'All Items' },
    { id: '1', label: 'Mandhi Special' },
    { id: '2', label: 'Alfaham & Grill' },
    { id: '3', label: 'Starters & Sides' },
    { id: '4', label: 'Beverages' },
    { id: '5', label: 'Desserts' }
  ]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTokenNum, setSelectedTokenNum] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [nextBillNumber, setNextBillNumber] = useState<string>('KMIV-001');

  // Recent Bills Dropdown State
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const curr = restaurantDetails?.currency || '₹';
  const taxRate = restaurantDetails?.taxRate ?? 5;

  const fetchNextBillNumber = async () => {
    if ((window as any).electronAPI?.getNextOrderNumber) {
      const res = await (window as any).electronAPI.getNextOrderNumber();
      if (res.success && res.nextOrderNumber) {
        setNextBillNumber(res.nextOrderNumber);
        return res.nextOrderNumber;
      }
    }
    return nextBillNumber;
  };

  useEffect(() => { loadCategories(); loadDishes(); loadActiveTokens(); }, [activeCategory]);
  useEffect(() => { fetchNextBillNumber(); loadActiveTokens(); loadRecentBills(); }, []);

  const loadCategories = async () => {
    try {
      if ((window as any).electronAPI?.getCategories) {
        const res = await (window as any).electronAPI.getCategories();
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const dynamicCats = res.data.map((c: any) => ({
            id: String(c.id),
            label: c.name
          }));

          // Ensure a Combo Offers category exists in the categories list
          const hasCombo = dynamicCats.some((c: any) => c.label.toLowerCase().includes('combo'));
          if (!hasCombo && (window as any).electronAPI?.saveCategory) {
            const createRes = await (window as any).electronAPI.saveCategory({ name: 'Combo Offers', icon: 'gift' });
            if (createRes && createRes.success && createRes.data) {
              dynamicCats.push({ id: String(createRes.data.id), label: createRes.data.name });
            }
          }

          setCategories([{ id: 'all', label: 'All Items' }, ...dynamicCats]);
        }
      }
    } catch (err) {
      console.error('loadCategories error in BillingView:', err);
    }
  };

  const loadDishes = async () => {
    if ((window as any).electronAPI) {
      const res = await (window as any).electronAPI.getMenuItems(activeCategory);
      if (res.success) setDishes(res.data);
    } else {
      setDishes([]);
    }
  };

  const loadRecentBills = async () => {
    setLoadingRecent(true);
    try {
      if ((window as any).electronAPI?.getOrders) {
        const res = await (window as any).electronAPI.getOrders();
        if (res && res.success && Array.isArray(res.data)) {
          setRecentBills(res.data.slice(0, 10));
        }
      }
    } catch (err) {
      console.error('loadRecentBills error:', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleSelectBillToEdit = async (order: any) => {
    setShowRecentDropdown(false);
    let orderToLoad = { ...order };
    if (!orderToLoad.items || !orderToLoad.items.length) {
      if ((window as any).electronAPI?.getOrderItems) {
        const res = await (window as any).electronAPI.getOrderItems(order.id || order.orderNumber);
        if (res && res.success && Array.isArray(res.data)) {
          orderToLoad.items = res.data.map((i: any) => ({
            itemId: i.dish_id || i.dishId || 0,
            name: i.dish_name || i.dishName || i.name,
            variant: i.variant || 'Full',
            unitPrice: Number(i.unit_price || i.unitPrice || 0),
            quantity: Number(i.quantity || 1),
            totalPrice: Number(i.total_price || i.totalPrice || 0)
          }));
        }
      }
    }
    startEditingBill(orderToLoad, dishes);
  };

  const comboCatIds = categories
    .filter((c) => c.label.toLowerCase().includes('combo'))
    .map((c) => String(c.id));

  const filteredDishes = dishes.filter((d) => {
    const isCombo = comboCatIds.includes(String(d.categoryId)) ||
                    (d.categoryName && d.categoryName.toLowerCase().includes('combo')) ||
                    d.name.toLowerCase().includes('combo');
    if (activeCategory === 'all') {
      if (isCombo) return false;
      return d.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    const matchesCat = String(d.categoryId) === String(activeCategory);
    return matchesCat && d.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmt = subtotal * (taxRate / 100);
  const exactTotal = Math.max(0, subtotal + taxAmt - discount);
  const grandTotal = Math.round(exactTotal);
  const roundOff = Number((grandTotal - exactTotal).toFixed(2));

  const handleImportToken = () => {
    if (!selectedTokenNum) return;
    const target = activeTokensList.find((t) => String(t.tokenNumber) === String(selectedTokenNum));
    if (target) loadTokenToCart(target, dishes);
  };

  const handleSelectToken = (value: string) => {
    setSelectedTokenNum(value);
    if (value) {
      const target = activeTokensList.find((t) => String(t.tokenNumber) === String(value));
      if (target) loadTokenToCart(target, dishes);
    }
  };

  const handleCheckoutClick = async () => {
    if (cart.length === 0) { alert('Cart is empty! Add items first.'); return; }
    if (!editingBillNumber) {
      await fetchNextBillNumber();
    }
    setShowConfirmModal(true);
  };

  const handleSaveOrder = async (shouldPrint = true) => {
    setIsCheckingOut(true);
    const isEditing = !!editingBillNumber;
    const currentBillNumber = isEditing ? editingBillNumber : await fetchNextBillNumber();
    const orderDate = new Date();
    const orderDateString = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;

    const payload = {
      id: editingOrderId || undefined,
      order_number: currentBillNumber,
      order_type: orderType,
      subtotal,
      tax_amount: taxAmt,
      discount_amount: discount,
      grand_total: grandTotal,
      payment_mode: paymentMode,
      token_number: selectedTokenNum || undefined,
      items: cart,
      order_date: orderDateString,
      due_date: '',
      shipping_charges: 0,
      round_off: roundOff,
      customer_name: 'Walk-in',
    };
    const base = {
      id: editingOrderId || undefined,
      orderNumber: currentBillNumber,
      items: [...cart],
      subtotal,
      tax: taxAmt,
      discount,
      grandTotal,
      roundOff,
      orderType,
      paymentMode,
      customerName: 'Walk-in',
      cashierName: (useAuthStore.getState().user?.name || 'Staff') as string,
      tableNumber: 'N/A',
    };

    let createdData: any = null;

    if ((window as any).electronAPI) {
      const apiCall = isEditing && (window as any).electronAPI.updateOrder 
        ? (window as any).electronAPI.updateOrder 
        : (window as any).electronAPI.createOrder;
      const res = await apiCall(payload);
      if (res.success) {
        createdData = { ...base, ...res.data };
      } else {
        alert(res.message || 'Order operation failed. Try again.');
        setIsCheckingOut(false);
        return;
      }
    } else {
      createdData = {
        ...base,
        orderDate: payload.order_date,
        dueDate: payload.due_date,
        shippingCharges: payload.shipping_charges,
        roundOff: payload.round_off,
      };
    }

    if (shouldPrint && createdData) {
      await triggerPrintDirect(createdData, false);
    }

    if (selectedTokenNum) {
      removeActiveToken(selectedTokenNum);
      setSelectedTokenNum('');
    }

    setShowConfirmModal(false);
    clearCart();
    setIsCheckingOut(false);
    fetchNextBillNumber();
    loadRecentBills();
  };

  const triggerPrintDirect = async (data: any, isKot = false) => {
    if (!data) return;
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

    const rd = restaurantDetails;
    const billNumber = data.orderNumber || `KMIV-001`;
    const tokenNumber = data.tokenNumber
      ? (String(data.tokenNumber).startsWith('KMKOT') ? String(data.tokenNumber) : `KMKOT${String(data.tokenNumber).padStart(3, '0')}`)
      : `KMKOT001`;

    if (isKot) {
      const tokenHtml = formatPosTokenHtml(
        {
          tokenNumber: tokenNumber,
          orderType: data.orderType || 'Dine-In',
          paymentMode: data.paymentMode || 'Cash',
          items: data.items || [],
          date: formattedDate,
          timestamp: formattedTime
        },
        rd
      );
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.printReceipt(tokenHtml);
      } else {
        const w = window.open('', '_blank', 'width=400,height=700');
        if (w) { w.document.write(tokenHtml); w.print(); }
      }
    } else {
      const invoiceHtml = formatPosInvoiceHtml(
        {
          ...data,
          orderNumber: billNumber,
          orderDate: formattedDate,
          createdAt: new Date().toISOString()
        },
        rd
      );

      // Print Action 1: Tax Invoice Bill
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.printReceipt(invoiceHtml);
      } else {
        const w = window.open('', '_blank', 'width=400,height=700');
        if (w) { w.document.write(invoiceHtml); w.print(); }
      }

      // Print Action 2: Token Slip (Separate Job & Separate Auto-Cut)
      if (rd?.printWithToken !== false) {
        const tokenHtml = formatPosTokenHtml(
          {
            tokenNumber: tokenNumber,
            orderType: data.orderType || 'Dine-In',
            paymentMode: data.paymentMode || 'Cash',
            items: data.items || [],
            date: formattedDate,
            timestamp: formattedTime
          },
          rd
        );
        await new Promise((resolve) => setTimeout(resolve, 350));
        if ((window as any).electronAPI) {
          await (window as any).electronAPI.printReceipt(tokenHtml);
        } else {
          const w = window.open('', '_blank', 'width=400,height=700');
          if (w) { w.document.write(tokenHtml); w.print(); }
        }
      }
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-110px)] select-none overflow-hidden">

      {/* ══ LEFT: FOOD CATALOG (scrollable) ═══════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 gap-3 overflow-hidden">
        {/* Search bar */}
        <div className="relative flex-shrink-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-olive-400" />
          <input
            type="text" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu items..."
            className="w-full pl-10 pr-4 py-2.5 bg-olive-900 border border-gold-500/20 rounded-xl text-white placeholder-olive-400 text-sm focus:outline-none focus:border-gold-500 transition-colors"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${activeCategory === cat.id
                ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md'
                : 'bg-olive-900 border border-gold-500/20 text-olive-300 hover:border-gold-500/50'
                }`}
            >{cat.label}</button>
          ))}
        </div>

        {/* Dish grid — independently scrollable */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#b5882220 transparent' }}>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
            {filteredDishes.map((dish) => {
              const prices = [
                { variant: 'Quarter' as const, price: dish.priceQuarter },
                { variant: 'Half' as const, price: dish.priceHalf },
                { variant: 'Full' as const, price: dish.priceFull },
              ].filter((p) => p.price > 0);

              const isComboDish = comboCatIds.includes(String(dish.categoryId)) ||
                                  (dish.categoryName && dish.categoryName.toLowerCase().includes('combo')) ||
                                  dish.name.toLowerCase().includes('combo');

              if (isComboDish) {
                const comboPrice = prices[0]?.price || dish.priceFull || dish.priceQuarter || 0;
                const comboVariant = prices[0]?.variant || 'Full';
                const subItemsList = (dish.comboItems && dish.comboItems.length > 0)
                  ? dish.comboItems
                  : (() => {
                      const match = dish.name.match(/\(([^)]+)\)/);
                      if (match && match[1]) {
                        return match[1].split('+').map((s: string) => s.trim()).filter(Boolean);
                      }
                      return [];
                    })();

                return (
                  <div key={dish.id} className="bg-gradient-to-br from-amber-950/40 via-olive-900 to-amber-950/30 border border-amber-500/40 rounded-xl p-3 hover:border-amber-400 transition-all hover:shadow-lg hover:shadow-amber-500/10 group flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          🎁 Combo Deal
                        </span>
                        <span className="text-[10px] text-amber-400 font-bold">{curr}{comboPrice}</span>
                      </div>
                      <h4 className="text-white text-xs font-bold leading-tight mb-1 group-hover:text-amber-300 transition-colors">{dish.name}</h4>
                      {subItemsList.length > 0 && (
                        <div className="mb-2.5 space-y-0.5 border-l-2 border-amber-500/40 pl-2 text-[10px] text-amber-200/90 font-medium">
                          {subItemsList.map((sub: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-1 leading-tight">
                              <span className="text-amber-400 font-bold">•</span>
                              <span>{sub}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => addToCart(dish, comboVariant)}
                      className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 mt-1"
                    >
                      <span>🎁 Add Combo</span>
                      <span className="bg-slate-950/20 px-1.5 py-0.5 rounded text-[10px]">{curr}{comboPrice}</span>
                    </button>
                  </div>
                );
              }

              return (
                <div key={dish.id} className="bg-olive-900 border border-gold-500/10 rounded-xl p-3 hover:border-gold-500/30 transition-all hover:shadow-lg hover:shadow-gold-500/5 group">
                  <h4 className="text-white text-[11px] font-semibold leading-tight mb-2 group-hover:text-gold-300 transition-colors">{dish.name}</h4>
                  <div className="flex flex-wrap gap-1">
                    {prices.map(({ variant, price }) => (
                      <button key={variant} onClick={() => addToCart(dish, variant)}
                        className="flex-1 min-w-0 py-1.5 rounded-lg bg-olive-950/60 border border-gold-500/20 hover:border-gold-500 hover:bg-gold-500/10 transition-all text-center"
                      >
                        <div className="text-[9px] text-olive-400">{variant}</div>
                        <div className="text-[11px] text-gold-400 font-bold">{curr}{price}</div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {filteredDishes.length === 0 && (
              <div className="col-span-3 text-center py-12 text-olive-400 text-xs">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />No items found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ RIGHT: CART + BILL (scrollable) ══════════════════════════ */}
      <div className="w-80 xl:w-96 flex flex-col gap-3 flex-shrink-0 overflow-hidden">

        {/* Token Import & Recent Bills Dropdown */}
        <div className="flex gap-2 flex-shrink-0 relative">
          <select value={selectedTokenNum} onChange={(e) => handleSelectToken(e.target.value)}
            className="flex-1 py-2 px-3 bg-olive-900 border border-gold-500/20 rounded-xl text-white text-xs outline-none min-w-0"
          >
            <option value="">Import from Token...</option>
            {activeTokensList.map((t) => <option key={t.tokenNumber} value={t.tokenNumber}>Token #{t.tokenNumber}</option>)}
          </select>
          <button onClick={handleImportToken} className="px-3 py-2 bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 font-bold text-xs rounded-xl hover:scale-105 transition-transform flex-shrink-0">
            Load
          </button>

          {/* Edit Recent Bills Dropdown Button */}
          <div 
            className="relative flex-shrink-0"
            onMouseEnter={() => { setShowRecentDropdown(true); loadRecentBills(); }}
            onMouseLeave={() => setShowRecentDropdown(false)}
          >
            <button 
              onClick={() => { setShowRecentDropdown(!showRecentDropdown); loadRecentBills(); }}
              className="px-3 py-2 bg-olive-900 border border-gold-500/30 text-gold-400 hover:text-gold-300 font-bold text-xs rounded-xl flex items-center gap-1 hover:border-gold-500 transition-colors whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Bill ▾</span>
            </button>

            {showRecentDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-slate-900 border border-gold-500/30 rounded-2xl shadow-2xl z-50 p-2 text-xs space-y-1">
                <div className="flex justify-between items-center px-2 py-1.5 border-b border-slate-800 text-gold-400 font-bold text-[11px] uppercase tracking-wider">
                  <span>Recent 10 Bills</span>
                  <History className="w-3.5 h-3.5 text-gold-400" />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5" style={{ scrollbarWidth: 'thin' }}>
                  {loadingRecent ? (
                    <div className="text-center py-4 text-slate-400">Loading bills...</div>
                  ) : recentBills.length === 0 ? (
                    <div className="text-center py-4 text-slate-400">No recent bills found</div>
                  ) : (
                    recentBills.map((b) => (
                      <button
                        key={b.id || b.orderNumber}
                        onClick={() => handleSelectBillToEdit(b)}
                        className="w-full text-left p-2 rounded-xl bg-slate-800/80 hover:bg-gold-500/20 border border-slate-700/60 hover:border-gold-500/40 transition-all flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-bold text-white group-hover:text-gold-300 flex items-center gap-1.5">
                            <span>{b.orderNumber}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-olive-300 font-normal">
                              {b.orderType || 'Dine-In'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {b.createdAt ? new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gold-400 text-xs">
                            {curr}{Number(b.grandTotal || b.grand_total || 0).toFixed(2)}
                          </div>
                          <span className="text-[10px] text-emerald-400 font-semibold group-hover:underline">Edit ✎</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Editing Banner */}
        {editingBillNumber && (
          <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-2.5 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Edit3 className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>Editing Bill: <span className="text-white underline">{editingBillNumber}</span></span>
            </div>
            <button
              onClick={cancelEditBill}
              className="text-amber-400 hover:text-white p-1 rounded-lg hover:bg-amber-500/20 transition-colors"
              title="Cancel editing"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Order Type */}
        <div className="flex bg-olive-950 p-1 rounded-xl gap-1 flex-shrink-0">
          {[{ id: 'Dine-In', icon: <Utensils className="w-3.5 h-3.5" /> }, { id: 'Takeaway', icon: <ShoppingBag className="w-3.5 h-3.5" /> }].map((t) => (
            <button key={t.id} onClick={() => setOrderType(t.id as any)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${orderType === t.id ? 'bg-olive-800 text-gold-400 border border-gold-500/30' : 'text-olive-400'
                }`}
            >{t.icon} {t.id}</button>
          ))}
        </div>

        {/* Cart — independently scrollable */}
        <div className="flex-1 overflow-y-auto border-y border-gold-500/10 py-2 space-y-2 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#b5882220 transparent' }}>
          {cart.length === 0 ? (
            <div className="text-center py-10 text-olive-400 text-xs">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-20" />
              Cart is empty.<br />Tap menu items to add.
            </div>
          ) : cart.map((item) => (
            <div key={item.cartKey} className="flex flex-col bg-olive-800/60 px-3 py-2 rounded-xl text-xs gap-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className={`font-extrabold text-[11px] truncate ${item.comboItems && item.comboItems.length > 0 ? 'text-amber-300' : 'text-white'}`}>
                    {item.name}
                  </p>
                  <p className="text-olive-400 text-[10px]">{item.variant} · {curr}{item.unitPrice}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => updateQty(item.cartKey, -1)} className="w-6 h-6 rounded bg-olive-950 border border-gold-500/20 text-white flex items-center justify-center hover:border-gold-500/50 transition-colors text-sm">−</button>
                  <span className="font-bold text-white w-5 text-center text-sm">{item.quantity}</span>
                  <button onClick={() => updateQty(item.cartKey, 1)} className="w-6 h-6 rounded bg-olive-950 border border-gold-500/20 text-white flex items-center justify-center hover:border-gold-500/50 transition-colors text-sm">+</button>
                </div>
                <span className="font-bold text-gold-400 text-[11px] min-w-[52px] text-right">{curr}{item.totalPrice.toFixed(2)}</span>
              </div>
              {item.comboItems && item.comboItems.length > 0 && (
                <div className="ml-2 pl-2 border-l-2 border-amber-500/40 text-[10px] text-amber-200/90 space-y-0.5 font-medium">
                  {item.comboItems.map((sub: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{sub}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bill Summary + Controls */}
        <div className="space-y-2 flex-shrink-0">
          <div className="bg-olive-900/60 border border-gold-500/10 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-olive-300"><span>Taxable Amt</span><span>{fmt(subtotal - taxAmt, curr)}</span></div>
            <div className="flex justify-between text-olive-300"><span>CGST @ {taxRate / 2}%</span><span>{fmt(taxAmt / 2, curr)}</span></div>
            <div className="flex justify-between text-olive-300"><span>SGST @ {taxRate / 2}%</span><span>{fmt(taxAmt / 2, curr)}</span></div>
            <div className="flex justify-between items-center text-emerald-400">
              <span>Discount ({curr})</span>
              <input type="number" min={0} value={discount}
                onChange={(e) => setDiscount(Number(e.target.value || 0))}
                className="w-16 px-1.5 py-0.5 bg-olive-950 border border-gold-500/20 rounded text-right font-bold text-emerald-400 outline-none"
              />
            </div>
            <div className="flex justify-between text-base font-extrabold text-gold-500 border-t border-dashed border-gold-500/20 pt-2">
              <span>Grand Total</span><span>{fmt(grandTotal, curr)}</span>
            </div>
          </div>

          {/* Quick Toggle: Print Token (KOT) with Bill */}
          <div
            onClick={() => {
              const currentVal = restaurantDetails?.printWithToken ?? true;
              updateRestaurantDetails({ printWithToken: !currentVal });
            }}
            className="flex items-center justify-between px-3 py-2 bg-olive-900 border border-gold-500/20 rounded-xl cursor-pointer hover:border-gold-500/50 transition-all select-none"
          >
            <div className="flex items-center gap-2">
              <Printer className="w-3.5 h-3.5 text-gold-400" />
              <span className="text-xs font-semibold text-olive-200">Print Token (KOT) with Bill</span>
            </div>
            <div className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors ${
              (restaurantDetails?.printWithToken ?? true) ? 'bg-gold-500 justify-end' : 'bg-olive-950 justify-start border border-gold-500/20'
            }`}>
              <div className={`w-3 h-3 rounded-full shadow-md transition-transform ${
                (restaurantDetails?.printWithToken ?? true) ? 'bg-olive-950' : 'bg-olive-400'
              }`} />
            </div>
          </div>

          <div className="flex gap-1.5">
            {[{ id: 'Cash', icon: <Banknote className="w-3.5 h-3.5" /> }, { id: 'UPI', icon: <QrCode className="w-3.5 h-3.5" /> }, { id: 'Card', icon: <CreditCard className="w-3.5 h-3.5" /> }].map((mode) => (
              <button key={mode.id} onClick={() => setPaymentMode(mode.id as any)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${paymentMode === mode.id ? 'bg-gold-500/10 border border-gold-500 text-gold-400' : 'bg-olive-900 border border-gold-500/20 text-olive-400'
                  }`}
              >{mode.icon} {mode.id}</button>
            ))}
          </div>

          <button onClick={handleCheckoutClick}
            className={`w-full py-3 ${editingBillNumber ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-amber-500/30' : 'bg-gradient-to-r from-gold-500 to-gold-dark text-olive-950 shadow-gold-500/20'} font-extrabold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform`}
          >
            <Printer className="w-4 h-4" /> {editingBillNumber ? `Update & Print Bill (${editingBillNumber})` : 'Complete Order & Print Bill'}
          </button>

          {cart.length > 0 && (
            <button onClick={() => { if (confirm('Clear all items?')) clearCart(); }}
              className="w-full py-2 bg-olive-900 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Cart
            </button>
          )}
        </div>
      </div>

      {/* Confirm Modal (Thermal Bill Preview) */}
      {showConfirmModal && (
        <ConfirmOrderModal
          cart={cart} orderType={orderType} paymentMode={paymentMode}
          subtotal={subtotal} tax={taxAmt} discount={discount} grandTotal={grandTotal}
          taxRate={taxRate} curr={curr} billNumber={editingBillNumber || nextBillNumber} restaurantDetails={restaurantDetails}
          onSaveOnly={() => handleSaveOrder(false)}
          onPrintAndSave={() => handleSaveOrder(true)}
          onCancel={() => setShowConfirmModal(false)}
          isLoading={isCheckingOut}
        />
      )}
    </div>
  );
};
