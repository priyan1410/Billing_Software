import React, { useState, useEffect } from 'react';
import { Search, Ticket, Trash2, Printer, ArrowRight, Utensils, ShoppingBag, X, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { usePosStore } from '../../store/usePosStore';
import { Dish, OrderType, PortionVariant } from '../../types';

export const TokensView: React.FC = () => {
  const { activeTokensList, addActiveToken, loadActiveTokens, setActiveSection } = useAppStore();
  const { loadTokenToCart } = usePosStore();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('Dine-In');
  const [tokenCart, setTokenCart] = useState<Array<{ itemId: number; name: string; variant: PortionVariant; quantity: number }>>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [previewToken, setPreviewToken] = useState<{ tokenNumber: string | number; orderType: OrderType; paymentMode: string; items: any[]; timestamp: string; date: string } | null>(null);

  useEffect(() => {
    loadDishes();
    loadActiveTokens();
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

  const addToTokenCart = (dish: Dish, variant: PortionVariant) => {
    setTokenCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.itemId === dish.id && i.variant === variant);
      if (existingIndex > -1) {
        const newCart = [...prev];
        newCart[existingIndex] = { ...newCart[existingIndex], quantity: newCart[existingIndex].quantity + 1 };
        return newCart;
      }
      return [...prev, { itemId: dish.id, name: dish.name, variant, quantity: 1 }];
    });
  };

  const updateQty = (itemId: number, variant: PortionVariant, delta: number) => {
    setTokenCart((prev) =>
      prev
        .map((item) => {
          if (item.itemId === itemId && item.variant === variant) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as any
    );
  };

  const totalQty = tokenCart.reduce((sum, i) => sum + i.quantity, 0);

  const handleOpenPreview = async () => {
    if (tokenCart.length === 0) {
      alert('Token cart is empty! Select dishes first.');
      return;
    }

    let tokenNum: string;
    if ((window as any).electronAPI?.getNextTokenSeq) {
      // Get next seq from main process — never reuses deleted numbers
      const res = await (window as any).electronAPI.getNextTokenSeq();
      tokenNum = res.tokenNumber;
    } else {
      // Fallback for browser dev mode
      const maxSeq = activeTokensList.reduce((max, t) => {
        const num = parseInt(String(t.tokenNumber).replace('KMKOT', ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      tokenNum = `KMKOT${String(maxSeq + 1).padStart(3, '0')}`;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}/${month}/${year}`;
    const newTokenObj = {
      tokenNumber: tokenNum,
      orderType,
      paymentMode,
      items: [...tokenCart],
      timestamp: timeStr,
      date: dateStr,
    };

    setPreviewToken(newTokenObj);
    setShowPreviewModal(true);
  };

  const handleSelectActiveToken = (token: any) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}/${month}/${year}`;
    setPreviewToken({ ...token, paymentMode: token.paymentMode || 'Cash', timestamp: token.timestamp || timeStr, date: token.date || dateStr });
    setShowPreviewModal(true);
  };

  const handleSaveTokenOnly = () => {
    if (!previewToken) return;
    const exists = activeTokensList.some((t) => t.tokenNumber === previewToken.tokenNumber);
    if (!exists) {
      addActiveToken(previewToken);
    }
    setShowPreviewModal(false);
    setTokenCart([]);
  };

  const handlePrintAndSaveToken = async () => {
    if (!previewToken) return;
    const exists = activeTokensList.some((t) => t.tokenNumber === previewToken.tokenNumber);
    if (!exists) {
      addActiveToken(previewToken);
    }
    await triggerTokenPrint();
    setShowPreviewModal(false);
    setTokenCart([]);
  };

  const triggerTokenPrint = async () => {
    if (!previewToken) return;
    const now = new Date().toLocaleString();
    const tokenHtml = `
      <div style="font-family:monospace; font-size:13px; width:280px; margin:0 auto; padding:10px;">
        <div style="text-align:center; border-bottom:2px dashed #000; padding-bottom:8px;">
          <h2 style="margin:0;">KISH MANDHI</h2>
          <p style="margin:2px 0; font-weight:bold;">ORDER TOKEN</p>
          <div style="font-size:2.5rem; font-weight:900; margin:5px 0;">TOKEN #${previewToken.tokenNumber}</div>
        </div>
        <div style="display:flex; justify-content:space-between; margin:8px 0; font-size:12px;">
          <span>ORDER TYPE: <strong>${previewToken.orderType}</strong></span>
          <span>${now}</span>
        </div>
        <table style="width:100%; border-collapse:collapse; border-top:1px solid #000; margin-top:8px;">
          <tbody>
            ${previewToken.items.map((i: any) => `<tr><td style="padding:5px 0; font-weight:bold; font-size:14px;">• ${i.quantity}x ${i.name} (${i.variant})</td></tr>`).join('')}
          </tbody>
        </table>
        <div style="border-top:2px dashed #000; margin-top:14px; padding-top:6px; text-align:center; font-size:11px;">
          <p style="margin:0; font-weight:bold;">NON-BILLING KITCHEN TOKEN</p>
        </div>
      </div>
    `;

    if ((window as any).electronAPI) {
      await (window as any).electronAPI.printReceipt(tokenHtml);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-110px)] select-none">
      {/* Menu Catalog Left (No Prices) */}
      <div className="lg:col-span-2 flex flex-col h-full min-h-0 space-y-4">

        <div className="space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-olive-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Mandhi, Alfaham, Beverages for Token..."
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
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeCategory === cat.id
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
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-1">
          {filteredDishes.map((dish) => (
            <div
              key={dish.id}
              className="bg-olive-900 border border-gold-500/20 rounded-xl px-4 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:border-gold-500/50 transition-all"
            >
              <h5 className="font-semibold text-sm text-white">{dish.name}</h5>
              <div className="flex gap-2 items-center shrink-0 w-full sm:w-auto">
                {dish.priceQuarter > 0 && (
                  <button
                    onClick={() => addToTokenCart(dish, 'Quarter')}
                    className="flex-1 sm:flex-initial py-1.5 px-3 bg-olive-800 border border-gold-500/20 rounded-lg text-xs font-medium text-white hover:bg-gold-500 hover:text-olive-950 transition-all whitespace-nowrap"
                  >
                    Quarter
                  </button>
                )}
                {dish.priceHalf > 0 && (
                  <button
                    onClick={() => addToTokenCart(dish, 'Half')}
                    className="flex-1 sm:flex-initial py-1.5 px-3 bg-olive-800 border border-gold-500/20 rounded-lg text-xs font-medium text-white hover:bg-gold-500 hover:text-olive-950 transition-all whitespace-nowrap"
                  >
                    Half
                  </button>
                )}
                {dish.priceFull > 0 && (
                  <button
                    onClick={() => addToTokenCart(dish, 'Full')}
                    className="flex-1 sm:flex-initial py-1.5 px-3 bg-olive-800 border border-gold-500/20 rounded-lg text-xs font-medium text-white hover:bg-gold-500 hover:text-olive-950 transition-all whitespace-nowrap"
                  >
                    Full
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Token Cart Right (No Prices / Pure Token Generator) */}
      <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-5 flex flex-col h-full min-h-0 overflow-hidden">
        <div className="flex justify-between items-center pb-3 border-b border-gold-500/20">
          <h3 className="text-base font-bold text-gold-500 flex items-center gap-2">
            <Ticket className="w-5 h-5" /> New Token Order
          </h3>
          <button onClick={() => setTokenCart([])} className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-medium">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>

        {/* Order Type Toggle */}
        <div className="flex bg-olive-950 p-1 rounded-xl gap-1 my-3">
          <button
            onClick={() => setOrderType('Dine-In')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${orderType === 'Dine-In' ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md' : 'text-olive-300 hover:text-white'
              }`}
          >
            <Utensils className="w-3.5 h-3.5" /> Dine-In
          </button>
          <button
            onClick={() => setOrderType('Takeaway')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${orderType === 'Takeaway' ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md' : 'text-olive-300 hover:text-white'
              }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Takeaway
          </button>
        </div>

        {/* Payment Mode */}
        <div className="flex bg-olive-950 p-1 rounded-xl gap-1 mb-3">
          {['Cash', 'Card', 'UPI'].map((mode) => (
            <button
              key={mode}
              onClick={() => setPaymentMode(mode)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${paymentMode === mode ? 'bg-olive-700 border border-gold-500/50 text-gold-400' : 'text-olive-400 hover:text-white'}`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto my-3 border-y border-gold-500/10 py-2 space-y-2">
          {tokenCart.length === 0 ? (
            <div className="text-center py-10 text-olive-300 text-xs">
              <Ticket className="w-8 h-8 mx-auto mb-2 opacity-20" />
              No items added.<br />Click menu items to build token.
            </div>
          ) : (
            tokenCart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-olive-800/60 p-2.5 rounded-lg text-xs">
                <div>
                  <h6 className="font-bold text-white">{item.name}</h6>
                  <span className="text-[10px] text-olive-300">{item.variant} Portion</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.itemId, item.variant, -1)} className="w-6 h-6 bg-olive-950 border border-gold-500/20 rounded flex items-center justify-center text-white">-</button>
                  <span className="font-bold text-white min-w-[16px] text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.itemId, item.variant, 1)} className="w-6 h-6 bg-olive-950 border border-gold-500/20 rounded flex items-center justify-center text-white">+</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex justify-between text-sm font-bold text-gold-400">
            <span>Total Items</span>
            <span>{totalQty} Pcs</span>
          </div>

          <button
            onClick={handleOpenPreview}
            className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-700 text-white font-extrabold rounded-xl text-sm shadow-md flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <Printer className="w-4 h-4" /> GENERATE & PRINT TOKEN
          </button>
        </div>
      </div>

      {/* Token Slip Modal Preview */}
      {showPreviewModal && previewToken && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="flex flex-col gap-3 w-[340px]">

            {/* ── KOT Slip ── */}
            <div
              style={{
                background: '#e8e0d0',
                border: '2px solid #c8b88a',
                borderRadius: '10px',
                fontFamily: "'Courier New', Courier, monospace",
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', padding: '16px 20px 12px', borderBottom: '2px solid #c8b88a' }}>
                <div style={{ color: '#c17f24', fontWeight: 900, fontSize: '11px', letterSpacing: '1px', marginBottom: '4px' }}>
                  [ SLIP 2: KITCHEN TOKEN ]
                </div>
                <div style={{ fontWeight: 900, fontSize: '22px', letterSpacing: '2px', color: '#1a1a1a', fontFamily: 'Georgia, serif' }}>
                  KISH MANDHI
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: '#333', marginTop: '4px', borderBottom: '2px solid #333', paddingBottom: '8px', display: 'inline-block' }}>
                  ORDER TOKEN &nbsp;/&nbsp; KOT
                </div>
              </div>

              {/* Token Number Box */}
              <div style={{ margin: '14px 16px', background: '#111', borderRadius: '8px', padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ color: '#aaa', fontSize: '11px', letterSpacing: '2px', fontWeight: 700, marginBottom: '4px' }}>
                  BILL / TOKEN NO
                </div>
                <div style={{ color: '#f5b731', fontSize: '36px', fontWeight: 900, letterSpacing: '2px' }}>
                  {previewToken.tokenNumber}
                </div>
              </div>

              {/* Order Details Box */}
              <div style={{ margin: '0 16px 14px', border: '1.5px solid #c8b88a', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#222', fontWeight: 700 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ letterSpacing: '1px' }}>ORDER TYPE:</span>
                  <span style={{ background: '#111', color: '#fff', fontSize: '11px', fontWeight: 900, padding: '4px 12px', borderRadius: '6px', letterSpacing: '1px' }}>
                    {previewToken.orderType.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ letterSpacing: '1px' }}>PAYMENT MODE:</span>
                  <span>{previewToken.paymentMode || 'Cash'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c17f24' }}>
                  <span style={{ letterSpacing: '1px' }}>TIME: {previewToken.timestamp}</span>
                  <span style={{ letterSpacing: '1px' }}>DATE: {previewToken.date}</span>
                </div>
              </div>

              {/* Items List */}
              <div style={{ borderTop: '2px solid #333', margin: '0 16px', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 900, letterSpacing: '2px', color: '#333', marginBottom: '8px' }}>
                  <span>ITEMS TO PREPARE</span>
                  <span>QTY</span>
                </div>
                {previewToken.items.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '9px 0',
                      borderBottom: '1px dashed #b0a080',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#1a1a1a',
                    }}
                  >
                    <span>• {item.name} ({item.variant})</span>
                    <span
                      style={{
                        background: '#111',
                        color: '#fff',
                        fontWeight: 900,
                        fontSize: '14px',
                        minWidth: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        flexShrink: 0,
                        marginLeft: '10px',
                      }}
                    >
                      {item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{ borderTop: '2px solid #333', margin: '10px 16px 0', padding: '12px 0', textAlign: 'center', fontSize: '11px', fontWeight: 900, letterSpacing: '2px', color: '#555' }}>
                *** NON-BILLING KITCHEN SLIP ***
              </div>
            </div>

            {/* ── Action Buttons ── */}
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="flex-1 py-2.5 border border-slate-600 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Close
              </button>
              <button
                onClick={handleSaveTokenOnly}
                className="flex-1 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Save Only
              </button>
              <button
                onClick={handlePrintAndSaveToken}
                className="flex-[1.3] py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl text-xs font-extrabold shadow-lg shadow-amber-500/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
