export type OrderType = 'Dine-In' | 'Takeaway';
export type PaymentMode = 'Cash' | 'UPI' | 'Card';
export type PortionVariant = 'Quarter' | 'Half' | 'Full';

export interface Category {
  id: number;
  name: string;
  icon?: string;
}

export interface Dish {
  id: number;
  categoryId: number;
  name: string;
  priceQuarter: number;
  priceHalf: number;
  priceFull: number;
  isAvailable: boolean;
}

export interface CartItem {
  cartKey: string;
  itemId: number;
  name: string;
  variant: PortionVariant;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  tokenNumber: number;
  orderType: OrderType;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paymentMode: PaymentMode;
  createdAt: string;
}

export interface TokenItem {
  tokenNumber: number;
  orderType: OrderType;
  items: {
    itemId: number;
    name: string;
    variant: PortionVariant;
    quantity: number;
  }[];
  timestamp: string;
}

export interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  paidTo?: string;
  paymentMode: PaymentMode;
  createdAt?: string;
}

export type PnLPeriod = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';
