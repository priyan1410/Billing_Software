import { RestaurantDetails } from '../types';
import { formatPosInvoiceHtml, formatPosTokenHtml } from './posFormatter';

export const dispatchPrintJob = async (
  jobType: 'bill' | 'token',
  htmlContent: string,
  restaurantDetails: RestaurantDetails
): Promise<{ success: boolean; dispatchedCount: number; message?: string }> => {
  try {
    const api = (window as any).electronAPI;
    if (!api || !api.printReceipt) {
      // Browser fallback (opens browser print dialog)
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          printWin.print();
          printWin.close();
        }, 250);
      }
      return { success: true, dispatchedCount: 1 };
    }

    const p1Name = (restaurantDetails?.printer1Name || '').trim();
    const p1Target = restaurantDetails?.printer1Target || 'both';

    const p2Name = (restaurantDetails?.printer2Name || '').trim();
    const p2Target = restaurantDetails?.printer2Target || (p2Name ? 'token' : 'none');

    let dispatchedCount = 0;
    const errorMessages: string[] = [];

    // Check Printer 1
    const p1ShouldPrint = p1Target !== 'none' && (p1Target === 'both' || p1Target === jobType);
    if (p1ShouldPrint) {
      const res = await api.printReceipt(htmlContent, { printerName: p1Name });
      if (res && res.success) {
        dispatchedCount++;
      } else if (res && res.message) {
        errorMessages.push(`Printer 1 (${p1Name || 'Default'}): ${res.message}`);
      }
    }

    // Check Printer 2
    const p2ShouldPrint = p2Target !== 'none' && (p2Target === 'both' || p2Target === jobType);
    if (p2ShouldPrint) {
      // Avoid printing duplicate identical jobs to default printer if printer 2 name is empty and printer 1 already printed
      const isDuplicateDefault = !p2Name && !p1Name && p1ShouldPrint;
      if (!isDuplicateDefault) {
        const res = await api.printReceipt(htmlContent, { printerName: p2Name });
        if (res && res.success) {
          dispatchedCount++;
        } else if (res && res.message) {
          errorMessages.push(`Printer 2 (${p2Name || 'Default'}): ${res.message}`);
        }
      }
    }

    // Fallback if neither printer was targeted or configured
    if (dispatchedCount === 0 && p1Target === 'none' && p2Target === 'none') {
      const res = await api.printReceipt(htmlContent, { printerName: '' });
      if (res && res.success) {
        dispatchedCount = 1;
      }
    }

    return {
      success: dispatchedCount > 0,
      dispatchedCount,
      message: errorMessages.length > 0 ? errorMessages.join('; ') : undefined
    };
  } catch (err: any) {
    console.error('dispatchPrintJob error:', err);
    return { success: false, dispatchedCount: 0, message: err.message };
  }
};

export interface PrintOrderOptions {
  printOption?: 'both' | 'bill' | 'token';
  isKotOnly?: boolean;
  formattedDate?: string;
  formattedTime?: string;
}

export const dispatchOrderPrintJobs = async (
  data: any,
  restaurantDetails: RestaurantDetails,
  options?: PrintOrderOptions
): Promise<{ success: boolean; dispatchedCount: number; message?: string }> => {
  const rd = restaurantDetails;

  // Determine effective print mode ('both' | 'bill' | 'token')
  let mode: 'both' | 'bill' | 'token' =
    options?.printOption ||
    rd?.printOption ||
    (rd?.printWithToken === false ? 'bill' : 'both');

  if (options?.isKotOnly) {
    mode = 'token';
  }

  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const formattedDate = options?.formattedDate || `${day}/${month}/${year}`;

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedTime = options?.formattedTime || `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

  const billNumber = data.orderNumber || data.order_number || `KMIV-001`;

  let tokenNumber = data.tokenNumber || data.token_number;
  if (!tokenNumber) {
    if ((window as any).electronAPI?.getNextTokenSeq) {
      try {
        const seqRes = await (window as any).electronAPI.getNextTokenSeq();
        if (seqRes && seqRes.tokenNumber) {
          tokenNumber = seqRes.tokenNumber;
        }
      } catch (err) {
        console.error('Error fetching token sequence:', err);
      }
    }
  }
  if (!tokenNumber) {
    tokenNumber = 'KMKOT001';
  } else if (!String(tokenNumber).startsWith('KMKOT')) {
    tokenNumber = `KMKOT${String(tokenNumber).padStart(3, '0')}`;
  }

  const activeTableNo =
    data.tableNumber ||
    data.table_number ||
    data.tableNo ||
    (data.orderType === 'Takeaway' ? 'TA' : '');

  let totalDispatched = 0;
  const errorMessages: string[] = [];

  const shouldPrintBill = mode === 'both' || mode === 'bill';
  const shouldPrintToken = mode === 'both' || mode === 'token';

  // 1. Print Bill Receipt
  if (shouldPrintBill) {
    const invoiceHtml = formatPosInvoiceHtml(
      {
        ...data,
        tokenNumber,
        tableNumber: activeTableNo,
        orderNumber: billNumber,
        orderDate: data.orderDate || formattedDate,
        createdAt: data.createdAt || new Date().toISOString()
      },
      rd
    );
    const billRes = await dispatchPrintJob('bill', invoiceHtml, rd);
    if (billRes.success) {
      totalDispatched += billRes.dispatchedCount;
    }
    if (billRes.message) {
      errorMessages.push(billRes.message);
    }
  }

  // 2. Print Kitchen Token / KOT
  if (shouldPrintToken) {
    if (shouldPrintBill) {
      // Pause 350ms between printer jobs to allow serial IPC printer queue processing
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    const tokenHtml = formatPosTokenHtml(
      {
        tokenNumber,
        orderNumber: billNumber,
        tableNo: activeTableNo,
        orderType: data.orderType || data.order_type || 'Dine-In',
        paymentMode: data.paymentMode || data.payment_mode || 'Cash',
        items: data.items || [],
        date: formattedDate,
        timestamp: formattedTime
      },
      rd
    );
    const tokenRes = await dispatchPrintJob('token', tokenHtml, rd);
    if (tokenRes.success) {
      totalDispatched += tokenRes.dispatchedCount;
    }
    if (tokenRes.message) {
      errorMessages.push(tokenRes.message);
    }
  }

  return {
    success: totalDispatched > 0,
    dispatchedCount: totalDispatched,
    message: errorMessages.length > 0 ? errorMessages.join('; ') : undefined
  };
};


