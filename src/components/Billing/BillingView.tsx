import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Trash2, Printer, FileCheck, Utensils, ShoppingBag, CreditCard, QrCode, Banknote, X } from 'lucide-react';
import { usePosStore } from '../../store/usePosStore';
import { useAppStore } from '../../store/useAppStore';
import { Dish, PortionVariant } from '../../types';

export const BillingView: React.FC = () => {
  const { cart, orderType, paymentMode, discount, setOrderType, setPaymentMode, setDiscount, addToCart, updateQty, clearCart, loadTokenToCart } = usePosStore();
  const { activeTokensList } = useAppStore();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTokenNum, setSelectedTokenNum] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  useEffect(() => {
    loadDishes();
  }, [activeCategory]);

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
        { id: 7, categoryId: 3, name: 'Special Garlic Sauce / Mayonnaise (பூண்டு சாஸ்)', priceQuarter: 40, priceHalf: 40, priceFull: 40, isAvailable: true },
        { id: 8, categoryId: 4, name: 'Fresh Mint Lime Mojito (புதினா மோஹிட்டோ)', priceQuarter: 70, priceHalf: 70, priceFull: 70, isAvailable: true },
        { id: 9, categoryId: 4, name: 'Avocado Milkshake (அவகாடோ மில்க்‌ஷேக்)', priceQuarter: 110, priceHalf: 110, priceFull: 110, isAvailable: true },
        { id: 10, categoryId: 5, name: 'Turkish Kunafa (துருக்கி குனாஃபா)', priceQuarter: 180, priceHalf: 180, priceFull: 180, isAvailable: true }
      ]);
    }
  };

  const filteredDishes = dishes.filter((d) => {
    const matchesCat = activeCategory === 'all' || String(d.categoryId) === String(activeCategory);
    const matchesQuery = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = subtotal * 0.05;
  const grandTotal = Math.max(0, subtotal + tax - discount);

  const handleImportToken = () => {
    if (!selectedTokenNum) return;
    const targetToken = activeTokensList.find((t) => String(t.tokenNumber) === String(selectedTokenNum));
    if (targetToken) {
      loadTokenToCart(targetToken, dishes);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    const orderPayload = {
      order_type: orderType,
      subtotal,
      tax_amount: tax,
      discount_amount: discount,
      grand_total: grandTotal,
      payment_mode: paymentMode,
      items: cart
    };

    if ((window as any).electronAPI) {
      const res = await (window as any).electronAPI.createOrder(orderPayload);
      if (res.success) {
        setReceiptData({
          ...res.data,
          items: [...cart],
          subtotal,
          tax,
          discount,
          grandTotal,
          orderType,
          paymentMode
        });
        setShowReceiptModal(true);
        clearCart();
      }
    } else {
      setReceiptData({
        orderNumber: `KM-${Date.now().toString().slice(-4)}`,
        tokenNumber: Math.floor(100 + Math.random() * 900),
        items: [...cart],
        subtotal,
        tax,
        discount,
        grandTotal,
        orderType,
        paymentMode
      });
      setShowReceiptModal(true);
      clearCart();
    }
  };

  const triggerPrint = async (isKot = false) => {
    if (!receiptData) return;
    const now = new Date().toLocaleString();

    const receiptHtml = isKot
      ? `
        <div style="font-family:monospace; font-size:12px; width:280px; margin:0 auto; padding:10px;">
          <div style="text-align:center; border-bottom:2px dashed #000; padding-bottom:8px;">
            <h2 style="margin:0;">*** KITCHEN TOKEN ***</h2>
            <p style="margin:2px 0;">KISH MANDHI</p>
            <div style="font-size:2.5rem; font-weight:bold; margin:5px 0;">TOKEN #${receiptData.tokenNumber}</div>
          </div>
          <div style="display:flex; justify-content:space-between; margin:8px 0;">
            <span>TYPE: ${receiptData.orderType}</span>
            <span>${now}</span>
          </div>
          <table style="width:100%; border-collapse:collapse; border-top:1px solid #000; margin-top:8px;">
            <tbody>
              ${receiptData.items.map((i: any) => `<tr><td style="padding:4px 0; font-weight:bold; font-size:14px;">• ${i.quantity}x ${i.name} (${i.variant})</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      `
      : `
        <div style="font-family:monospace; font-size:12px; width:280px; margin:0 auto; padding:10px;">
          <div style="text-align:center; border-bottom:1px dashed #444; padding-bottom:8px;">
            <h2 style="margin:0;">KISH MANDHI</h2>
            <p style="margin:2px 0;">Arabian Grill & Mandhi</p>
          </div>
          <div style="display:flex; justify-content:space-between; margin:6px 0;">
            <span>Bill #: <strong>${receiptData.orderNumber}</strong></span>
            <span>TOKEN #: <strong>${receiptData.tokenNumber}</strong></span>
          </div>
          <table style="width:100%; text-align:left; border-collapse:collapse; margin:8px 0;">
            <thead><tr style="border-bottom:1px solid #111;"><th>Item</th><th>Qty</th><th style="text-align:right;">Amt</th></tr></thead>
            <tbody>
              ${receiptData.items.map((i: any) => `<tr><td>${i.name} (${i.variant})</td><td>${i.quantity}</td><td style="text-align:right;">₹${i.totalPrice.toFixed(2)}</td></tr>`).join('')}
            </tbody>
          </table>
          <div style="border-top:1px dashed #444; padding-top:6px;">
            <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>₹${receiptData.subtotal.toFixed(2)}</span></div>
            ${receiptData.discount > 0 ? `<div style="display:flex; justify-content:space-between; color:#b91c1c;"><span>Discount:</span><span>-₹${receiptData.discount.toFixed(2)}</span></div>` : ''}
            <div style="display:flex; justify-content:space-between;"><span>GST (5%):</span><span>₹${receiptData.tax.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:14px; margin-top:4px;"><span>GRAND TOTAL:</span><span>₹${receiptData.grandTotal.toFixed(2)}</span></div>
          </div>
        </div>
      `;

    if ((window as any).electronAPI) {
      await (window as any).electronAPI.printReceipt(receiptHtml);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-110px)] select-none">
      {/* POS Catalog Left */}
      <div className="lg:col-span-2 flex flex-col h-full space-y-4">
        {/* Search & Categories */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-olive-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Mandhi, Alfaham, Beverages..."
              className="w-full pl-11 pr-4 py-3 bg-olive-900 border border-gold-500/20 rounded-xl text-white placeholder-olive-300 focus:outline-none focus:border-gold-500"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Items' },
              { id: '1', label: 'Mandhi Special' },
              { id: '2', label: 'Alfaham & Grill' },
              { id: '3', label: 'Starters & Sides' },
              { id: '4', label: 'Beverages' },
              { id: '5', label: 'Desserts' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md shadow-gold-500/20'
                    : 'bg-olive-900 border border-gold-500/20 text-olive-300 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dishes Rows */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
          {filteredDishes.map((dish) => (
            <div
              key={dish.id}
              className="bg-olive-900 border border-gold-500/20 rounded-xl px-4 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:border-gold-500/50 transition-all"
            >
              <h5 className="font-semibold text-sm text-white">{dish.name}</h5>
              <div className="flex gap-2 items-center shrink-0 w-full sm:w-auto">
                {dish.priceQuarter > 0 && (
                  <button
                    onClick={() => addToCart(dish, 'Quarter')}
                    className="flex-1 sm:flex-initial py-1.5 px-3 bg-olive-800 border border-gold-500/20 rounded-lg text-xs font-medium text-white hover:bg-gold-500 hover:text-olive-950 transition-all whitespace-nowrap"
                  >
                    Qtr ₹{dish.priceQuarter}
                  </button>
                )}
                {dish.priceHalf > 0 && (
                  <button
                    onClick={() => addToCart(dish, 'Half')}
                    className="flex-1 sm:flex-initial py-1.5 px-3 bg-olive-800 border border-gold-500/20 rounded-lg text-xs font-medium text-white hover:bg-gold-500 hover:text-olive-950 transition-all whitespace-nowrap"
                  >
                    Half ₹{dish.priceHalf}
                  </button>
                )}
                {dish.priceFull > 0 && (
                  <button
                    onClick={() => addToCart(dish, 'Full')}
                    className="flex-1 sm:flex-initial py-1.5 px-3 bg-olive-800 border border-gold-500/20 rounded-lg text-xs font-medium text-white hover:bg-gold-500 hover:text-olive-950 transition-all whitespace-nowrap"
                  >
                    Full ₹{dish.priceFull}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* POS Cart Right */}
      <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-5 flex flex-col h-full">
        <div className="flex justify-between items-center pb-3 border-b border-gold-500/20">
          <h3 className="text-base font-bold text-gold-500 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" /> Current Order
          </h3>
          <button onClick={clearCart} className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-medium">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>

        {/* Import Active Token */}
        <div className="my-3 p-2.5 bg-olive-800 border border-gold-500/30 rounded-xl flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-gold-500" />
          <select
            value={selectedTokenNum}
            onChange={(e) => setSelectedTokenNum(e.target.value)}
            className="flex-1 text-xs bg-olive-950 border border-gold-500/20 rounded-lg p-1.5 text-white outline-none"
          >
            <option value="">Import Active Token...</option>
            {activeTokensList.map((t) => (
              <option key={t.tokenNumber} value={t.tokenNumber}>
                Token #{t.tokenNumber} - {t.orderType}
              </option>
            ))}
          </select>
          <button
            onClick={handleImportToken}
            className="px-3 py-1.5 bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 font-bold text-xs rounded-lg"
          >
            Load
          </button>
        </div>

        {/* Order Type Controls */}
        <div className="flex bg-olive-950 p-1 rounded-xl gap-1">
          <button
            onClick={() => setOrderType('Dine-In')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              orderType === 'Dine-In' ? 'bg-olive-800 text-gold-400 border border-gold-500/30' : 'text-olive-300'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" /> Dine-In
          </button>
          <button
            onClick={() => setOrderType('Takeaway')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              orderType === 'Takeaway' ? 'bg-olive-800 text-gold-400 border border-gold-500/30' : 'text-olive-300'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Takeaway
          </button>
        </div>

        {/* Cart List */}
        <div className="flex-1 overflow-y-auto my-3 border-y border-gold-500/10 py-2 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-10 text-olive-300 text-xs">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-20" />
              Cart is empty.<br />Click menu items to start billing.
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartKey} className="flex justify-between items-center bg-olive-800/60 p-2.5 rounded-lg text-xs">
                <div>
                  <h6 className="font-bold text-white">{item.name}</h6>
                  <span className="text-[10px] text-olive-300">{item.variant} @ ₹{item.unitPrice}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.cartKey, -1)} className="w-6 h-6 bg-olive-950 border border-gold-500/20 rounded flex items-center justify-center text-white">-</button>
                  <span className="font-bold text-white min-w-[16px] text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.cartKey, 1)} className="w-6 h-6 bg-olive-950 border border-gold-500/20 rounded flex items-center justify-center text-white">+</button>
                </div>
                <span className="font-bold text-gold-400">₹{item.totalPrice.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>

        {/* Summary & Checkout */}
        <div className="space-y-2 text-xs text-olive-300 pt-1">
          <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>GST (5%)</span><span>₹{tax.toFixed(2)}</span></div>
          <div className="flex justify-between items-center text-emerald-400">
            <span>Discount (₹)</span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value || 0))}
              className="w-16 px-1.5 py-0.5 bg-olive-950 border border-gold-500/20 rounded text-right font-bold text-emerald-400 outline-none"
            />
          </div>
          <div className="flex justify-between text-base font-extrabold text-gold-500 border-t border-dashed border-gold-500/20 pt-2">
            <span>Grand Total</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>

          {/* Payment Method */}
          <div className="pt-2">
            <span className="text-[11px] text-olive-300 block mb-1">Payment Method</span>
            <div className="flex gap-1.5">
              {[
                { id: 'Cash', icon: <Banknote className="w-3.5 h-3.5" /> },
                { id: 'UPI', icon: <QrCode className="w-3.5 h-3.5" /> },
                { id: 'Card', icon: <CreditCard className="w-3.5 h-3.5" /> },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setPaymentMode(mode.id as any)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                    paymentMode === mode.id
                      ? 'bg-gold-500/10 border border-gold-500 text-gold-400'
                      : 'bg-olive-800 border border-gold-500/20 text-olive-300'
                  }`}
                >
                  {mode.icon} {mode.id}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCheckout}
            className="w-full mt-3 py-3 bg-gradient-to-r from-gold-500 to-gold-dark text-olive-950 font-extrabold rounded-xl text-sm shadow-md shadow-gold-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <Printer className="w-4 h-4" /> COMPLETE ORDER & PRINT BILL
          </button>
        </div>
      </div>

      {/* Thermal Receipt Preview Modal */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-olive-900 border border-gold-500 rounded-2xl p-6 w-[380px] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gold-500/20">
              <h4 className="text-base font-bold text-gold-500 flex items-center gap-2">
                <Printer className="w-5 h-5" /> Printable Receipt Preview
              </h4>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-olive-300 hover:text-white p-1 rounded-lg hover:bg-olive-800 transition-colors"
                title="Close Receipt View"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#fcfbfa] text-black font-mono p-4 rounded-lg text-xs space-y-2 max-h-80 overflow-y-auto">
              <div className="text-center border-b border-dashed border-black pb-2">
                <h3 className="font-bold text-sm">KISH MANDHI</h3>
                <p className="text-[10px]">Authentic Arabian Grill & Mandhi</p>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Bill #: {receiptData.orderNumber}</span>
                <span>TOKEN #: <strong className="text-amber-700 text-sm">{receiptData.tokenNumber}</strong></span>
              </div>
              <div className="border-t border-b border-black py-1 space-y-1">
                {receiptData.items.map((i: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{i.name} ({i.variant}) x{i.quantity}</span>
                    <span>₹{i.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-1 space-y-0.5 border-b border-black pb-1">
                <div className="flex justify-between"><span>Subtotal:</span><span>₹{receiptData.subtotal.toFixed(2)}</span></div>
                {receiptData.discount > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold"><span>Discount:</span><span>-₹{receiptData.discount.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between"><span>GST (5%):</span><span>₹{receiptData.tax.toFixed(2)}</span></div>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1">
                <span>GRAND TOTAL</span>
                <span>₹{receiptData.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowReceiptModal(false)} className="flex-1 py-2 bg-olive-800 text-white rounded-lg text-xs font-bold">
                Close
              </button>
              <button onClick={() => triggerPrint(true)} className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold">
                Print KOT
              </button>
              <button onClick={() => triggerPrint(false)} className="flex-1 py-2 bg-gradient-to-r from-gold-500 to-gold-dark text-olive-950 rounded-lg text-xs font-extrabold">
                Print Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
