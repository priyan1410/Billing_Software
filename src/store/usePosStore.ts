import { create } from 'zustand';
import { CartItem, Dish, OrderType, PaymentMode, PortionVariant, TokenItem } from '../types';

interface PosState {
  cart: CartItem[];
  orderType: OrderType;
  paymentMode: PaymentMode;
  discount: number;
  setOrderType: (type: OrderType) => void;
  setPaymentMode: (mode: PaymentMode) => void;
  setDiscount: (discount: number) => void;
  addToCart: (dish: Dish, variant: PortionVariant) => void;
  updateQty: (cartKey: string, delta: number) => void;
  clearCart: () => void;
  loadTokenToCart: (token: TokenItem, dishes: Dish[]) => void;
}

export const usePosStore = create<PosState>((set: any) => ({
  cart: [],
  orderType: 'Dine-In',
  paymentMode: 'Cash',
  discount: 0,
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

  clearCart: () => set({ cart: [], discount: 0 }),

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
