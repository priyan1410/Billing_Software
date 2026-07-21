import React, { useState, useEffect } from 'react';
import {
  Search, ShoppingCart, Trash2, Printer, Utensils, ShoppingBag,
  CreditCard, QrCode, Banknote, X, CheckCircle2, AlertTriangle, Receipt, User, Phone
} from 'lucide-react';
import { usePosStore } from '../../store/usePosStore';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Dish, OrderPayload, PortionVariant } from '../../types';

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
  const address = String(restaurantDetails?.address || '45, Arabian Avenue, Mount Road, Chennai');
  const rawPhone = String(restaurantDetails?.phone || '+91 98765 43210');
  const phone = rawPhone.startsWith('Phone:') ? rawPhone : `Phone: ${rawPhone.startsWith('+') ? rawPhone : `+91 ${rawPhone}`}`;
  const rawGst = String(restaurantDetails?.gstNumber || '33ABCDE1234F1Z5');
  const gstin = rawGst.startsWith('GSTIN:') ? rawGst : `GSTIN: ${rawGst}`;
  const printShowLogo = restaurantDetails?.printShowLogo ?? true;
  const printShowAddress = restaurantDetails?.printShowAddress ?? true;
  const printShowPhone = restaurantDetails?.printShowPhone ?? true;
  const printShowGst = restaurantDetails?.printShowGst ?? true;
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
          <div className="w-full max-w-[370px] bg-white text-black font-mono shadow-2xl p-6 relative rounded-t-sm select-text border border-slate-300 text-left">

            {/* Receipt Header SVG Illustration */}
            {printShowLogo && (
              <div className="flex justify-center mb-1">
                <svg viewBox="0 0 300 60" className="w-48 h-10 text-black">
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

            {/* Restaurant Title */}
            <div className="text-center">
              <h2 className="text-xl font-extrabold tracking-tight uppercase leading-tight font-sans text-black">
                {storeName}
              </h2>
              {printShowAddress && address && <p className="text-[11px] text-slate-900 font-medium mt-0.5">{address}</p>}
              {printShowPhone && phone && <p className="text-[11px] text-slate-900 font-medium">{phone}</p>}
              {printShowGst && gstin && <p className="text-[11px] text-slate-900 font-medium">{gstin}</p>}
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
                const label = `${item.name}${item.variant ? ` (${item.variant})` : ''}`;
                const unitP = Number(item.unitPrice || item.price || 0);
                const totalP = Number(item.totalPrice || (unitP * (item.quantity || 1)));
                return (
                  <div key={idx} className="grid grid-cols-[1.4fr_0.4fr_0.8fr_0.8fr] gap-1 text-[11px] leading-tight items-baseline">
                    <span className="font-semibold text-black break-words">{label}</span>
                    <span className="text-center">{item.quantity || 1}</span>
                    <span className="text-right">{unitP.toFixed(2)}</span>
                    <span className="text-right font-semibold">{totalP.toFixed(2)}</span>
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

            {/* Sawtooth Jagged Bottom */}
            <div
              className="absolute -bottom-3 left-0 w-full h-3"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 10' width='20' height='10'%3E%3Cpolygon points='0,0 10,10 20,0' fill='%23ffffff'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat-x',
                backgroundSize: '15px 10px'
              }}
            />
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
  const { cart, orderType, paymentMode, discount, setOrderType, setPaymentMode, setDiscount, addToCart, updateQty, clearCart, loadTokenToCart } = usePosStore();
  const { activeTokensList } = useAppStore();
  const { restaurantDetails } = useAuthStore();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTokenNum, setSelectedTokenNum] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [nextBillNumber, setNextBillNumber] = useState<string>('KMIV-001');

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

  useEffect(() => { loadDishes(); }, [activeCategory]);
  useEffect(() => { fetchNextBillNumber(); }, []);

  const loadDishes = async () => {
    if ((window as any).electronAPI) {
      const res = await (window as any).electronAPI.getMenuItems(activeCategory);
      if (res.success) setDishes(res.data);
    } else {
      setDishes([
        { id: 1, categoryId: 1, name: 'Special Chicken Mandhi (ஸ்பெஷல் சிக்கன் மந்தி)', priceQuarter: 220, priceHalf: 420, priceFull: 790, isAvailable: true },
        { id: 2, categoryId: 1, name: 'Mutton Raan Mandhi (மட்டன் ரான் மந்தி)', priceQuarter: 350, priceHalf: 680, priceFull: 1290, isAvailable: true },
        { id: 3, categoryId: 1, name: 'Beef Ribs Mandhi (பீஃப் ரிப்ஸ் மந்தி)', priceQuarter: 280, priceHalf: 520, priceFull: 980, isAvailable: true },
        { id: 4, categoryId: 2, name: 'Peri Peri Alfaham (பெரி பெரி அல்ஃபஹாம்)', priceQuarter: 160, priceHalf: 310, priceFull: 590, isAvailable: true },
        { id: 5, categoryId: 2, name: 'Honey Chili Alfaham (ஹனி சில்லி அல்ஃபஹாம்)', priceQuarter: 170, priceHalf: 330, priceFull: 620, isAvailable: true },
        { id: 6, categoryId: 3, name: 'Kubboos (குபூஸ் - 2 Pcs)', priceQuarter: 30, priceHalf: 30, priceFull: 30, isAvailable: true },
        { id: 7, categoryId: 3, name: 'Special Garlic Sauce (பூண்டு சாஸ்)', priceQuarter: 40, priceHalf: 40, priceFull: 40, isAvailable: true },
        { id: 8, categoryId: 4, name: 'Mint Lime Mojito (புதினா மோஹிட்டோ)', priceQuarter: 70, priceHalf: 70, priceFull: 70, isAvailable: true },
        { id: 9, categoryId: 4, name: 'Avocado Milkshake (அவகாடோ மில்க்‌ஷேக்)', priceQuarter: 110, priceHalf: 110, priceFull: 110, isAvailable: true },
        { id: 10, categoryId: 5, name: 'Turkish Kunafa (துருக்கி குனாஃபா)', priceQuarter: 180, priceHalf: 180, priceFull: 180, isAvailable: true }
      ]);
    }
  };

  const filteredDishes = dishes.filter((d) => {
    const matchesCat = activeCategory === 'all' || String(d.categoryId) === String(activeCategory);
    return matchesCat && d.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmt = subtotal * (taxRate / 100);
  const grandTotal = Math.max(0, subtotal + taxAmt - discount);

  const handleImportToken = () => {
    if (!selectedTokenNum) return;
    const target = activeTokensList.find((t) => String(t.tokenNumber) === String(selectedTokenNum));
    if (target) loadTokenToCart(target, dishes);
  };

  const handleCheckoutClick = async () => {
    if (cart.length === 0) { alert('Cart is empty! Add items first.'); return; }
    await fetchNextBillNumber();
    setShowConfirmModal(true);
  };

  const handleSaveOrder = async (shouldPrint = true) => {
    setIsCheckingOut(true);
    const currentBillNumber = await fetchNextBillNumber();
    const payload = {
      order_number: currentBillNumber,
      order_type: orderType,
      subtotal,
      tax_amount: taxAmt,
      discount_amount: discount,
      grand_total: grandTotal,
      payment_mode: paymentMode,
      items: cart,
      order_date: new Date().toISOString().split('T')[0],
      due_date: '',
      shipping_charges: 0,
      round_off: 0,
      customer_name: 'Walk-in',
    };
    const base = {
      orderNumber: currentBillNumber,
      items: [...cart],
      subtotal,
      tax: taxAmt,
      discount,
      grandTotal,
      orderType,
      paymentMode,
      customerName: 'Walk-in',
      cashierName: (useAuthStore.getState().user?.name || 'Staff') as string,
      tableNumber: 'N/A',
    };

    let createdData: any = null;

    if ((window as any).electronAPI) {
      const res = await (window as any).electronAPI.createOrder(payload);
      if (res.success) {
        createdData = { ...base, ...res.data };
      } else {
        alert(res.message || 'Order failed. Try again.');
        setIsCheckingOut(false);
        return;
      }
    } else {
      createdData = {
        orderDate: payload.order_date,
        dueDate: payload.due_date,
        shippingCharges: payload.shipping_charges,
        roundOff: payload.round_off,
        ...base,
      };
    }

    if (shouldPrint && createdData) {
      await triggerPrintDirect(createdData, false);
    }

    setShowConfirmModal(false);
    clearCart();
    setIsCheckingOut(false);
    fetchNextBillNumber();
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
    const rName = String(rd?.companyName || 'KISH MANDHI');
    const rAddr = String(rd?.address || '45, Arabian Avenue, Mount Road, Chennai');
    const rawPhone = String(rd?.phone || '+91 98765 43210');
    const rPhone = rawPhone.startsWith('Phone:') ? rawPhone : `Phone: ${rawPhone.startsWith('+') ? rawPhone : `+91 ${rawPhone}`}`;
    const rawGst = String(rd?.gstNumber || '33ABCDE1234F1Z5');
    const rGst = rawGst.startsWith('GSTIN:') ? rawGst : `GSTIN: ${rawGst}`;
    const curr = rd?.currency || '₹';
    const tp = rd?.taxRate ?? 5;
    const cgstRate = (tp / 2).toFixed(1);
    const sgstRate = (tp / 2).toFixed(1);

    const printShowLogo = rd?.printShowLogo ?? true;
    const printShowAddress = rd?.printShowAddress ?? true;
    const printShowPhone = rd?.printShowPhone ?? true;
    const printShowGst = rd?.printShowGst ?? true;
    const printShowHeaderNote = rd?.printShowHeaderNote ?? true;
    const printShowTime = rd?.printShowTime ?? true;
    const printShowTaxBreakdown = rd?.printShowTaxBreakdown ?? true;
    const printShowRoundOff = rd?.printShowRoundOff ?? true;
    const printShowFooterNote = rd?.printShowFooterNote ?? true;

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

    const billNumber = data.orderNumber || `KMIV-001`;
    const tokenNumber = data.tokenNumber
      ? (String(data.tokenNumber).startsWith('KMKOT-') ? data.tokenNumber : `KMKOT-${String(data.tokenNumber).padStart(3, '0')}`)
      : `KMKOT-001`;
    const taxableAmount = Math.max(0, data.subtotal - (data.discount || 0));
    const rounding = data.roundOff ?? 0;

    const html = isKot
      ? `<!doctype html><html><head>${receiptStyles}</head><body><div class="receipt">
          <div class="center bold"><div style="font-size:14px;">${rName}</div><div style="font-size:11px; letter-spacing:1px; margin-top:2px;">KITCHEN ORDER TICKET</div></div>
          <div class="divider"></div>
          <div style="font-size:11px;"><div>Token: <strong>#${tokenNumber}</strong></div><div>Type: ${data.orderType}</div><div>Date: ${formattedDate} ${formattedTime}</div></div>
          <div class="divider"></div>
          <div class="row table-header"><span class="col-item">ITEM DESCRIPTION</span><span class="col-qty">QTY</span></div>
          ${data.items.map((i: any) => {
        const label = `${i.name}${i.variant ? ` (${i.variant})` : ''}`;
        return `<div class="row"><span class="col-item">${label}</span><span class="col-qty">${i.quantity}</span></div>`;
      }).join('')}
          <div class="divider"></div>
        </div></body></html>`
      : `<!doctype html><html><head>${receiptStyles}</head><body><div class="receipt">
          <!-- Logo SVG -->
          ${printShowLogo ? `<div class="center" style="margin-bottom: 4px;">
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

          <!-- Restaurant Name & Details -->
          <div class="center bold" style="font-size: 16px; text-transform: uppercase;">${rName}</div>
          ${printShowAddress && rAddr ? `<div class="center" style="font-size: 10.5px;">${rAddr}</div>` : ''}
          ${printShowPhone && rPhone ? `<div class="center" style="font-size: 10.5px;">${rPhone}</div>` : ''}
          ${printShowGst && rGst ? `<div class="center" style="font-size: 10.5px;">${rGst}</div>` : ''}
          ${printShowHeaderNote && rDetails?.headerNote ? `<div class="center" style="font-size: 10px; font-style: italic; margin-top: 2px;">${rDetails.headerNote}</div>` : ''}
          
          <div class="divider"></div>
          <div class="center bold" style="font-size: 11px; letter-spacing: 1px;">*** TAX INVOICE ***</div>
          
          <div style="font-size: 10.5px; margin: 4px 0;">
            <div style="display: flex; justify-content: space-between;">
              <span>Bill No &nbsp;: ${billNumber}</span>
              <span>Date &nbsp;: ${formattedDate}</span>
            </div>
            ${printShowTime ? `<div style="display: flex; justify-content: space-between;">
              <span>Time &nbsp;&nbsp;&nbsp;: ${formattedTime}</span>
            </div>` : ''}
          </div>
          
          <div class="divider"></div>
          
          <!-- Table Header -->
          <div class="row table-header" style="font-size: 10.5px;">
            <span class="col-item">Item</span>
            <span class="col-qty">Qty</span>
            <span class="col-rate">Rate (${curr})</span>
            <span class="col-amt">Amount (${curr})</span>
          </div>
          
          <!-- Items List -->
          ${(data.items || []).map((i: any) => {
        const label = `${i.name}${i.variant ? ` (${i.variant})` : ''}`;
        const uPrice = Number(i.unitPrice || i.price || 0).toFixed(2);
        const tPrice = Number(i.totalPrice || (uPrice * (i.quantity || 1))).toFixed(2);
        return `<div class="row" style="font-size: 10.5px;"><span class="col-item">${label}</span><span class="col-qty">${i.quantity || 1}</span><span class="col-rate">${uPrice}</span><span class="col-amt">${tPrice}</span></div>`;
      }).join('')}
          
          <div class="divider"></div>
          
          <!-- Calculation Section -->
          <div style="font-size: 10.5px;">
            <div class="row"><span>Subtotal</span><span>${data.subtotal.toFixed(2)}</span></div>
            ${data.discount > 0 ? `<div class="row"><span>Discount</span><span>-${data.discount.toFixed(2)}</span></div>` : ''}
            <div style="display: flex; justify-content: flex-end; margin: 3px 0;"><div style="border-top: 1px dashed #000; width: 80px;"></div></div>
            <div class="row"><span>Taxable Amount</span><span>${taxableAmount.toFixed(2)}</span></div>
            ${printShowTaxBreakdown ? `
            <div class="row"><span>CGST (${cgstRate}%)</span><span>${((data.tax || 0) / 2).toFixed(2)}</span></div>
            <div class="row"><span>SGST (${sgstRate}%)</span><span>${((data.tax || 0) / 2).toFixed(2)}</span></div>
            ` : ''}
            ${printShowRoundOff ? `<div class="row"><span>Round Off</span><span>${rounding.toFixed(2)}</span></div>` : ''}
          </div>
          
          <div class="divider"></div>
          
          <!-- Grand Total Banner -->
          <div class="row double-divider bold" style="font-size: 15px;">
            <span>GRAND TOTAL</span>
            <span>${curr} ${data.grandTotal.toFixed(2)}</span>
          </div>
          
          <div class="divider"></div>
          
          <!-- Footer -->
          ${printShowFooterNote ? `<div class="center" style="margin-top: 8px;">
            <div style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-weight: bold; font-size: 14px;">
              Thank You!<br/>Visit Again.
            </div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin: 6px 0;">
              <span style="border-bottom: 1px solid #000; width: 35px; display: inline-block;"></span>
              <span style="font-size: 9px;">★</span>
              <span style="border-bottom: 1px solid #000; width: 35px; display: inline-block;"></span>
            </div>
            <div style="font-size: 9.5px; line-height: 1.3;">
              ${rDetails?.footerNote || 'Goods once sold cannot be returned.'}
            </div>
          </div>` : ''}
        </div></body></html>`;
    if ((window as any).electronAPI) {
      await (window as any).electronAPI.printReceipt(html);
    } else {
      const w = window.open('', '_blank', 'width=400,height=700');
      if (w) { w.document.write(`<html><body>${html}</body></html>`); w.print(); }
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
          {CATS.map((cat) => (
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

        {/* Token Import */}
        <div className="flex gap-2 flex-shrink-0">
          <select value={selectedTokenNum} onChange={(e) => setSelectedTokenNum(e.target.value)}
            className="flex-1 py-2 px-3 bg-olive-900 border border-gold-500/20 rounded-xl text-white text-xs outline-none"
          >
            <option value="">Import from Token...</option>
            {activeTokensList.map((t) => <option key={t.tokenNumber} value={t.tokenNumber}>Token #{t.tokenNumber}</option>)}
          </select>
          <button onClick={handleImportToken} className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 font-bold text-xs rounded-xl hover:scale-105 transition-transform">Load</button>
        </div>

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
            <div key={item.cartKey} className="flex items-center gap-2 bg-olive-800/60 px-3 py-2 rounded-xl text-xs">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-[11px] truncate">{item.name}</p>
                <p className="text-olive-400 text-[10px]">{item.variant} · {curr}{item.unitPrice}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => updateQty(item.cartKey, -1)} className="w-6 h-6 rounded bg-olive-950 border border-gold-500/20 text-white flex items-center justify-center hover:border-gold-500/50 transition-colors text-sm">−</button>
                <span className="font-bold text-white w-5 text-center text-sm">{item.quantity}</span>
                <button onClick={() => updateQty(item.cartKey, 1)} className="w-6 h-6 rounded bg-olive-950 border border-gold-500/20 text-white flex items-center justify-center hover:border-gold-500/50 transition-colors text-sm">+</button>
              </div>
              <span className="font-bold text-gold-400 text-[11px] min-w-[52px] text-right">{curr}{item.totalPrice.toFixed(2)}</span>
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

          <div className="flex gap-1.5">
            {[{ id: 'Cash', icon: <Banknote className="w-3.5 h-3.5" /> }, { id: 'UPI', icon: <QrCode className="w-3.5 h-3.5" /> }, { id: 'Card', icon: <CreditCard className="w-3.5 h-3.5" /> }].map((mode) => (
              <button key={mode.id} onClick={() => setPaymentMode(mode.id as any)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${paymentMode === mode.id ? 'bg-gold-500/10 border border-gold-500 text-gold-400' : 'bg-olive-900 border border-gold-500/20 text-olive-400'
                  }`}
              >{mode.icon} {mode.id}</button>
            ))}
          </div>

          <button onClick={handleCheckoutClick}
            className="w-full py-3 bg-gradient-to-r from-gold-500 to-gold-dark text-olive-950 font-extrabold rounded-xl text-sm shadow-lg shadow-gold-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <Printer className="w-4 h-4" /> Complete Order & Print Bill
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
          taxRate={taxRate} curr={curr} billNumber={nextBillNumber} restaurantDetails={restaurantDetails}
          onSaveOnly={() => handleSaveOrder(false)}
          onPrintAndSave={() => handleSaveOrder(true)}
          onCancel={() => setShowConfirmModal(false)}
          isLoading={isCheckingOut}
        />
      )}
    </div>
  );
};
