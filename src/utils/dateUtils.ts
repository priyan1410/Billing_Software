/**
 * Utility functions for DD/MM/YYYY date formatting across the software.
 */

// Formats any Date object, string, or timestamp into DD/MM/YYYY format (e.g. 23/07/2026)
export const formatDateDDMMYYYY = (val: any): string => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    if (typeof val === 'string' && val.includes('-')) {
      const parts = val.split('T')[0].split(' ')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
    }
    return String(val);
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Formats Date with Time: DD/MM/YYYY, hh:mm A
export const formatDateTimeDDMMYYYY = (val: any): string => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hoursStr = String(hours).padStart(2, '0');

  return `${day}/${month}/${year}, ${hoursStr}:${minutes} ${ampm}`;
};

// Converts YYYY-MM-DD (from input state) to DD/MM/YYYY string for input display
export const isoToDDMMYYYY = (isoStr: string): string => {
  if (!isoStr) return '';
  const parts = isoStr.split('T')[0].split(' ')[0].split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return isoStr;
};

// Converts DD/MM/YYYY string back to YYYY-MM-DD for date filtering
export const ddmmyyyyToIso = (dStr: string): string => {
  if (!dStr) return '';
  const clean = dStr.trim();
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (y.length === 4) {
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
  }
  return dStr;
};

// Converts YYYY-MM-DD (from input type="date") into DD/MM/YYYY for display
export const displayDateRange = (startDate: string, endDate: string): string => {
  const start = startDate ? formatDateDDMMYYYY(startDate) : '...';
  const end = endDate ? formatDateDDMMYYYY(endDate) : '...';
  return `${start} to ${end}`;
};
