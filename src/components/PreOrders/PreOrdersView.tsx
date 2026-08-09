import React, { useState, useEffect, useMemo } from 'react';
import { CalendarClock, Plus, Search, Phone, User, Clock, Utensils, CheckCircle2, XCircle, ShoppingBag, ArrowRight, X, Trash2, Calendar, FileText } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { usePosStore } from '../../store/usePosStore';
import { Dish, PreOrder, PortionVariant, OrderType } from '../../types';

export const PreOrdersView: React.FC = () => {
  const { setActiveSection } = useAppStore();
  const { loadPreorderToCart } = usePosStore();

  const [preorders, setPreorders] = useState<PreOrder[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'All' | 'Pending' | 'Due Today' | 'Billed' | 'Cancelled'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [selectedPreorder, setSelectedPreorder] = useState<PreOrder | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch preorders & dishes
  const fetchPreorders = async () => {
    setLoading(true);
    try {
      if ((window as any).electronAPI?.getPreorders) {
        const res = await (window as any).electronAPI.getPreorders();
        if (res && res.success && Array.isArray(res.data)) {
          setPreorders(res.data);
        }
      }
    } catch (err) {
      console.error('fetchPreorders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDishes = async () => {
    try {
      if ((window as any).electronAPI?.getMenuItems) {
        const res = await (window as any).electronAPI.getMenuItems();
        if (res && res.success && Array.isArray(res.data)) {
          setDishes(res.data.map((d: any) => ({
            id: d.id,
            categoryId: d.category_id,
            name: d.name,
            priceQuarter: Number(d.price_quarter || 0),
            priceHalf: Number(d.price_half || 0),
            priceFull: Number(d.price_full || 0),
            isAvailable: d.is_available === 1
          })));
        }
      }
    } catch (err) {
      console.error('fetchDishes error:', err);
    }
  };

  useEffect(() => {
    fetchPreorders();
    fetchDishes();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredPreorders = useMemo(() => {
    return preorders.filter(po => {
      // Search
      const matchSearch =
        po.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.customerPhone.includes(searchQuery) ||
        po.preorderNumber.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      // Filter tab
      if (filterTab === 'Pending') return po.status === 'Pending';
      if (filterTab === 'Billed') return po.status === 'Billed';
      if (filterTab === 'Cancelled') return po.status === 'Cancelled';
      if (filterTab === 'Due Today') {
        const poDate = String(po.pickupDate || '').split('T')[0].split(' ')[0];
        return poDate === todayStr && po.status === 'Pending';
      }
      return true;
    });
  }, [preorders, filterTab, searchQuery, todayStr]);

  const handleGoToBilling = async (po: PreOrder) => {
    loadPreorderToCart(po, dishes);
    // Optionally mark pre-order as billed
    if ((window as any).electronAPI?.updatePreorderStatus) {
      await (window as any).electronAPI.updatePreorderStatus({ id: po.id, status: 'Billed' });
    }
    setActiveSection('billing');
  };

  const handleCancelPreorder = async (po: PreOrder) => {
    if (confirm(`Are you sure you want to cancel pre-order ${po.preorderNumber}?`)) {
      if ((window as any).electronAPI?.updatePreorderStatus) {
        await (window as any).electronAPI.updatePreorderStatus({ id: po.id, status: 'Cancelled' });
        fetchPreorders();
        setSelectedPreorder(null);
      }
    }
  };

  const handleClearPastPreorders = async () => {
    if (confirm('Are you sure you want to remove all pre-orders from previous dates? This action cannot be undone.')) {
      try {
        if ((window as any).electronAPI?.clearPastPreorders) {
          const res = await (window as any).electronAPI.clearPastPreorders();
          if (res && res.success) {
            alert(`Removed ${res.affectedRows || 0} past date pre-orders.`);
            fetchPreorders();
          }
        }
      } catch (err) {
        console.error('clearPastPreorders error:', err);
      }
    }
  };

  return (
    <div className="p-6 h-full flex flex-col space-y-6 select-none bg-olive-950 text-white overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-olive-900/80 p-5 rounded-3xl border border-gold-500/20 shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-gold-400">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wide text-white flex items-center gap-2">
              Pre-Orders & Advance Bookings
            </h1>
            <p className="text-xs text-olive-300">Schedule advance meals, manage bookings, and transfer to Billing in 1-click</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-olive-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, phone, PO#..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-olive-950 border border-gold-500/20 rounded-xl text-xs text-white placeholder-olive-400 outline-none focus:border-gold-500"
            />
          </div>

          <button
            onClick={handleClearPastPreorders}
            className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap"
            title="Remove pre-orders from previous dates"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Past Orders
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-olive-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Pre-Order
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-olive-900 p-1.5 rounded-2xl border border-gold-500/15 gap-1 shrink-0 w-fit">
        {[
          { id: 'All', label: 'All Pre-Orders' },
          { id: 'Due Today', label: 'Due Today' },
          { id: 'Pending', label: 'Pending' },
          { id: 'Billed', label: 'Billed / Fulfilled' },
          { id: 'Cancelled', label: 'Cancelled' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setFilterTab(t.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterTab === t.id ? 'bg-gold-500 text-olive-950 shadow-md' : 'text-olive-300 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Pre-Orders Cards Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-olive-400 text-sm">
            Loading pre-orders...
          </div>
        ) : filteredPreorders.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-olive-400 space-y-3 bg-olive-900/40 rounded-3xl border border-gold-500/10">
            <CalendarClock className="w-12 h-12 text-olive-500 stroke-1" />
            <p className="text-sm font-semibold">No pre-orders found for "{filterTab}"</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gold-500/20 hover:bg-gold-500/30 text-gold-400 border border-gold-500/30 rounded-xl text-xs font-bold transition-all"
            >
              + Create First Pre-Order
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPreorders.map(po => {
              const poDate = String(po.pickupDate || '').split('T')[0].split(' ')[0];
              const isDueToday = poDate === todayStr && po.status === 'Pending';
              const itemsCount = po.items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);

              return (
                <div
                  key={po.id}
                  onClick={() => setSelectedPreorder(po)}
                  className={`bg-olive-900 border ${
                    isDueToday ? 'border-amber-500/80 shadow-lg shadow-amber-500/10' : 'border-gold-500/20'
                  } rounded-3xl p-5 hover:border-gold-500/60 transition-all cursor-pointer flex flex-col justify-between space-y-4`}
                >
                  {/* Top Bar: PO Number + Status */}
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-gold-400 bg-olive-950 px-2.5 py-1 rounded-lg border border-gold-500/10">
                      {po.preorderNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isDueToday && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-bold animate-pulse">
                          DUE TODAY
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          po.status === 'Billed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : po.status === 'Cancelled'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-gold-500/20 text-gold-300 border border-gold-500/30'
                        }`}
                      >
                        {po.status}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-white text-base flex items-center gap-2 truncate">
                      <User className="w-4 h-4 text-gold-400 shrink-0" />
                      <span className="truncate">{po.customerName}</span>
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-olive-300">
                      <Phone className="w-3.5 h-3.5 text-olive-400" />
                      <span>{po.customerPhone || 'No Mobile'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold pt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pickup: {new Date(po.pickupDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                  </div>

                  {/* Items Brief */}
                  <div className="bg-olive-950/60 p-3 rounded-2xl border border-gold-500/10 text-xs space-y-1">
                    <span className="text-[10px] text-olive-400 font-bold uppercase tracking-wider block">Ordered Food Items ({itemsCount})</span>
                    <p className="text-slate-200 truncate font-mono">
                      {po.items.map(i => `${i.quantity}x ${i.name} (${i.variant})`).join(', ')}
                    </p>
                  </div>

                  {/* Footer: Advance & Actions */}
                  <div className="flex justify-between items-center pt-2 border-t border-gold-500/10">
                    <div>
                      <span className="text-[10px] text-olive-300 block">Total: <strong className="text-white">₹{po.totalAmount.toFixed(2)}</strong></span>
                      <span className="text-xs font-bold text-emerald-400">Advance: ₹{po.advancePaid.toFixed(2)}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGoToBilling(po);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-olive-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> Go to Billing
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Order Inspection Modal */}
      {selectedPreorder && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 select-none">
          <div className="bg-olive-950 border border-gold-500/30 rounded-3xl w-full max-w-2xl shadow-2xl shadow-black flex flex-col overflow-hidden text-white">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-olive-900 border-b border-gold-500/20">
              <div>
                <span className="text-xs font-mono font-bold text-gold-400 bg-olive-950 px-2 py-0.5 rounded border border-gold-500/10">
                  {selectedPreorder.preorderNumber}
                </span>
                <h2 className="text-base font-bold text-white mt-1">Pre-Order Details</h2>
              </div>
              <button onClick={() => setSelectedPreorder(null)} className="p-2 text-olive-400 hover:text-white rounded-xl hover:bg-olive-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Customer & Time Block */}
              <div className="grid grid-cols-2 gap-4 bg-olive-900/60 p-4 rounded-2xl border border-gold-500/15 text-xs">
                <div>
                  <span className="text-[10px] text-olive-400 uppercase font-bold block">Customer Name</span>
                  <span className="text-sm font-bold text-white block mt-0.5">{selectedPreorder.customerName}</span>
                  <span className="text-olive-300 block mt-1">Ph: {selectedPreorder.customerPhone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-olive-400 uppercase font-bold block">Target Pickup Time</span>
                  <span className="text-sm font-bold text-amber-300 block mt-0.5">
                    {new Date(selectedPreorder.pickupDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <span className="text-olive-300 block mt-1">Order Type: {selectedPreorder.orderType}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-olive-900 rounded-2xl border border-gold-500/20 overflow-hidden">
                <div className="px-4 py-2.5 bg-olive-950/80 border-b border-gold-500/20 text-xs font-bold text-gold-400 uppercase tracking-wider">
                  Itemized Food Order
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gold-500/10 text-olive-300 bg-olive-950/40">
                      <th className="py-2 px-4">Item</th>
                      <th className="py-2 px-3">Variant</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold-500/10">
                    {selectedPreorder.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-4 font-bold text-white">{item.name}</td>
                        <td className="py-2 px-3 text-olive-300">{item.variant}</td>
                        <td className="py-2 px-3 text-right font-mono text-amber-300 font-bold">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono text-olive-200">₹{item.unitPrice.toFixed(2)}</td>
                        <td className="py-2 px-4 text-right font-mono text-emerald-400 font-bold">₹{item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="bg-olive-900/60 p-4 rounded-2xl border border-gold-500/15 flex justify-between items-center text-xs">
                <div>
                  <span className="text-olive-300 block">Total Amount: <strong className="text-white text-sm">₹{selectedPreorder.totalAmount.toFixed(2)}</strong></span>
                  <span className="text-emerald-400 font-bold block mt-0.5">Advance Paid: ₹{selectedPreorder.advancePaid.toFixed(2)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-olive-400 uppercase font-bold block">Balance Due Upon Pickup</span>
                  <span className="text-lg font-black text-amber-400">
                    ₹{Math.max(0, selectedPreorder.totalAmount - selectedPreorder.advancePaid).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-olive-900 border-t border-gold-500/20 flex flex-wrap gap-3 justify-between items-center">
              <button
                onClick={() => handleCancelPreorder(selectedPreorder)}
                className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Cancel Pre-Order
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPreorder(null)}
                  className="px-4 py-2 bg-olive-950 hover:bg-olive-800 text-olive-300 rounded-xl text-xs font-bold transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => handleGoToBilling(selectedPreorder)}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-olive-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" /> Go to Billing for Easy Billing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Pre-Order Creation Modal */}
      {showCreateModal && (
        <CreatePreorderModal
          dishes={dishes}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchPreorders();
          }}
        />
      )}
    </div>
  );
};

// Create Pre-Order Modal Component
const CreatePreorderModal: React.FC<{ dishes: Dish[]; onClose: () => void; onSuccess: () => void }> = ({ dishes, onClose, onSuccess }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('Takeaway');
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<Array<{ itemId: number; name: string; variant: PortionVariant; unitPrice: number; quantity: number; totalPrice: number }>>([]);
  const [searchItem, setSearchItem] = useState('');

  // Default pickup date to tomorrow same time
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setPickupDate(localIso);
  }, []);

  const handleAddItem = (dish: Dish, variant: PortionVariant) => {
    let price = dish.priceFull;
    if (variant === 'Quarter') price = dish.priceQuarter;
    else if (variant === 'Half') price = dish.priceHalf;

    const existingIdx = selectedItems.findIndex(i => i.itemId === dish.id && i.variant === variant);
    if (existingIdx >= 0) {
      const updated = [...selectedItems];
      updated[existingIdx].quantity += 1;
      updated[existingIdx].totalPrice = updated[existingIdx].quantity * price;
      setSelectedItems(updated);
    } else {
      setSelectedItems([...selectedItems, {
        itemId: dish.id,
        name: dish.name,
        variant,
        unitPrice: price,
        quantity: 1,
        totalPrice: price
      }]);
    }
  };

  const handleQtyChange = (idx: number, delta: number) => {
    const updated = [...selectedItems];
    updated[idx].quantity += delta;
    if (updated[idx].quantity <= 0) {
      updated.splice(idx, 1);
    } else {
      updated[idx].totalPrice = updated[idx].quantity * updated[idx].unitPrice;
    }
    setSelectedItems(updated);
  };

  const totalAmount = selectedItems.reduce((sum, i) => sum + i.totalPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Please enter customer name.');
      return;
    }
    if (selectedItems.length === 0) {
      alert('Please select at least one food item for the pre-order.');
      return;
    }

    try {
      if ((window as any).electronAPI?.createPreorder) {
        const res = await (window as any).electronAPI.createPreorder({
          customerName,
          customerPhone,
          pickupDate,
          orderType,
          items: selectedItems,
          totalAmount,
          advancePaid: Number(advancePaid || 0),
          notes
        });
        if (res && res.success) {
          onSuccess();
        } else {
          alert('Failed to save pre-order: ' + (res?.message || 'Error'));
        }
      }
    } catch (err) {
      console.error('createPreorder error:', err);
    }
  };

  const filteredDishes = dishes.filter(d => d.name.toLowerCase().includes(searchItem.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-olive-950 border border-gold-500/30 rounded-3xl w-full max-w-4xl shadow-2xl shadow-black h-[85vh] flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-olive-900 border-b border-gold-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Create New Pre-Order</h2>
              <p className="text-xs text-olive-300">Book advance meal orders for customer pickup or delivery</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-olive-400 hover:text-white rounded-xl hover:bg-olive-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left Column: Customer & Booking Info */}
          <div className="w-full md:w-1/2 p-5 border-r border-gold-500/15 overflow-y-auto space-y-4">
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-wider">1. Customer & Pickup Details</h3>

            <div>
              <label className="text-xs text-olive-300 font-semibold block mb-1">Customer Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Kumar"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-olive-900 border border-gold-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-gold-500"
              />
            </div>

            <div>
              <label className="text-xs text-olive-300 font-semibold block mb-1">Mobile Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. 9876543210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-olive-900 border border-gold-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-gold-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-olive-300 font-semibold block mb-1">Pickup Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full bg-olive-900 border border-gold-500/20 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="text-xs text-olive-300 font-semibold block mb-1">Order Type</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as any)}
                  className="w-full bg-olive-900 border border-gold-500/20 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-gold-500"
                >
                  <option value="Takeaway">Takeaway</option>
                  <option value="Dine-In">Dine-In</option>
                  <option value="Delivery">Delivery</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-olive-300 font-semibold block mb-1">Advance Deposit (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={advancePaid || ''}
                  onChange={(e) => setAdvancePaid(Number(e.target.value || 0))}
                  className="w-full bg-olive-900 border border-gold-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="text-xs text-olive-300 font-semibold block mb-1">Order Total</label>
                <div className="bg-olive-900 border border-gold-500/20 rounded-xl px-3 py-2 text-xs font-bold text-amber-400">
                  ₹{totalAmount.toFixed(2)}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-olive-300 font-semibold block mb-1">Special Notes / Address</label>
              <textarea
                rows={2}
                placeholder="e.g. Extra spicy, packaging preferences..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-olive-900 border border-gold-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-gold-500 resize-none"
              />
            </div>
          </div>

          {/* Right Column: Dish Selection Grid & Selected Cart */}
          <div className="w-full md:w-1/2 p-5 flex flex-col min-h-0 bg-olive-950/40">
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">2. Select Food Items</h3>

            {/* Menu Item Search */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-olive-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search dish to add..."
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-olive-900 border border-gold-500/20 rounded-xl text-xs text-white placeholder-olive-400 outline-none"
              />
            </div>

            {/* Menu Dish Selection Grid */}
            <div className="h-44 overflow-y-auto mb-3 border border-gold-500/15 rounded-2xl bg-olive-900 p-2 space-y-1.5 shrink-0">
              {filteredDishes.map(d => (
                <div key={d.id} className="flex items-center justify-between p-2 bg-olive-950 rounded-xl border border-gold-500/10 text-xs">
                  <span className="font-bold text-white truncate max-w-[160px]">{d.name}</span>
                  <div className="flex gap-1">
                    {d.priceQuarter > 0 && (
                      <button
                        type="button"
                        onClick={() => handleAddItem(d, 'Quarter')}
                        className="px-2 py-1 bg-olive-800 hover:bg-gold-500 hover:text-olive-950 text-olive-200 rounded text-[10px] font-bold transition-all"
                      >
                        Qtr ₹{d.priceQuarter}
                      </button>
                    )}
                    {d.priceHalf > 0 && (
                      <button
                        type="button"
                        onClick={() => handleAddItem(d, 'Half')}
                        className="px-2 py-1 bg-olive-800 hover:bg-gold-500 hover:text-olive-950 text-olive-200 rounded text-[10px] font-bold transition-all"
                      >
                        Half ₹{d.priceHalf}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAddItem(d, 'Full')}
                      className="px-2 py-1 bg-gold-500/20 hover:bg-gold-500 text-gold-300 hover:text-olive-950 border border-gold-500/40 rounded text-[10px] font-bold transition-all"
                    >
                      Full ₹{d.priceFull}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Items List */}
            <span className="text-[10px] text-olive-400 uppercase font-bold block mb-1">Selected Cart ({selectedItems.length})</span>
            <div className="flex-1 overflow-y-auto bg-olive-900 border border-gold-500/20 rounded-2xl p-2 space-y-1.5 min-h-[120px]">
              {selectedItems.length === 0 ? (
                <div className="h-full flex items-center justify-center text-olive-500 text-xs font-semibold">
                  Click a dish variant above to add to pre-order
                </div>
              ) : (
                selectedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-olive-950 rounded-xl text-xs">
                    <div>
                      <span className="font-bold text-white block">{item.name} ({item.variant})</span>
                      <span className="text-[10px] text-olive-300">₹{item.unitPrice} x {item.quantity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-400 font-mono">₹{item.totalPrice}</span>
                      <div className="flex items-center bg-olive-800 rounded-lg p-0.5">
                        <button type="button" onClick={() => handleQtyChange(idx, -1)} className="px-2 text-olive-300 font-bold">-</button>
                        <span className="px-1 text-white font-mono">{item.quantity}</span>
                        <button type="button" onClick={() => handleQtyChange(idx, 1)} className="px-2 text-olive-300 font-bold">+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Form Actions */}
            <div className="pt-3 flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-olive-900 hover:bg-olive-800 text-olive-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gold-500 hover:bg-gold-400 text-olive-950 text-xs font-bold rounded-xl shadow-lg transition-all"
              >
                Save Pre-Order
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
