import React, { useState, useEffect } from 'react';
import { Search, Ticket, Trash2, Printer, ArrowRight, Utensils, ShoppingBag, X, CheckCircle2, Receipt, Edit3, History } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { usePosStore } from '../../store/usePosStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Dish, OrderType, PortionVariant } from '../../types';
import { formatPosTokenHtml } from '../../utils/posFormatter';

export const TokensView: React.FC = () => {
  const { activeTokensList, addActiveToken, loadActiveTokens, setActiveSection } = useAppStore();
  const { loadTokenToCart } = usePosStore();
  const { restaurantDetails } = useAuthStore();

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
  const [orderType, setOrderType] = useState<OrderType>('Dine-In');
  const [tokenCart, setTokenCart] = useState<Array<{ itemId: number; name: string; variant: PortionVariant; quantity: number }>>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [selectedTable, setSelectedTable] = useState<string>('Table 1');
  const [customTable, setCustomTable] = useState<string>('');
  const [isCustomTableMode, setIsCustomTableMode] = useState<boolean>(false);
  const [showTableDropdown, setShowTableDropdown] = useState<boolean>(false);
  const [editingTokenNumber, setEditingTokenNumber] = useState<string | number | null>(null);
  const [showRecentTokensDropdown, setShowRecentTokensDropdown] = useState<boolean>(false);
  const [previewToken, setPreviewToken] = useState<{ tokenNumber: string | number; orderType: OrderType; tableNo?: string; paymentMode: string; items: any[]; timestamp: string; date: string } | null>(null);

  useEffect(() => {
    loadCategories();
    loadDishes();
    loadActiveTokens();
  }, [activeCategory]);

  const loadCategories = async () => {
    try {
      if ((window as any).electronAPI?.getCategories) {
        const res = await (window as any).electronAPI.getCategories();
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const dynamicCats = res.data.map((c: any) => ({
            id: String(c.id),
            label: c.name
          }));
          setCategories([{ id: 'all', label: 'All Items' }, ...dynamicCats]);
        }
      }
    } catch (err) {
      console.error('loadCategories error:', err);
    }
  };

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


  const filteredDishes = dishes.filter((d: Dish) => {
    const matchesCat = activeCategory === 'all' || String(d.categoryId) === String(activeCategory);
    return matchesCat && d.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const addToTokenCart = (dish: Dish, variant: PortionVariant) => {
    setTokenCart((prev: any[]) => {
      const existingIndex = prev.findIndex((i: any) => i.itemId === dish.id && i.variant === variant);
      if (existingIndex > -1) {
        const newCart = [...prev];
        newCart[existingIndex] = { ...newCart[existingIndex], quantity: newCart[existingIndex].quantity + 1 };
        return newCart;
      }
      return [...prev, { itemId: dish.id, name: dish.name, variant, quantity: 1 }];
    });
  };

  const updateQty = (itemId: number, variant: PortionVariant, delta: number) => {
    setTokenCart((prev: any[]) =>
      prev
        .map((item: any) => {
          if (item.itemId === itemId && item.variant === variant) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as any
    );
  };

  const totalQty = tokenCart.reduce((sum: number, i: any) => sum + i.quantity, 0);

  const handleOpenPreview = async () => {
    if (tokenCart.length === 0) {
      alert('Token cart is empty! Select dishes first.');
      return;
    }

    let tokenNum: string;
    if (editingTokenNumber) {
      tokenNum = String(editingTokenNumber);
    } else if ((window as any).electronAPI?.getNextTokenSeq) {
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
    const activeTableNo = orderType === 'Dine-In' ? (isCustomTableMode ? (customTable || 'Table 1') : (selectedTable || 'Table 1')) : '';
    const newTokenObj = {
      tokenNumber: tokenNum,
      orderType,
      tableNo: activeTableNo,
      paymentMode,
      items: [...tokenCart],
      timestamp: timeStr,
      date: dateStr,
    };

    setPreviewToken(newTokenObj);
    setShowPreviewModal(true);
  };

  const handleSelectTokenToEdit = (token: any) => {
    setEditingTokenNumber(token.tokenNumber);
    setOrderType(token.orderType || 'Dine-In');
    if (token.tableNo && token.tableNo !== 'N/A' && token.tableNo !== 'TA') {
      setSelectedTable(token.tableNo);
      setIsCustomTableMode(false);
    }
    setTokenCart(token.items ? [...token.items] : []);
    setShowRecentTokensDropdown(false);
  };

  const cancelEditToken = () => {
    setEditingTokenNumber(null);
    setTokenCart([]);
  };

  const handleSaveTokenOnly = () => {
    if (!previewToken) return;
    addActiveToken(previewToken);
    setShowPreviewModal(false);
    setTokenCart([]);
    setEditingTokenNumber(null);
  };

  const handlePrintAndSaveToken = async () => {
    if (!previewToken) return;
    addActiveToken(previewToken);
    await triggerTokenPrint();
    setShowPreviewModal(false);
    setTokenCart([]);
    setEditingTokenNumber(null);
  };

  const triggerTokenPrint = async () => {
    if (!previewToken) return;
    const tokenHtml = formatPosTokenHtml(previewToken, restaurantDetails);

    if ((window as any).electronAPI?.printReceipt) {
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
            {categories.map((cat: { id: string; label: string }) => (
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
          {filteredDishes.map((dish: Dish) => (
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
            <Ticket className="w-5 h-5" /> {editingTokenNumber ? `Token #${editingTokenNumber}` : 'New Token Order'}
          </h3>
          <div className="flex items-center gap-2">
            {/* Edit Token Dropdown */}
            <div 
              className="relative flex-shrink-0"
              onMouseEnter={() => setShowRecentTokensDropdown(true)}
              onMouseLeave={() => setShowRecentTokensDropdown(false)}
            >
              <button 
                onClick={() => setShowRecentTokensDropdown(!showRecentTokensDropdown)}
                className="px-2.5 py-1 bg-olive-950 border border-gold-500/30 text-gold-400 hover:text-gold-300 font-bold text-xs rounded-xl flex items-center gap-1 hover:border-gold-500 transition-colors whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Token ▾</span>
              </button>

              {showRecentTokensDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-slate-900 border border-gold-500/30 rounded-2xl shadow-2xl z-50 p-2 text-xs space-y-1">
                  <div className="flex justify-between items-center px-2 py-1.5 border-b border-slate-800 text-gold-400 font-bold text-[11px] uppercase tracking-wider">
                    <span>Active Pending Tokens</span>
                    <History className="w-3.5 h-3.5 text-gold-400" />
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5" style={{ scrollbarWidth: 'thin' }}>
                    {activeTokensList.length === 0 ? (
                      <div className="text-center py-4 text-slate-400">No active tokens found</div>
                    ) : (
                      activeTokensList.map((t) => (
                        <button
                          key={t.tokenNumber}
                          onClick={() => handleSelectTokenToEdit(t)}
                          className="w-full text-left p-2 rounded-xl bg-slate-800/80 hover:bg-gold-500/20 border border-slate-700/60 hover:border-gold-500/40 transition-all flex items-center justify-between group"
                        >
                          <div>
                            <div className="font-bold text-white group-hover:text-gold-300 flex items-center gap-1.5">
                              <span>Token #{t.tokenNumber}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-olive-300 font-normal">
                                {t.orderType || 'Dine-In'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {t.tableNo && t.tableNo !== 'N/A' && t.tableNo !== 'TA' ? `Table: ${t.tableNo}` : t.orderType === 'Takeaway' ? 'Takeaway (TA)' : ''}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-amber-400 font-semibold group-hover:underline">Edit ✎</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={cancelEditToken} className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-medium">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </div>

        {/* Editing Token Banner */}
        {editingTokenNumber && (
          <div className="mt-3 bg-amber-500/15 border border-amber-500/40 rounded-xl p-2.5 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Edit3 className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>Editing Token: <span className="text-white underline font-mono">#{editingTokenNumber}</span></span>
            </div>
            <button
              onClick={cancelEditToken}
              className="text-amber-400 hover:text-white p-1 rounded-lg hover:bg-amber-500/20 transition-colors"
              title="Cancel editing token"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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

        {/* Table Selection Dropdown (For Dine-In) */}
        {orderType === 'Dine-In' && (
          <div className="relative mb-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowTableDropdown(!showTableDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 bg-olive-950/80 border border-gold-500/20 hover:border-gold-500/40 rounded-xl text-xs transition-all group"
            >
              <span className="text-olive-300 font-semibold flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-gold-400" />
                <span>Table Number:</span>
              </span>
              <span className="flex items-center gap-1.5 font-extrabold text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/30 group-hover:bg-amber-500/25">
                <span>{isCustomTableMode ? (customTable || 'Custom Table') : selectedTable}</span>
                <span className="text-[10px] text-gold-400">▾</span>
              </span>
            </button>

            {/* Dropdown Menu (Floating list like Recent Bills) */}
            {showTableDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-full bg-olive-950 border border-gold-500/30 rounded-2xl shadow-2xl z-50 p-2.5 text-xs space-y-2">
                <div className="flex justify-between items-center px-1 pb-1 border-b border-gold-500/15 text-gold-400 font-bold text-[11px] uppercase tracking-wider">
                  <span>Select Table Number</span>
                  <span className="text-[10px] text-olive-400 font-normal">Click to set</span>
                </div>

                <div className="max-h-52 overflow-y-auto grid grid-cols-3 gap-1.5 pr-0.5" style={{ scrollbarWidth: 'thin' }}>
                  {Array.from({ length: Math.max(1, restaurantDetails?.totalTables || 10) }, (_, i) => `Table ${i + 1}`).map((tbl) => (
                    <button
                      key={tbl}
                      type="button"
                      onClick={() => {
                        setSelectedTable(tbl);
                        setIsCustomTableMode(false);
                        setShowTableDropdown(false);
                      }}
                      className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all text-center ${
                        !isCustomTableMode && selectedTable === tbl
                          ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-olive-950 shadow-md font-extrabold'
                          : 'bg-olive-900 border border-gold-500/20 text-white hover:border-gold-500/50 hover:bg-olive-800'
                      }`}
                    >
                      {tbl.replace('Table ', 'T-')}
                    </button>
                  ))}
                </div>

                {/* Custom Table Input in Dropdown */}
                <div className="pt-1.5 border-t border-gold-500/15">
                  <input
                    type="text"
                    placeholder="Custom Table No (e.g. T-15)..."
                    value={customTable}
                    onChange={(e) => {
                      setCustomTable(e.target.value);
                      setIsCustomTableMode(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customTable.trim()) {
                        setSelectedTable(customTable.trim());
                        setIsCustomTableMode(true);
                        setShowTableDropdown(false);
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-olive-900 border border-gold-500/30 rounded-lg text-white text-xs placeholder-olive-400 focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}



        <div className="flex-1 min-h-0 overflow-y-auto my-3 border-y border-gold-500/10 py-2 space-y-2">
          {tokenCart.length === 0 ? (
            <div className="text-center py-10 text-olive-300 text-xs">
              <Ticket className="w-8 h-8 mx-auto mb-2 opacity-20" />
              No items added.<br />Click menu items to build token.
            </div>
          ) : (
            tokenCart.map((item: any, idx: number) => (
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
          <div className="flex flex-col gap-3 w-full max-w-[370px] max-h-[92vh]">

            {/* Modal Header */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-3 px-4 flex items-center justify-between flex-shrink-0 text-white">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs uppercase tracking-wider">Kitchen Token Slip Preview</span>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Thermal Paper Slip Preview ── */}
            <div className="flex-1 overflow-y-auto bg-slate-950/80 p-4 rounded-2xl flex justify-center max-h-[72vh]">
              <div className="w-full bg-white text-black font-mono shadow-2xl p-5 rounded-sm select-text border border-slate-300 text-left h-fit text-[11px] leading-relaxed">

                {/* Store Header */}
                <div className="text-center">
                  <h2 className="text-lg font-extrabold tracking-tight uppercase leading-tight font-sans text-black">
                    {restaurantDetails?.companyName || 'KISH MANDHI'}
                  </h2>
                  {restaurantDetails?.tagline && <p className="text-[10px] text-slate-700 font-semibold mt-0.5">{restaurantDetails.tagline}</p>}
                  {restaurantDetails?.address && <p className="text-[10px] text-slate-800 font-medium mt-0.5">{restaurantDetails.address}</p>}
                </div>

                {/* Dashed Line */}
                <div className="border-b border-dashed border-black my-2"></div>

                <div className="text-center font-bold text-xs tracking-wider uppercase mb-2">
                  *** KITCHEN ORDER TOKEN ***
                </div>

                {/* Token Metadata */}
                <div className="text-[10.5px] space-y-1 mb-2">
                  <div className="flex justify-between">
                    <span>Token No &nbsp;: <strong>{previewToken.tokenNumber}</strong></span>
                    <span>Date : {previewToken.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Order Type: <strong>{previewToken.orderType.toUpperCase()}</strong></span>
                    <span>Time : {previewToken.timestamp}</span>
                  </div>
                  {previewToken.tableNo && (
                    <div className="flex justify-between font-bold text-black text-[11px]">
                      <span>Table No &nbsp;: <strong>{previewToken.tableNo}</strong></span>
                    </div>
                  )}
                </div>

                {/* Table Header */}
                <div className="border-t-2 border-b-2 border-black py-1 my-2 flex justify-between font-bold text-[11px]">
                  <span>Item Description</span>
                  <span>Qty</span>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 py-1">
                  {(previewToken.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start border-b border-dashed border-slate-300 pb-1 font-semibold text-[11px]">
                      <span className="pr-2">• {item.name} ({item.variant})</span>
                      <span className="font-extrabold shrink-0 text-xs">[ {item.quantity} ]</span>
                    </div>
                  ))}
                </div>

                {/* Dashed Line */}
                <div className="border-b border-dashed border-black my-2"></div>

                <div className="flex justify-between font-extrabold text-xs">
                  <span>Total Items</span>
                  <span>{(previewToken.items || []).reduce((s: number, i: any) => s + Number(i.quantity || 1), 0)} Pcs</span>
                </div>

                <div className="border-b border-dashed border-black my-2"></div>

                {/* Footer Note */}
                <div className="text-center font-bold text-[9.5px] tracking-wider uppercase mt-3 text-slate-700">
                  *** NON-BILLING KITCHEN SLIP ***
                </div>
              </div>
            </div>

            {/* ── Action Buttons ── */}
            <div className="flex gap-2.5 flex-shrink-0">
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
