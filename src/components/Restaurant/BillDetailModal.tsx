import React, { useState, useEffect } from 'react';
import { X, Printer, Receipt, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface BillDetailModalProps {
  order: any;
  onClose: () => void;
}

export const BillDetailModal: React.FC<BillDetailModalProps> = ({ order, onClose }) => {
  const { restaurantDetails } = useAuthStore();
  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  const curr = restaurantDetails?.currency || '₹';
  const taxRate = restaurantDetails?.taxRate ?? 5;

  const billNumber = order.orderNumber || order.order_number || `KMIV-${String(order.id).padStart(3, '0')}`;
  const orderType = order.orderType || order.order_type || 'Dine-In';
  const paymentMode = order.paymentMode || order.payment_mode || 'Cash';
  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discountAmount || order.discount_amount || order.discount || 0);
  const taxAmt = Number(order.taxAmount || order.tax_amount || 0);
  const grandTotal = Number(order.grandTotal || order.grand_total || 0);

  const rawDate = order.createdAt || order.created_at || order.orderDate || new Date().toISOString();
  const orderDateObj = new Date(rawDate);
  const formattedDate = orderDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formattedTime = orderDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    fetchItems();
  }, [order]);

  const fetchItems = async () => {
    setLoadingItems(true);
    try {
      if (order && Array.isArray(order.items) && order.items.length > 0) {
        setItems(order.items);
      } else if ((window as any).electronAPI?.getOrderItems) {
        const res = await (window as any).electronAPI.getOrderItems(order.id || billNumber);
        if (res && res.success && Array.isArray(res.data)) {
          setItems(res.data);
        }
      }
    } catch (err) {
      console.error('Error fetching order items:', err);
    } finally {
      setLoadingItems(false);
    }
  };


  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const rName = String(restaurantDetails?.companyName || 'KISH MANDHI');
      const rTagline = String(restaurantDetails?.tagline || '');
      const rAddr = String(restaurantDetails?.address || '');
      const rawPhone = String(restaurantDetails?.phone || '');
      const rPhone = rawPhone ? (rawPhone.startsWith('Phone:') ? rawPhone : `Phone: ${rawPhone}`) : '';
      const rawGst = String(restaurantDetails?.gstNumber || restaurantDetails?.gstNo || '');
      const gstVal = rawGst.replace(/^GSTIN:\s*/i, '').trim();
      const rawFssai = String(restaurantDetails?.fssaiNumber || restaurantDetails?.fssaiNo || '');
      const fssaiVal = rawFssai.replace(/^FSSAI:\s*/i, '').trim();

      let rGstFssaiLine = '';
      if (gstVal && fssaiVal) {
        rGstFssaiLine = `GSTIN: ${gstVal}  |  FSSAI: ${fssaiVal}`;
      } else if (gstVal) {
        rGstFssaiLine = `GSTIN: ${gstVal}`;
      } else if (fssaiVal) {
        rGstFssaiLine = `FSSAI: ${fssaiVal}`;
      }

      const cgstRate = (taxRate / 2).toFixed(1);
      const sgstRate = (taxRate / 2).toFixed(1);
      const roundOffVal = Number(order.roundOff ?? order.round_off ?? 0);

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

      const html = `<!doctype html><html><head>${receiptStyles}</head><body><div class="receipt">
        <div class="center bold" style="font-size: 16px; text-transform: uppercase;">${rName}</div>
        ${rTagline ? `<div class="center" style="font-size: 10.5px; font-weight: 600;">${rTagline}</div>` : ''}
        ${rAddr ? `<div class="center" style="font-size: 10.5px;">${rAddr}</div>` : ''}
        ${rPhone ? `<div class="center" style="font-size: 10.5px;">${rPhone}</div>` : ''}
        ${rGstFssaiLine ? `<div class="center" style="font-size: 10.5px;">${rGstFssaiLine}</div>` : ''}
        
        <div class="divider"></div>
        <div class="center bold" style="font-size: 11px; letter-spacing: 1px;">*** TAX INVOICE ***</div>
        
        <div style="font-size: 10.5px; margin: 4px 0;">
          <div style="display: flex; justify-content: space-between;">
            <span>Bill No &nbsp;: ${billNumber}</span>
            <span>Date &nbsp;: ${formattedDate}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Time &nbsp;&nbsp;&nbsp;: ${formattedTime}</span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="row table-header" style="font-size: 10.5px;">
          <span class="col-item">Item</span>
          <span class="col-qty">Qty</span>
          <span class="col-rate">Rate (${curr})</span>
          <span class="col-amt">Amount (${curr})</span>
        </div>
        
        ${(items || []).map((i: any) => {
        const label = `${i.name || i.dishName}${i.variant ? ` (${i.variant})` : ''}`;
        const uNum = Number(i.unitPrice || i.price || 0);
        const tNum = Number(i.totalPrice || (uNum * (i.quantity || 1)));
        return `<div class="row" style="font-size: 10.5px;"><span class="col-item">${label}</span><span class="col-qty">${i.quantity || 1}</span><span class="col-rate">${uNum.toFixed(2)}</span><span class="col-amt">${tNum.toFixed(2)}</span></div>`;
      }).join('')}
        
        <div class="divider"></div>
        
        <div style="font-size: 10.5px;">
          <div class="row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
          ${discount > 0 ? `<div class="row"><span>Discount</span><span>-${discount.toFixed(2)}</span></div>` : ''}
          <div style="display: flex; justify-content: flex-end; margin: 3px 0;"><div style="border-top: 1px dashed #000; width: 80px;"></div></div>
          <div class="row"><span>Taxable Amount</span><span>${Math.max(0, subtotal - discount).toFixed(2)}</span></div>
          <div class="row"><span>CGST (${cgstRate}%)</span><span>${(taxAmt / 2).toFixed(2)}</span></div>
          <div class="row"><span>SGST (${sgstRate}%)</span><span>${(taxAmt / 2).toFixed(2)}</span></div>
          ${roundOffVal !== 0 ? `<div class="row"><span>Round Off</span><span>${roundOffVal.toFixed(2)}</span></div>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="row double-divider bold" style="font-size: 15px;">
          <span>GRAND TOTAL</span>
          <span>${curr} ${grandTotal.toFixed(2)}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="center" style="margin-top: 8px;">
          <div style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-weight: bold; font-size: 14px;">
            Thank You!<br/>Visit Again.
          </div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin: 6px 0;">
            <span style="border-bottom: 1px solid #000; width: 35px; display: inline-block;"></span>
            <span style="font-size: 9px;">★</span>
            <span style="border-bottom: 1px solid #000; width: 35px; display: inline-block;"></span>
          </div>
          <div style="font-size: 9.5px; line-height: 1.3;">
            ${restaurantDetails?.footerNote || 'Goods once sold cannot be returned.'}
          </div>
        </div>
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

  const rawGst = String(restaurantDetails?.gstNumber || restaurantDetails?.gstNo || '');
  const gstVal = rawGst.replace(/^GSTIN:\s*/i, '').trim();
  const rawFssai = String(restaurantDetails?.fssaiNumber || restaurantDetails?.fssaiNo || '');
  const fssaiVal = rawFssai.replace(/^FSSAI:\s*/i, '').trim();
  let rGstFssaiLine = '';
  if (gstVal && fssaiVal) {
    rGstFssaiLine = `GSTIN: ${gstVal}  |  FSSAI: ${fssaiVal}`;
  } else if (gstVal) {
    rGstFssaiLine = `GSTIN: ${gstVal}`;
  } else if (fssaiVal) {
    rGstFssaiLine = `FSSAI: ${fssaiVal}`;
  }
  const roundOffVal = Number(order.roundOff ?? order.round_off ?? 0);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-slate-900 border border-gold-500/30 rounded-3xl w-full max-w-2xl shadow-2xl shadow-black max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-wide">Bill Statement #{billNumber}</h3>
              <p className="text-xs text-slate-400">Date: {formattedDate} at {formattedTime} • Mode: {paymentMode}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {/* Paper Bill Visual */}
          <div className="flex justify-center">
            <div className="w-full max-w-[340px] bg-white text-black font-mono shadow-2xl p-5 relative rounded-t-sm border border-slate-300 text-left text-[11px]">
              <div className="text-center">
                <h2 className="text-base font-extrabold tracking-tight uppercase leading-tight font-sans text-black">
                  {restaurantDetails?.companyName || 'KISH MANDHI'}
                </h2>
                {restaurantDetails?.tagline && <p className="text-[10.5px] font-semibold text-slate-900">{restaurantDetails.tagline}</p>}
                {restaurantDetails?.address && <p className="text-[10px] text-slate-800">{restaurantDetails.address}</p>}
                {restaurantDetails?.phone && <p className="text-[10px] text-slate-800">{restaurantDetails.phone.startsWith('Phone:') ? restaurantDetails.phone : `Phone: ${restaurantDetails.phone}`}</p>}
                {rGstFssaiLine && <p className="text-[10px] text-slate-800">{rGstFssaiLine}</p>}
              </div>

              <div className="border-b border-dashed border-black my-2"></div>
              <div className="text-center font-bold text-xs tracking-wider uppercase mb-1">*** TAX INVOICE ***</div>

              <div className="text-[10px] leading-tight my-2 space-y-0.5">
                <div className="flex justify-between">
                  <span>Bill No &nbsp;: {billNumber}</span>
                  <span>Date &nbsp;: {formattedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time &nbsp;&nbsp;&nbsp;: {formattedTime}</span>
                </div>
              </div>

              <div className="border-b border-dashed border-black my-2"></div>

              {/* Items Table */}
              <div className="border-y border-black py-1 my-1 grid grid-cols-[1.4fr_0.4fr_0.8fr_0.8fr] gap-1 text-[10px] font-bold">
                <span>Item</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Rate ({curr})</span>
                <span className="text-right">Amount ({curr})</span>
              </div>

              <div className="space-y-1 my-1 text-[10px]">
                {loadingItems ? (
                  <div className="text-center py-2 text-slate-500">Loading items...</div>
                ) : items.length === 0 ? (
                  <div className="text-center py-2 text-slate-500">No items recorded</div>
                ) : (
                  items.map((item, idx) => {
                    const uNum = Number(item.unitPrice || item.price || 0);
                    const tNum = Number(item.totalPrice || (uNum * (item.quantity || 1)));
                    return (
                      <div key={idx} className="grid grid-cols-[1.4fr_0.4fr_0.8fr_0.8fr] gap-1 leading-tight">
                        <span className="font-semibold break-words">{item.name || item.dishName}{item.variant ? ` (${item.variant})` : ''}</span>
                        <span className="text-center">{item.quantity || 1}</span>
                        <span className="text-right">{uNum.toFixed(2)}</span>
                        <span className="text-right font-semibold">{tNum.toFixed(2)}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-b border-dashed border-black my-2"></div>

              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
                {discount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>-{discount.toFixed(2)}</span></div>}
                <div className="flex justify-between"><span>Taxable Amount</span><span>{Math.max(0, subtotal - discount).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>CGST ({(taxRate / 2).toFixed(1)}%)</span><span>{(taxAmt / 2).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>SGST ({(taxRate / 2).toFixed(1)}%)</span><span>{(taxAmt / 2).toFixed(2)}</span></div>
                {roundOffVal !== 0 && <div className="flex justify-between"><span>Round Off</span><span>{roundOffVal.toFixed(2)}</span></div>}
              </div>

              <div className="border-y-2 border-double border-black py-1.5 my-2 flex justify-between items-center text-xs font-black">
                <span>GRAND TOTAL</span>
                <span>{curr} {grandTotal.toFixed(2)}</span>
              </div>

              <div className="text-center mt-3 pt-1">
                <div className="font-serif italic font-bold text-sm text-black leading-snug">
                  Thank You!<br />Visit Again.
                </div>
                <div className="flex items-center justify-center gap-2 my-2">
                  <div className="h-[1px] bg-black w-10"></div>
                  <span className="text-[9px]">★</span>
                  <div className="h-[1px] bg-black w-10"></div>
                </div>
                <div className="text-[10px] text-slate-800 leading-tight">
                  {restaurantDetails?.footerNote || 'Goods once sold cannot be returned.'}
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Footer Actions: Print and Close */}
        <div className="flex gap-3 p-4 border-t border-slate-800 bg-slate-950 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-1 py-3 bg-gradient-to-r from-gold-500 to-gold-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-lg shadow-gold-500/20 hover:scale-[1.01] transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Printer className="w-4 h-4" /> {isPrinting ? 'Printing...' : 'Print Bill'}
          </button>
        </div>
      </div>
    </div>
  );
};
