import React, { useState, useEffect } from 'react';
import { Search, Ticket, Trash2, Printer, ArrowRight, Utensils, ShoppingBag, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { usePosStore } from '../../store/usePosStore';
import { Dish, OrderType, PortionVariant } from '../../types';

export const TokensView: React.FC = () => {
  const { activeTokensList, addActiveToken, setActiveSection } = useAppStore();
  const { loadTokenToCart } = usePosStore();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('Dine-In');
  const [tokenCart, setTokenCart] = useState<Array<{ itemId: number; name: string; variant: PortionVariant; quantity: number }>>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewToken, setPreviewToken] = useState<{ tokenNumber: number; orderType: OrderType; items: any[] } | null>(null);

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

  const addToTokenCart = (dish: Dish, variant: PortionVariant) => {
    setTokenCart((prev) => {
      const existing = prev.find((item) => item.itemId === dish.id && item.variant === variant);
      if (existing) {
        return prev.map((item) =>
          item.itemId === dish.id && item.variant === variant
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
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

  const handleOpenPreview = () => {
    if (tokenCart.length === 0) {
      alert('Token cart is empty! Select dishes first.');
      return;
    }
    const tokenNum = Math.floor(100 + Math.random() * 900);
    const newTokenObj = {
      tokenNumber: tokenNum,
      orderType,
      items: [...tokenCart],
      timestamp: new Date().toLocaleTimeString()
    };

    addActiveToken(newTokenObj);
    setPreviewToken(newTokenObj);
    setShowPreviewModal(true);
  };

  const handleSelectActiveToken = (token: any) => {
    setPreviewToken(token);
    setShowPreviewModal(true);
  };

  const handleSendToBilling = () => {
    if (!previewToken) return;
    loadTokenToCart({ tokenNumber: previewToken.tokenNumber, orderType: previewToken.orderType, items: previewToken.items, timestamp: '' }, dishes);
    alert(`✓ Token #${previewToken.tokenNumber} order loaded into Billing POS cart!`);
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
      <div className="lg:col-span-2 flex flex-col h-full space-y-4">
        {/* Active Tokens Queue Bar */}
        {activeTokensList.length > 0 && (
          <div className="bg-olive-900 border border-gold-500/20 rounded-xl p-3">
            <span className="text-[11px] font-bold text-gold-500 uppercase tracking-wider block mb-2">
              Active Generated Tokens (Click to View / Print / Send to Billing):
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {activeTokensList.map((token) => (
                <button
                  key={token.tokenNumber}
                  onClick={() => handleSelectActiveToken(token)}
                  className="px-3 py-1.5 bg-olive-800 border border-gold-500/30 rounded-lg text-xs font-bold text-white hover:bg-gold-500 hover:text-olive-950 transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Ticket className="w-3.5 h-3.5" /> Token #{token.tokenNumber} ({token.orderType})
                </button>
              ))}
            </div>
          </div>
        )}

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

        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pr-1">
          {filteredDishes.map((dish) => (
            <div key={dish.id} className="bg-olive-900 border border-gold-500/20 rounded-xl p-4 flex flex-col justify-between hover:border-gold-500/50 transition-all">
              <h5 className="font-semibold text-sm text-white mb-2">{dish.name}</h5>
              <div className="flex gap-1.5 mt-auto">
                {dish.priceQuarter > 0 && (
                  <button
                    onClick={() => addToTokenCart(dish, 'Quarter')}
                    className="flex-1 py-1.5 px-1 bg-olive-800 border border-gold-500/20 rounded-md text-[11px] font-medium text-white hover:bg-gold-500 hover:text-olive-950 transition-all"
                  >
                    Quarter
                  </button>
                )}
                {dish.priceHalf > 0 && (
                  <button
                    onClick={() => addToTokenCart(dish, 'Half')}
                    className="flex-1 py-1.5 px-1 bg-olive-800 border border-gold-500/20 rounded-md text-[11px] font-medium text-white hover:bg-gold-500 hover:text-olive-950 transition-all"
                  >
                    Half
                  </button>
                )}
                {dish.priceFull > 0 && (
                  <button
                    onClick={() => addToTokenCart(dish, 'Full')}
                    className="flex-1 py-1.5 px-1 bg-olive-800 border border-gold-500/20 rounded-md text-[11px] font-medium text-white hover:bg-gold-500 hover:text-olive-950 transition-all"
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
      <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-5 flex flex-col h-full">
        <div className="flex justify-between items-center pb-3 border-b border-gold-500/20">
          <h3 className="text-base font-bold text-gold-500 flex items-center gap-2">
            <Ticket className="w-5 h-5" /> New Token Order
          </h3>
          <button onClick={() => setTokenCart([])} className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-medium">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>

        <div className="flex bg-olive-950 p-1 rounded-xl gap-1 my-3">
          <button
            onClick={() => setOrderType('Dine-In')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              orderType === 'Dine-In' ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md' : 'text-olive-300 hover:text-white'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" /> Dine-In
          </button>
          <button
            onClick={() => setOrderType('Takeaway')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              orderType === 'Takeaway' ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md' : 'text-olive-300 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Takeaway
          </button>
        </div>

        <div className="flex-1 overflow-y-auto my-3 border-y border-gold-500/10 py-2 space-y-2">
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-olive-900 border border-gold-500 rounded-2xl p-6 w-[360px] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gold-500/20">
              <h4 className="text-base font-bold text-gold-500 flex items-center gap-2">
                <Ticket className="w-5 h-5" /> Token Slip Preview
              </h4>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-olive-300 hover:text-white p-1 rounded-lg hover:bg-olive-800 transition-colors"
                title="Close Receipt View"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#fcfbfa] text-black font-mono p-4 rounded-lg text-xs space-y-2">
              <div className="text-center border-b-2 border-dashed border-black pb-2">
                <h3 className="font-bold text-base">KISH MANDHI</h3>
                <p className="text-[10px] font-bold">ORDER TOKEN</p>
                <div className="text-3xl font-black text-amber-700 my-1">TOKEN #{previewToken.tokenNumber}</div>
              </div>
              <div className="flex justify-between text-[11px] font-bold py-1">
                <span>TYPE: {previewToken.orderType}</span>
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="border-t border-black pt-2 space-y-1">
                {previewToken.items.map((i: any, idx: number) => (
                  <div key={idx} className="font-bold text-sm">
                    • {i.quantity}x {i.name} ({i.variant})
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowPreviewModal(false)} className="flex-1 py-2 bg-olive-800 text-white rounded-lg text-xs font-bold">
                Close
              </button>
              <button onClick={handleSendToBilling} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                Send to Billing <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={triggerTokenPrint} className="flex-1 py-2 bg-gradient-to-r from-orange-600 to-amber-700 text-white rounded-lg text-xs font-extrabold flex items-center justify-center gap-1">
                <Printer className="w-3.5 h-3.5" /> Print Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
