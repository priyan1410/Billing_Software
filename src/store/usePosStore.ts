import { create } from 'zustand';
import { CartItem, Dish, OrderType, PaymentMode, PortionVariant, TokenItem } from '../types';

interface PosState {
  cart: CartItem[];
  orderType: OrderType;
  paymentMode: PaymentMode;
  discount: number;
  editingBillNumber: string | null;
  editingOrderId: any | null;
  setOrderType: (type: OrderType) => void;
  setPaymentMode: (mode: PaymentMode) => void;
  setDiscount: (discount: number) => void;
  addToCart: (dish: Dish, variant: PortionVariant) => void;
  updateQty: (cartKey: string, delta: number) => void;
  clearCart: () => void;
  loadTokenToCart: (token: TokenItem, dishes: Dish[]) => void;
  startEditingBill: (order: any, dishes: Dish[]) => void;
  cancelEditBill: () => void;
}

export const usePosStore = create<PosState>((set: any) => ({
  cart: [],
  orderType: 'Dine-In',
  paymentMode: 'Cash',
  discount: 0,
  editingBillNumber: null,
  editingOrderId: null,
  setOrderType: (orderType: OrderType) => set({ orderType }),
  setPaymentMode: (paymentMode: PaymentMode) => set({ paymentMode }),
  setDiscount: (discount: number) => set({ discount }),
  addToCart: (dish: Dish, variant: PortionVariant) =>
    set((state: PosState) => {
      const cartKey = `${dish.id}_${variant}`;
      let price = dish.priceFull;
      if (variant === 'Quarter') price = dish.priceQuarter;
      else if (variant === 'Half') price = dish.priceHalf;

      const existing = state.cart.find((c: CartItem) => c.cartKey === cartKey);
      if (existing) {
        return {
          cart: state.cart.map((c: CartItem) =>
            c.cartKey === cartKey
              ? { ...c, quantity: c.quantity + 1, totalPrice: (c.quantity + 1) * c.unitPrice }
              : c
          ),
        };
      }

      return {
        cart: [
          ...state.cart,
          {
            cartKey,
            itemId: dish.id,
            name: dish.name,
            variant,
            unitPrice: price,
            quantity: 1,
            totalPrice: price,
            unit: dish.unit || 'Plate',
            hsnSac: dish.hsnSac || undefined,
          },
        ],
      };
    }),

  updateQty: (cartKey: string, delta: number) =>
    set((state: PosState) => ({
      cart: state.cart
        .map((item: CartItem) => {
          if (item.cartKey === cartKey) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return { ...item, quantity: newQty, totalPrice: newQty * item.unitPrice };
          }
          return item;
        })
        .filter(Boolean) as CartItem[],
    })),

  clearCart: () => set({ cart: [], discount: 0, editingBillNumber: null, editingOrderId: null }),

  cancelEditBill: () => set({ editingBillNumber: null, editingOrderId: null }),

  startEditingBill: (order: any, dishes: Dish[]) =>
    set(() => {
      const items = order.items || [];
      const newCart: CartItem[] = items.map((item: any) => {
        const dish = dishes.find((d: Dish) => d.id === item.itemId || d.id === item.item_id || d.name === (item.name || item.dishName || item.dish_name));
        let price = Number(item.unitPrice || item.price || item.unit_price || 0);
        if (price === 0 && dish) {
          if (item.variant === 'Quarter') price = dish.priceQuarter;
          else if (item.variant === 'Half') price = dish.priceHalf;
          else price = dish.priceFull;
        }

        const qty = Number(item.quantity || 1);
        const variant = item.variant || 'Full';

        return {
          cartKey: `${item.itemId || item.item_id || (dish ? dish.id : item.name)}_${variant}`,
          itemId: item.itemId || item.item_id || (dish ? dish.id : 0),
          name: item.name || item.dishName || item.dish_name || (dish ? dish.name : 'Item'),
          variant,
          unitPrice: price,
          quantity: qty,
          totalPrice: Number(item.totalPrice || item.total_price || (price * qty)),
          unit: item.unit || (dish?.unit || 'Plate'),
          hsnSac: item.hsnSac || dish?.hsnSac || undefined,
        };
      });

      return {
        cart: newCart,
        orderType: order.orderType || order.order_type || 'Dine-In',
        paymentMode: order.paymentMode || order.payment_mode || 'Cash',
        discount: Number(order.discountAmount || order.discount_amount || 0),
        editingBillNumber: order.orderNumber || order.order_number || null,
        editingOrderId: order.id || null,
      };
    }),

  loadTokenToCart: (token: TokenItem, dishes: Dish[]) =>
    set(() => {
      const newCart: CartItem[] = token.items.map((item: any) => {
        const dish = dishes.find((d: Dish) => d.id === item.itemId || d.name === item.name);
        let price = 100;
        if (dish) {
          if (item.variant === 'Quarter') price = dish.priceQuarter;
          else if (item.variant === 'Half') price = dish.priceHalf;
          else price = dish.priceFull;
        }

        return {
          cartKey: `${item.itemId}_${item.variant}`,
          itemId: item.itemId,
          name: item.name,
          variant: item.variant,
          unitPrice: price,
          quantity: item.quantity,
          totalPrice: price * item.quantity,
          unit: item.unit || (dish?.unit || 'Plate'),
          hsnSac: item.hsnSac || dish?.hsnSac || undefined,
        };
      });

      return {
        orderType: token.orderType,
        cart: newCart,
      };
    }),
}));
