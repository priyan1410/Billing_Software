/**
 * Utility for formatting POS Thermal Receipt printer plain text receipts.
 * Converted to pure monospaced POS text layout for 100% exact alignment on thermal printers.
 * Column width default set to 32 characters to prevent right-edge text clipping on 58mm & 80mm printers.
 */

export function padLine(left: string, right: string, width = 32): string {
  const leftStr = String(left || '');
  const rightStr = String(right || '');
  const spaceNeeded = width - leftStr.length - rightStr.length;
  if (spaceNeeded > 0) {
    return leftStr + ' '.repeat(spaceNeeded) + rightStr;
  }
  return leftStr + ' ' + rightStr;
}

export function centerLine(text: string, width = 32): string {
  const str = String(text || '').trim();
  if (str.length >= width) return str.slice(0, width);
  const leftPadding = Math.floor((width - str.length) / 2);
  return ' '.repeat(leftPadding) + str;
}

export function divider(char = '-', width = 32): string {
  return char.repeat(width);
}

export function wrapText(text: string, maxWidth: number): string[] {
  const str = String(text || '').trim();
  if (!str) return [];
  if (str.length <= maxWidth) return [str];

  const words = str.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word.length > maxWidth ? word.slice(0, maxWidth) : word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Returns plain text string for Kitchen Order Token (KOT).
 */
export function getPosTokenTextBody(
  data: {
    tokenNumber: string | number;
    orderType: string;
    paymentMode?: string;
    items: Array<{ name: string; variant?: string; quantity: number | string }>;
    timestamp?: string;
    date?: string;
  },
  restaurantDetails?: any,
  width = 32
): string {
  const rName = (restaurantDetails?.companyName || 'KISH MANDHI').toUpperCase();
  const rTagline = restaurantDetails?.tagline || 'Arabic Grill & Fine Dining';
  const tokenNo = String(data.tokenNumber || 'KMKOT001');
  const orderType = String(data.orderType || 'Dine-In').toUpperCase();
  const dateStr = data.date || new Date().toLocaleDateString('en-GB');
  const timeStr = data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  const lines: string[] = [];

  lines.push(divider('=', width));
  lines.push(centerLine(rName, width));
  if (rTagline) lines.push(centerLine(rTagline, width));
  lines.push(divider('-', width));
  lines.push(centerLine('*** KITCHEN ORDER TOKEN ***', width));
  lines.push(divider('-', width));

  const rawType = String(data.orderType || 'Dine-In');
  const tbl = data.tableNo || (data as any).tableNumber || '';
  let formattedType = 'Takeaway';
  if (rawType.toLowerCase().includes('dine')) {
    formattedType = (tbl && tbl !== 'N/A' && tbl !== 'TA') ? `DI-${tbl}` : 'DI-Dine-In';
  } else {
    formattedType = 'Takeaway';
  }

  lines.push(`Token No   : ${tokenNo}`);
  lines.push(`Order Type : ${formattedType}`);
  lines.push(padLine(`Date: ${dateStr}`, `Time: ${timeStr}`, width));
  lines.push(divider('-', width));

  lines.push(padLine('ITEM DESCRIPTION', 'QTY', width));
  lines.push(divider('-', width));

  let totalQty = 0;
    (data.items || []).forEach((item: any) => {
      const qtyNum = Number(item.quantity || 1);
      totalQty += qtyNum;
      const qtyStr = `[ ${qtyNum} ]`;
      const itemTitle = `• ${item.name}${item.variant ? ` (${item.variant})` : ''}`;

      const maxTitleLen = width - qtyStr.length - 1;
      const itemLines = wrapText(itemTitle, maxTitleLen);
      if (itemLines.length > 0) {
        lines.push(padLine(itemLines[0], qtyStr, width));
        for (let i = 1; i < itemLines.length; i++) {
          lines.push('  ' + itemLines[i]);
        }
      }

      if (item.comboItems && Array.isArray(item.comboItems) && item.comboItems.length > 0) {
        item.comboItems.forEach((sub: string) => {
          if (sub && sub.trim()) {
            lines.push(`  + ${sub.trim()}`);
          }
        });
      }
    });

  lines.push(divider('-', width));
  lines.push(padLine('Total Items', `${totalQty} Pcs`, width));
  lines.push(divider('-', width));
  lines.push(centerLine('*** NON-BILLING KITCHEN SLIP ***', width));
  lines.push(divider('=', width));
  // 5 feed lines at bottom for physical cutter clearance
  lines.push('\n\n\n\n\n');

  return lines.join('\n');
}

/**
 * Returns plain text string for Tax Invoice.
 */
export function getPosInvoiceTextBody(
  data: {
    orderNumber?: string;
    tokenNumber?: string | number;
    orderType?: string;
    paymentMode?: string;
    items: Array<{ name: string; variant?: string; quantity: number | string; unitPrice?: number; price?: number; totalPrice?: number }>;
    subtotal: number;
    discount?: number;
    tax?: number;
    grandTotal: number;
    roundOff?: number;
    orderDate?: string;
    customerName?: string;
    customerPhone?: string;
    createdAt?: string;
  },
  restaurantDetails?: any,
  width = 32
): string {
  const rName = (restaurantDetails?.companyName || 'KISH MANDHI').toUpperCase();
  const rTagline = restaurantDetails?.tagline || 'Arabic Grill & Fine Dining';
  const rAddr = restaurantDetails?.address || '';
  const rPhone = restaurantDetails?.phone || '';
  const rawGst = String(restaurantDetails?.gstNumber || restaurantDetails?.gstNo || '').trim();
  const gstVal = rawGst.replace(/^GSTIN:\s*/i, '').trim();
  const rawFssai = String(restaurantDetails?.fssaiNumber || restaurantDetails?.fssaiNo || '').trim();
  const fssaiVal = rawFssai.replace(/^FSSAI:\s*/i, '').trim();

  const billNo = data.orderNumber || 'KMIV-001';

  const now = data.createdAt ? new Date(data.createdAt) : new Date();
  const dateStr = !isNaN(now.getTime())
    ? `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
    : (data.orderDate || new Date().toLocaleDateString('en-GB'));
  const timeStr = !isNaN(now.getTime())
    ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    : '';

  const lines: string[] = [];

  lines.push(divider('=', width));
  lines.push(centerLine(rName, width));
  if (rTagline) lines.push(centerLine(rTagline, width));
  if (rAddr) wrapText(rAddr, width).forEach((l) => lines.push(centerLine(l, width)));
  if (rPhone) lines.push(centerLine(`Ph: ${rPhone}`, width));

  if (gstVal) lines.push(centerLine(`GSTIN: ${gstVal}`, width));
  if (fssaiVal) lines.push(centerLine(`FSSAI: ${fssaiVal}`, width));

  lines.push(divider('-', width));
  lines.push(centerLine('*** TAX INVOICE ***', width));
  lines.push(divider('-', width));

  lines.push(`Bill No : ${billNo}`);
  lines.push(padLine(`Date: ${dateStr}`, `Time: ${timeStr}`, width));
  const rawType = String(data.orderType || 'Dine-In');
  const tblVal = (data as any).tableNumber || (data as any).table_number || (data as any).tableNo;
  let formattedType = 'Takeaway';
  if (rawType.toLowerCase().includes('dine')) {
    formattedType = (tblVal && tblVal !== 'N/A' && tblVal !== 'TA') ? `DI-${tblVal}` : 'DI-Dine-In';
  } else {
    formattedType = 'Takeaway';
  }
  lines.push(padLine(`Type: ${formattedType}`, `Pay: ${data.paymentMode || 'Cash'}`, width));

  const custName = String(data.customerName || '').trim();
  const isWalkIn = !custName || /^walk[-_\s]*in$/i.test(custName);
  const custPhone = String(data.customerPhone || '').trim();

  if (!isWalkIn || custPhone) {
    lines.push(divider('-', width));
    if (!isWalkIn) lines.push(`Cust : ${custName}`);
    if (custPhone) lines.push(`Phone: ${custPhone}`);
  }

  lines.push(divider('-', width));
  // Column header for 32 columns width: ITEM (14), QTY (3), RATE (6), AMOUNT (6)
  lines.push('ITEM           QTY   RATE AMOUNT');
  lines.push(divider('-', width));

    (data.items || []).forEach((item: any) => {
      const nameStr = `${item.name}${item.variant ? ` (${item.variant})` : ''}`;
      const qtyStr = String(item.quantity || 1).padStart(3, ' ');
      const unitP = Number(item.unitPrice || item.price || 0).toFixed(2).padStart(6, ' ');
      const totP = Number(item.totalPrice || (Number(item.unitPrice || item.price || 0) * Number(item.quantity || 1))).toFixed(2).padStart(6, ' ');

      const wrappedName = wrapText(nameStr, 14);
      const firstLineName = (wrappedName[0] || '').padEnd(14, ' ');
      lines.push(`${firstLineName} ${qtyStr} ${unitP} ${totP}`);
      for (let i = 1; i < wrappedName.length; i++) {
        lines.push('  ' + wrappedName[i]);
      }

      if (item.comboItems && Array.isArray(item.comboItems) && item.comboItems.length > 0) {
        item.comboItems.forEach((sub: string) => {
          if (sub && sub.trim()) {
            lines.push(`  + ${sub.trim()}`);
          }
        });
      }
    });

  lines.push(divider('-', width));
  lines.push(padLine('Subtotal', Number(data.subtotal || 0).toFixed(2), width));
  if (data.discount && data.discount > 0) {
    lines.push(padLine('Discount', `-${Number(data.discount).toFixed(2)}`, width));
  }

  const taxable = Math.max(0, Number(data.subtotal || 0) - Number(data.discount || 0));
  lines.push(padLine('Taxable Amount', taxable.toFixed(2), width));

  if (data.tax && data.tax > 0) {
    const halfTax = (data.tax / 2).toFixed(2);
    lines.push(padLine('CGST (2.5%)', halfTax, width));
    lines.push(padLine('SGST (2.5%)', halfTax, width));
  }

  if (data.roundOff && data.roundOff !== 0) {
    lines.push(padLine('Round Off', Number(data.roundOff).toFixed(2), width));
  }

  lines.push(divider('=', width));
  lines.push(padLine('GRAND TOTAL', `RS.${Number(data.grandTotal || 0).toFixed(2)}`, width));
  lines.push(divider('=', width));

  if (restaurantDetails?.footerNote) {
    wrapText(restaurantDetails.footerNote, width).forEach((l) => lines.push(centerLine(l, width)));
  }
  lines.push(divider('=', width));
  // 5 feed lines at bottom for physical cutter clearance
  lines.push('\n\n\n\n\n');

  return lines.join('\n');
}

/**
 * Combines one or multiple plain text slip bodies into a multi-page HTML document.
 */
export function combinePosSlips(slipsText: string[]): string {
  const pagesHtml = slipsText
    .map(
      (textBody) => `
    <div class="receipt-page">
      <pre class="pos-receipt">${textBody}</pre>
    </div>`
    )
    .join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: 80mm auto; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: 'Courier New', Courier, monospace;
      -webkit-print-color-adjust: exact;
    }
    .receipt-page {
      page-break-after: always !important;
      break-after: page !important;
      display: block;
      margin: 0;
      padding: 0;
    }
    .pos-receipt {
      margin: 0;
      padding: 4px 0px 4px 14px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 12.5px;
      line-height: 1.25;
      font-weight: 700;
      letter-spacing: 0px;
      white-space: pre;
      color: #000;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
}

/**
 * Formats a Kitchen Order Token (KOT) into POS Text format wrapped in HTML.
 */
export function formatPosTokenHtml(data: any, restaurantDetails?: any, width = 32): string {
  const body = getPosTokenTextBody(data, restaurantDetails, width);
  return combinePosSlips([body]);
}

/**
 * Formats a Tax Invoice Bill into POS Text format wrapped in HTML.
 */
export function formatPosInvoiceHtml(data: any, restaurantDetails?: any, width = 32): string {
  const body = getPosInvoiceTextBody(data, restaurantDetails, width);
  return combinePosSlips([body]);
}
