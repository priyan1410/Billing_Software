// SQLite / In-Memory Data Manager for Kish Mandhi

export interface DbStore {
  categories: Array<{ id: number; name: string; icon: string }>;
  menuItems: Array<{
    id: number;
    categoryId: number;
    name: string;
    priceQuarter: number;
    priceHalf: number;
    priceFull: number;
    isAvailable: boolean;
  }>;
  orders: Array<{
    id: number;
    orderNumber: string;
    tokenNumber: number;
    orderType: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    grandTotal: number;
    paymentMode: string;
    createdAt: string;
  }>;
  expenses: Array<{
    id: number;
    category: string;
    description: string;
    amount: number;
    expenseDate: string;
    paidTo: string;
    paymentMode: string;
    createdAt: string;
  }>;
}

export const initialDbStore: DbStore = {
  categories: [
    { id: 1, name: 'Mandhi Special', icon: 'utensils' },
    { id: 2, name: 'Alfaham & Grill', icon: 'fire' },
    { id: 3, name: 'Starters & Sides', icon: 'drumstick-bite' },
    { id: 4, name: 'Beverages', icon: 'glass-martini-alt' },
    { id: 5, name: 'Desserts', icon: 'ice-cream' }
  ],
  menuItems: [
    { id: 1, categoryId: 1, name: 'Special Chicken Mandhi', priceQuarter: 220, priceHalf: 420, priceFull: 790, isAvailable: true },
    { id: 2, categoryId: 1, name: 'Mutton Raan Mandhi', priceQuarter: 350, priceHalf: 680, priceFull: 1290, isAvailable: true },
    { id: 3, categoryId: 1, name: 'Beef Ribs Mandhi', priceQuarter: 280, priceHalf: 520, priceFull: 980, isAvailable: true },
    { id: 4, categoryId: 2, name: 'Peri Peri Alfaham', priceQuarter: 160, priceHalf: 310, priceFull: 590, isAvailable: true },
    { id: 5, categoryId: 2, name: 'Honey Chili Alfaham', priceQuarter: 170, priceHalf: 330, priceFull: 620, isAvailable: true },
    { id: 6, categoryId: 3, name: 'Kubboos (2 Pcs)', priceQuarter: 30, priceHalf: 30, priceFull: 30, isAvailable: true },
    { id: 7, categoryId: 3, name: 'Special Garlic Sauce / Mayonnaise', priceQuarter: 40, priceHalf: 40, priceFull: 40, isAvailable: true },
    { id: 8, categoryId: 4, name: 'Fresh Mint Lime Mojito', priceQuarter: 70, priceHalf: 70, priceFull: 70, isAvailable: true },
    { id: 9, categoryId: 4, name: 'Avocado Milkshake', priceQuarter: 110, priceHalf: 110, priceFull: 110, isAvailable: true },
    { id: 10, categoryId: 5, name: 'Turkish Kunafa with Ice Cream', priceQuarter: 180, priceHalf: 180, priceFull: 180, isAvailable: true }
  ],
  orders: [
    {
      id: 101,
      orderNumber: 'KM-1001',
      tokenNumber: 101,
      orderType: 'Dine-In',
      subtotal: 790,
      taxAmount: 39.5,
      discountAmount: 0,
      grandTotal: 829.5,
      paymentMode: 'UPI',
      createdAt: new Date().toISOString()
    },
    {
      id: 102,
      orderNumber: 'KM-1002',
      tokenNumber: 102,
      orderType: 'Takeaway',
      subtotal: 420,
      taxAmount: 21,
      discountAmount: 20,
      grandTotal: 421,
      paymentMode: 'Cash',
      createdAt: new Date().toISOString()
    }
  ],
  expenses: [
    { id: 1, category: 'Raw Material', description: 'Basmati Rice & Premium Arabic Spices', amount: 4500, expenseDate: new Date().toISOString().split('T')[0], paidTo: 'Malabar Traders', paymentMode: 'UPI', createdAt: new Date().toISOString() },
    { id: 2, category: 'Raw Material', description: 'Fresh Farm Chicken & Mutton Raan', amount: 8200, expenseDate: new Date().toISOString().split('T')[0], paidTo: 'City Poultry & Meats', paymentMode: 'Cash', createdAt: new Date().toISOString() },
    { id: 3, category: 'Utilities', description: 'Cooking Gas Cylinders (Commercial)', amount: 3600, expenseDate: new Date().toISOString().split('T')[0], paidTo: 'Indane Gas Agency', paymentMode: 'Card', createdAt: new Date().toISOString() }
  ]
};
