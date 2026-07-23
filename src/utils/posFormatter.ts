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
 * Formats a Kitchen Order Token (KOT) into POS Text format wrapped in HTML.
 */
export function formatPosTokenHtml(
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

  lines.push(`Token No : ${tokenNo}`);
  lines.push(`Order    : ${orderType}`);
  lines.push(padLine(`Date: ${dateStr}`, `Time: ${timeStr}`, width));
  lines.push(divider('-', width));

  lines.push(padLine('ITEM DESCRIPTION', 'QTY', width));
  lines.push(divider('-', width));

  let totalQty = 0;
  (data.items || []).forEach((item) => {
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
  });

  lines.push(divider('-', width));
  lines.push(padLine('Total Items', `${totalQty} Pcs`, width));
  lines.push(divider('-', width));
  lines.push(centerLine('*** NON-BILLING KITCHEN SLIP ***', width));
  lines.push(divider('=', width));

  const textBody = lines.join('\n');

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
  <pre class="pos-receipt">${textBody}</pre>
</body>
</html>`;
}

/**
 * Formats a Tax Invoice Bill into POS Text format wrapped in HTML.
 */
export function formatPosInvoiceHtml(
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
  const gstVal = restaurantDetails?.gstNo || '';
  const fssaiVal = restaurantDetails?.fssaiNo || '';

  const billNo = data.orderNumber || 'KMIV-001';
  const tokenNo = data.tokenNumber
    ? (String(data.tokenNumber).startsWith('KMKOT') ? String(data.tokenNumber) : `KMKOT${String(data.tokenNumber).padStart(3, '0')}`)
    : '';

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

  if (gstVal) lines.push(centerLine(`GST: ${gstVal}`, width));
  if (fssaiVal) lines.push(centerLine(`FSSAI: ${fssaiVal}`, width));

  lines.push(divider('-', width));
  lines.push(centerLine('*** TAX INVOICE ***', width));
  lines.push(divider('-', width));

  lines.push(`Bill No : ${billNo}`);
  if (tokenNo) lines.push(`Token   : ${tokenNo}`);
  lines.push(padLine(`Date: ${dateStr}`, `Time: ${timeStr}`, width));
  lines.push(padLine(`Type: ${data.orderType || 'Dine-In'}`, `Pay: ${data.paymentMode || 'Cash'}`, width));

  if (data.customerName || data.customerPhone) {
    lines.push(divider('-', width));
    if (data.customerName) lines.push(`Cust : ${data.customerName}`);
    if (data.customerPhone) lines.push(`Phone: ${data.customerPhone}`);
  }

  lines.push(divider('-', width));
  // Column header for 32 columns width: ITEM (14), QTY (3), RATE (6), AMOUNT (6)
  // 14 + 1 + 3 + 1 + 6 + 1 + 6 = 32
  lines.push('ITEM           QTY   RATE AMOUNT');
  lines.push(divider('-', width));

  (data.items || []).forEach((item) => {
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

  lines.push(centerLine('Thank You! Visit Again.', width));
  if (restaurantDetails?.footerNote) {
    wrapText(restaurantDetails.footerNote, width).forEach((l) => lines.push(centerLine(l, width)));
  }
  lines.push(divider('=', width));

  const textBody = lines.join('\n');

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
  <pre class="pos-receipt">${textBody}</pre>
</body>
</html>`;
}
