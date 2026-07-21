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
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}> = ({ cart, orderType, paymentMode, subtotal, tax, discount, grandTotal, taxRate, curr, onConfirm, onCancel, isLoading }) => {
  const invoiceDate = new Date().toLocaleDateString('en-IN');
  const cgst = taxRate / 2;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl shadow-2xl shadow-black/10 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 p-5 border-b border-slate-200 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h4 className="font-bold text-slate-950 text-base uppercase tracking-[0.15em]">Bill Preview</h4>
            <p className="text-sm text-slate-500 mt-1">Review the invoice content before recording it to the ledger.</p>
          </div>
          <button onClick={onCancel} className="ml-auto text-slate-500 hover:text-slate-900"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-900">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
              <div>
                <h3 className="text-xl font-semibold">Kish Mandhi</h3>
                <p className="text-sm text-slate-600 mt-1">Arabic Grill & Fine Dining</p>
                <p className="text-sm text-slate-600">GSTIN: 33ABCDE1234F2Z5</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex justify-between"><span>Invoice Date</span><span className="font-semibold text-slate-900">{invoiceDate}</span></div>
                <div className="flex justify-between"><span>Order Type</span><span className="font-semibold text-slate-900">{orderType}</span></div>
                <div className="flex justify-between"><span>Payment</span><span className="font-semibold text-slate-900">{paymentMode}</span></div>
                <div className="flex justify-between"><span>Items</span><span className="font-semibold text-slate-900">{itemCount}</span></div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-[0.12em]">
                  <th className="p-3 text-left">#</th>
                  <th className="p-3 text-left">Product</th>
                  <th className="p-3 text-left">Qty</th>
                  <th className="p-3 text-right">Rate</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, idx) => {
                  const lineTotal = item.totalPrice;
                  return (
                    <tr key={item.cartKey} className="border-b border-slate-100">
                      <td className="p-3 text-slate-600">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-500">{item.variant} · {item.unit || 'Plate'}</div>
                      </td>
                      <td className="p-3 text-slate-700">{item.quantity}</td>
                      <td className="p-3 text-right text-slate-700">{curr}{item.unitPrice.toFixed(2)}</td>
                      <td className="p-3 text-right font-semibold text-slate-900">{curr}{lineTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900 mb-2">Notes</p>
              <p>Goods once sold cannot be returned. Please verify the invoice before confirming.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
              <div className="flex justify-between"><span>Subtotal</span><span className="text-slate-900">{curr}{subtotal.toFixed(2)}</span></div>
              {discount > 0 && <div className="flex justify-between"><span>Discount</span><span className="text-slate-900">-{curr}{discount.toFixed(2)}</span></div>}
              <div className="flex justify-between"><span>CGST @ {cgst}%</span><span className="text-slate-900">{curr}{(tax / 2).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>SGST @ {cgst}%</span><span className="text-slate-900">{curr}{(tax / 2).toFixed(2)}</span></div>
              <div className="border-t border-slate-200 pt-3 flex justify-between font-semibold text-slate-950 text-base"><span>Total</span><span>{curr}{grandTotal.toFixed(2)}</span></div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-200 flex-shrink-0 bg-slate-50">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-extrabold shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            {isLoading ? 'Saving...' : 'Confirm Invoice & Print'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfessionalInvoiceModal: React.FC<{
  data: any;
  restaurantDetails: any;
  onClose: () => void;
  onPrint: (isKot?: boolean) => void;
}> = ({ data, restaurantDetails, onClose, onPrint }) => {
  const curr = restaurantDetails?.currency || '₹';
  const storeName = restaurantDetails?.companyName || 'Kish Mandhi';
  const address = restaurantDetails?.address || '';
  const phone = restaurantDetails?.phone || '';
  const email = restaurantDetails?.email || '';
  const gst = restaurantDetails?.gstNumber || '';
  const notes = restaurantDetails?.footerNote || 'Goods once sold cannot be returned.';
  const invoiceDate = data.orderDate || new Date().toISOString().split('T')[0];
  const dueDate = data.dueDate || '';
  const taxRate = restaurantDetails?.taxRate ?? 5;
  const cgst = taxRate / 2;
  const shippingCharges = data.shippingCharges ?? 0;
  const roundOff = data.roundOff ?? 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-olive-900 border border-gold-500/40 rounded-3xl shadow-2xl shadow-black/60 w-full max-w-[820px] overflow-hidden">
        <div className="p-6 text-[12px] text-white">
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] mb-4">
            <div className="space-y-3">
              <div className="text-center lg:text-left">
                <h2 className="text-3xl font-extrabold tracking-[0.2em] uppercase">{storeName}</h2>
                {restaurantDetails?.tagline && <p className="text-sm text-olive-300 mt-1">{restaurantDetails.tagline}</p>}
              </div>
              {address && <p className="text-sm text-olive-300">{address}</p>}
              <div className="flex flex-wrap gap-3 text-[11px] text-olive-300">
                {phone && <span>Phone: {phone}</span>}
                {email && <span>Email: {email}</span>}
                {gst && <span>GSTIN: {gst}</span>}
              </div>
            </div>

            <div className="rounded-3xl border border-gold-500/20 bg-olive-950/60 p-4 text-[11px]">
              <h3 className="font-bold text-gold-300 uppercase tracking-[0.2em] text-xs mb-3">Invoice Details</h3>
              <div className="space-y-2 text-olive-300">
                <div className="flex justify-between"><span>Invoice #</span><span className="text-white font-semibold">{data.orderNumber}</span></div>
                <div className="flex justify-between"><span>Invoice Date</span><span className="text-white font-semibold">{invoiceDate}</span></div>
                {dueDate && <div className="flex justify-between"><span>Due Date</span><span className="text-white font-semibold">{dueDate}</span></div>}
                <div className="flex justify-between"><span>Order Type</span><span className="text-white font-semibold">{data.orderType}</span></div>
                <div className="flex justify-between"><span>Payment</span><span className="text-white font-semibold">{data.paymentMode}</span></div>
                <div className="flex justify-between"><span>Token #</span><span className="text-white font-semibold">{data.tokenNumber}</span></div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-gold-500/20 text-left text-olive-300 text-[10px] uppercase tracking-[0.08em]">
                  <th className="p-2">S.No.</th>
                  <th className="p-2">Product</th>
                  <th className="p-2">Unit</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Rate</th>
                  <th className="p-2 text-right">Disc</th>
                  <th className="p-2 text-right">Tax</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: any, idx: number) => {
                  const unit = item.unit || 'Plate';
                  const lineDiscount = item.discount ?? 0;
                  const lineTax = ((item.totalPrice || 0) - lineDiscount) * (taxRate / 100);
                  return (
                    <tr key={idx} className="border-b border-gold-500/10">
                      <td className="py-2 px-2 text-olive-300">{idx + 1}</td>
                      <td className="py-2 px-2">
                        <div className="font-semibold text-white truncate">{item.name}</div>
                        {item.hsnSac && <div className="text-[10px] text-olive-400">HSN/SAC: {item.hsnSac}</div>}
                      </td>
                      <td className="py-2 px-2 text-olive-300">{unit}</td>
                      <td className="py-2 px-2 text-right text-olive-300">{item.quantity}</td>
                      <td className="py-2 px-2 text-right text-olive-300">{curr}{item.unitPrice.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right text-olive-300">{curr}{lineDiscount.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right text-olive-300">{taxRate}%</td>
                      <td className="py-2 px-2 text-right font-semibold text-gold-300">{curr}{(item.totalPrice - lineDiscount + lineTax).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_300px] mb-4">
            <div className="rounded-3xl border border-gold-500/20 bg-olive-950/60 p-4 text-[11px]">
              <h5 className="font-semibold text-gold-300 uppercase tracking-[0.15em] mb-2">Notes</h5>
              <p className="text-olive-300 leading-6">{notes}</p>
            </div>
            <div className="rounded-3xl border border-gold-500/20 bg-olive-950/60 p-4 text-[11px] space-y-2">
              <div className="flex justify-between"><span>Subtotal</span><span>{curr}{data.subtotal.toFixed(2)}</span></div>
              {data.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{curr}{data.discount.toFixed(2)}</span></div>}
              <div className="flex justify-between"><span>CGST @ {cgst}%</span><span>{curr}{((data.tax ?? 0) / 2).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>SGST @ {cgst}%</span><span>{curr}{((data.tax ?? 0) / 2).toFixed(2)}</span></div>
              {shippingCharges > 0 && <div className="flex justify-between"><span>Shipping</span><span>{curr}{shippingCharges.toFixed(2)}</span></div>}
              {roundOff !== 0 && <div className="flex justify-between"><span>Round Off</span><span>{curr}{roundOff.toFixed(2)}</span></div>}
              <div className="border-t border-gold-500/20 pt-3 font-bold text-white text-base flex justify-between"><span>Grand Total</span><span>{curr}{data.grandTotal.toFixed(2)}</span></div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 mb-4">
            <div className="rounded-3xl border border-gold-500/20 bg-olive-950/60 p-4 text-[11px]">
              <p className="font-semibold text-gold-300 uppercase tracking-[0.15em] mb-2">Authorized Signature</p>
              <div className="h-12 border-b border-gold-500/20"></div>
            </div>
            <div className="rounded-3xl border border-gold-500/20 bg-olive-950/60 p-4 text-[11px]">
              <p className="font-semibold text-gold-300 uppercase tracking-[0.15em] mb-2">Customer Signature</p>
              <div className="h-12 border-b border-gold-500/20"></div>
            </div>
          </div>

          <div className="border-t border-gold-500/20 pt-4 text-center text-[10px] text-olive-400">
            <p>Thank you for your business!</p>
            <p>{phone ? `Phone: ${phone}` : ''}{phone && email ? ' | ' : ''}{email ? `Email: ${email}` : ''}</p>
          </div>
        </div>

        <div className="flex gap-2 p-3 bg-olive-950 border-t border-gold-500/10">
          <button
            onClick={() => onPrint(false)}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-dark text-olive-950 font-bold text-xs"
          >
            Print Compact Bill
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-olive-800 border border-gold-500/20 text-white text-xs"
          >
            Close
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
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const curr = restaurantDetails?.currency || '₹';
  const taxRate = restaurantDetails?.taxRate ?? 5;

  useEffect(() => { loadDishes(); }, [activeCategory]);

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

  const handleCheckoutClick = () => {
    if (cart.length === 0) { alert('Cart is empty! Add items first.'); return; }
    setShowConfirmModal(true);
  };

  const handleConfirmedCheckout = async () => {
    setIsCheckingOut(true);
    const payload = {
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
    };
    const base = { items: [...cart], subtotal, tax: taxAmt, discount, grandTotal, orderType, paymentMode };

    if ((window as any).electronAPI) {
      const res = await (window as any).electronAPI.createOrder(payload);
      if (res.success) {
        setReceiptData({ ...res.data, ...base });
        setShowConfirmModal(false);
        setShowInvoiceModal(true);
        clearCart();
      } else {
        alert(res.message || 'Order failed. Try again.');
      }
    } else {
      setReceiptData({
        orderNumber: `KM-${Date.now().toString().slice(-6)}`,
        tokenNumber: Math.floor(100 + Math.random() * 900),
        orderDate: payload.order_date,
        dueDate: payload.due_date,
        shippingCharges: payload.shipping_charges,
        roundOff: payload.round_off,
        ...base,
      });
      setShowConfirmModal(false);
      setShowInvoiceModal(true);
      clearCart();
    }
    setIsCheckingOut(false);
  };

  const triggerPrint = async (isKot = false) => {
    if (!receiptData) return;
    const now = new Date().toLocaleString('en-IN');
    const rd = restaurantDetails;
    const rName = rd?.companyName || 'Kish Mandhi';
    const rAddr = rd?.address || '';
    const rPhone = rd?.phone || '';
    const rGst = rd?.gstNumber || '';
    const rTagline = rd?.tagline || 'Arabic Grill & Fine Dining';
    const rFooter = rd?.footerNote || 'Thank you for visiting!';
    const tp = rd?.taxRate ?? 5;
    const cgst = tp / 2; const sgst = tp / 2;

    const receiptStyles = `
      <style>
        @page { size: 80mm auto; margin: 5mm; }
        body { margin: 0; padding: 0; font-family: monospace, sans-serif; font-size: 11px; color: #000; background: #fff; }
        .receipt { width: 78mm; margin: 0 auto; padding: 8px; }
        .receipt h2, .receipt h3, .receipt p { margin: 0; }
        .receipt .center { text-align: center; }
        .receipt .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .receipt table { width: 100%; border-collapse: collapse; }
        .receipt th, .receipt td { padding: 2px 0; }
        .receipt .text-right { text-align: right; }
        .receipt .text-left { text-align: left; }
        .receipt .small { font-size: 10px; }
        .receipt .bold { font-weight: bold; }
      </style>
    `;

    const html = isKot
      ? `<!doctype html><html><head>${receiptStyles}</head><body><div class="receipt">
          <div class="center bold"><h2>${rName}</h2><p class="small">KITCHEN ORDER TICKET</p></div>
          <div class="divider"></div>
          <div class="small"><div>Token: ${receiptData.tokenNumber}</div><div>Type: ${receiptData.orderType}</div><div>${now}</div></div>
          <div class="divider"></div>
          <table>
            ${receiptData.items.map((i: any) => `<tr><td class="text-left">${i.quantity} x ${i.name}</td></tr>`).join('')}
          </table>
          <div class="divider"></div>
        </div></body></html>`
      : `<!doctype html><html><head>${receiptStyles}</head><body><div class="receipt">
          <div class="center bold"><h2>${rName}</h2><p class="small">${rTagline}</p></div>
          ${rAddr ? `<div class="center small">${rAddr}</div>` : ''}
          ${rPhone ? `<div class="center small">Ph: ${rPhone}</div>` : ''}
          ${rGst ? `<div class="center small">GST: ${rGst}</div>` : ''}
          <div class="divider"></div>
          <div class="small"><div>Bill #: ${receiptData.orderNumber}</div><div>Token #: ${receiptData.tokenNumber}</div><div>${now}</div></div>
          <div class="divider"></div>
          <table>
            ${receiptData.items.map((i: any) => `
              <tr>
                <td class="text-left small">${i.name} (${i.variant})</td>
              </tr>
              <tr>
                <td class="text-left small">${i.quantity} x ${curr}${i.unitPrice.toFixed(2)}</td>
                <td class="text-right small">${curr}${i.totalPrice.toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>
          <div class="divider"></div>
          <div class="small">
            <div class="flex-row"><span>Subtotal</span><span class="text-right">${curr}${receiptData.subtotal.toFixed(2)}</span></div>
            <div class="flex-row"><span>CGST @${cgst}%</span><span class="text-right">${curr}${(receiptData.tax / 2).toFixed(2)}</span></div>
            <div class="flex-row"><span>SGST @${sgst}%</span><span class="text-right">${curr}${(receiptData.tax / 2).toFixed(2)}</span></div>
            ${receiptData.discount > 0 ? `<div class="flex-row"><span>Discount</span><span class="text-right">-${curr}${receiptData.discount.toFixed(2)}</span></div>` : ''}
            <div class="divider"></div>
            <div class="flex-row bold"><span>Total</span><span class="text-right">${curr}${receiptData.grandTotal.toFixed(2)}</span></div>
          </div>
          <div class="divider"></div>
          <div class="center small">${rFooter}</div>
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

      {/* Confirm Modal */}
      {showConfirmModal && (
        <ConfirmOrderModal
          cart={cart} orderType={orderType} paymentMode={paymentMode}
          subtotal={subtotal} tax={taxAmt} discount={discount} grandTotal={grandTotal}
          taxRate={taxRate} curr={curr}
          onConfirm={handleConfirmedCheckout}
          onCancel={() => setShowConfirmModal(false)}
          isLoading={isCheckingOut}
        />
      )}

      {/* Professional Invoice Modal */}
      {showInvoiceModal && receiptData && (
        <ProfessionalInvoiceModal
          data={receiptData}
          restaurantDetails={restaurantDetails}
          onClose={() => setShowInvoiceModal(false)}
          onPrint={triggerPrint}
        />
      )}
    </div>
  );
};
