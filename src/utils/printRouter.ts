import { RestaurantDetails } from '../types';

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
    const p2Target = restaurantDetails?.printer2Target || 'none';

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

