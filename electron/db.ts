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
    orderType: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    grandTotal: number;
    paymentMode: string;
    items: any[];
    shippingCharges?: number;
    roundOff?: number;
    orderDate?: string;
    dueDate?: string;
    customerName?: string;
    customerPhone?: string;
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
  tokens: Array<{
    tokenNumber: string;
    orderType: string;
    paymentMode: string;
    items: any[];
    timestamp: string;
    date: string;
    createdAt: string;
  }>;
  lastTokenSeq: number;
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
    { id: 1, categoryId: 1, name: 'Special Chicken Mandhi (ஸ்பெஷல் சிக்கன் மந்தி)', priceQuarter: 220, priceHalf: 420, priceFull: 790, isAvailable: true },
    { id: 2, categoryId: 1, name: 'Mutton Raan Mandhi (மட்டன் ரான் மந்தி)', priceQuarter: 350, priceHalf: 680, priceFull: 1290, isAvailable: true },
    { id: 3, categoryId: 1, name: 'Beef Ribs Mandhi (பீஃப் ரிப்ஸ் மந்தி)', priceQuarter: 280, priceHalf: 520, priceFull: 980, isAvailable: true },
    { id: 4, categoryId: 2, name: 'Peri Peri Alfaham (பெரி பெரி அல்ஃபஹாம்)', priceQuarter: 160, priceHalf: 310, priceFull: 590, isAvailable: true },
    { id: 5, categoryId: 2, name: 'Honey Chili Alfaham (ஹனி சில்லி அல்ஃபஹாம்)', priceQuarter: 170, priceHalf: 330, priceFull: 620, isAvailable: true },
    { id: 6, categoryId: 3, name: 'Kubboos (குபூஸ் - 2 Pcs)', priceQuarter: 30, priceHalf: 30, priceFull: 30, isAvailable: true },
    { id: 7, categoryId: 3, name: 'Special Garlic Sauce / Mayonnaise (பூண்டு சாஸ்)', priceQuarter: 40, priceHalf: 40, priceFull: 40, isAvailable: true },
    { id: 8, categoryId: 4, name: 'Fresh Mint Lime Mojito (புதினா மோஹிட்டோ)', priceQuarter: 70, priceHalf: 70, priceFull: 70, isAvailable: true },
    { id: 9, categoryId: 4, name: 'Avocado Milkshake (அவகாடோ மில்க்‌ஷேக்)', priceQuarter: 110, priceHalf: 110, priceFull: 110, isAvailable: true },
    { id: 10, categoryId: 5, name: 'Turkish Kunafa (துருக்கி குனாஃபா)', priceQuarter: 180, priceHalf: 180, priceFull: 180, isAvailable: true }
  ],
  orders: [],
  expenses: [],
  tokens: [],
  lastTokenSeq: 0
};
