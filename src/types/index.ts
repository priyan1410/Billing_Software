export type OrderType = 'Dine-In' | 'Takeaway';
export type PaymentMode = 'Cash' | 'UPI' | 'Card';
export type PortionVariant = 'Quarter' | 'Half' | 'Full';
export type UnitType = 'Pcs' | 'Kg' | 'Litre' | 'Box' | 'Plate' | 'Glass' | 'Bottle';

export interface Category {
  id: number;
  name: string;
  icon?: string;
}

export interface Dish {
  id: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  priceQuarter: number;
  priceHalf: number;
  priceFull: number;
  isAvailable: boolean;
  hsnSac?: string;
  unit?: UnitType;
  comboItems?: string[];
}

export interface CartItem {
  cartKey: string;
  itemId: number;
  name: string;
  variant: PortionVariant;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  unit?: UnitType;
  hsnSac?: string;
  discount?: number;
  comboItems?: string[];
}

export interface Order {
  id: number;
  orderNumber: string;
  orderType: OrderType;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paymentMode: PaymentMode;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  shippingCharges?: number;
  roundOff?: number;
  orderDate?: string;
  dueDate?: string;
  tableNumber?: string;
}

export interface OrderPayload {
  order_type: OrderType;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  grand_total: number;
  payment_mode: PaymentMode;
  items: CartItem[];
  customer_name?: string;
  customer_phone?: string;
  table_number?: string;
  shipping_charges?: number;
  round_off?: number;
  order_date?: string;
  due_date?: string;
}

export interface TokenItem {
  tokenNumber: number | string;
  orderType: OrderType;
  tableNo?: string;
  paymentMode?: string;
  items: {
    itemId: number;
    name: string;
    variant: PortionVariant;
    quantity: number;
    unit?: UnitType;
    hsnSac?: string;
  }[];
  timestamp: string;
  date?: string;
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

export interface PnLSummary {
  period: PnLPeriod;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  orderCount: number;
  orders: Order[];
  expenses: Expense[];
  startDate?: string;
  endDate?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  username?: string;
}

export interface RestaurantDetails {
  companyName: string;
  tagline?: string;
  ownerName?: string;
  gstNumber?: string;
  gstNo?: string;
  fssaiNumber?: string;
  fssaiNo?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxRate: number;
  currency: string;
  headerNote?: string;
  footerNote?: string;
  logoUrl?: string;
  softwareIconUrl?: string;
  printShowLogo?: boolean;
  printShowAddress?: boolean;
  printShowPhone?: boolean;
  printShowGst?: boolean;
  printShowHeaderNote?: boolean;
  printShowTime?: boolean;
  printShowTaxBreakdown?: boolean;
  printShowRoundOff?: boolean;
  printShowFooterNote?: boolean;
  printWithToken?: boolean;
  totalTables?: number;
  printer1Name?: string;
  printer1Target?: 'bill' | 'token' | 'both' | 'none';
  printer2Name?: string;
  printer2Target?: 'bill' | 'token' | 'both' | 'none';
}


export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  restaurantDetails?: RestaurantDetails | null;
}
