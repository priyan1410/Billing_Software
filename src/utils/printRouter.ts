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

    const p1Name = restaurantDetails.printer1Name || '';
    const p1Target = restaurantDetails.printer1Target || 'both';

    const p2Name = restaurantDetails.printer2Name || '';
    const p2Target = restaurantDetails.printer2Target || 'none';

    let dispatchedCount = 0;

    // Check Printer 1
    const p1ShouldPrint = p1Target === 'both' || p1Target === jobType;
    if (p1ShouldPrint) {
      await api.printReceipt(htmlContent, { printerName: p1Name });
      dispatchedCount++;
    }

    // Check Printer 2
    const p2ShouldPrint = (p2Target === 'both' || p2Target === jobType) && p2Target !== 'none';
    if (p2ShouldPrint) {
      await api.printReceipt(htmlContent, { printerName: p2Name });
      dispatchedCount++;
    }

    // Fallback if neither printer was targeted or configured
    if (dispatchedCount === 0) {
      await api.printReceipt(htmlContent, { printerName: '' });
      dispatchedCount = 1;
    }

    return { success: true, dispatchedCount };
  } catch (err: any) {
    console.error('dispatchPrintJob error:', err);
    return { success: false, dispatchedCount: 0, message: err.message };
  }
};
