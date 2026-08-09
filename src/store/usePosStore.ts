import { create } from 'zustand';
import { CartItem, Dish, OrderType, PaymentMode, PortionVariant, TokenItem } from '../types';

interface PosState {
  cart: CartItem[];
  orderType: OrderType;
  tableNumber: string;
  paymentMode: PaymentMode;
  deoCashAmount: number;
  deoUpiAmount: number;
  deliveryAddress: string;
  discount: number;
  editingBillNumber: string | null;
  editingOrderId: any | null;
  setOrderType: (type: OrderType) => void;
  setTableNumber: (tableNumber: string) => void;
  setPaymentMode: (mode: PaymentMode) => void;
  setDeoSplit: (cash: number, upi: number) => void;
  setDeliveryAddress: (address: string) => void;
  setDiscount: (discount: number) => void;
  addToCart: (dish: Dish, variant: PortionVariant) => void;
  updateQty: (cartKey: string, delta: number) => void;
  clearCart: () => void;
  loadTokenToCart: (token: TokenItem, dishes: Dish[]) => void;
  loadPreorderToCart: (preorder: any, dishes: Dish[]) => void;
  startEditingBill: (order: any, dishes: Dish[]) => void;
  cancelEditBill: () => void;
}

export const usePosStore = create<PosState>((set: any) => ({
  cart: [],
  orderType: 'Dine-In',
  tableNumber: 'Table 1',
  paymentMode: 'Cash',
  deoCashAmount: 0,
  deoUpiAmount: 0,
  deliveryAddress: '',
  discount: 0,
  editingBillNumber: null,
  editingOrderId: null,
  setOrderType: (orderType: OrderType) => set((state: PosState) => ({
    orderType,
    tableNumber: orderType === 'Delivery' ? 'DEL' : orderType === 'Takeaway' ? 'TA' : (state.tableNumber === 'DEL' || state.tableNumber === 'TA' ? 'Table 1' : state.tableNumber)
  })),
  setTableNumber: (tableNumber: string) => set({ tableNumber }),
  setPaymentMode: (paymentMode: PaymentMode) => set({ paymentMode }),
  setDeoSplit: (deoCashAmount: number, deoUpiAmount: number) => set({ deoCashAmount, deoUpiAmount }),
  setDeliveryAddress: (deliveryAddress: string) => set({ deliveryAddress }),
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
            comboItems: dish.comboItems || undefined,
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

  clearCart: () => set({ cart: [], discount: 0, editingBillNumber: null, editingOrderId: null, tableNumber: 'N/A' }),

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
          comboItems: item.comboItems || dish?.comboItems || undefined,
        };
      });

      return {
        cart: newCart,
        orderType: order.orderType || order.order_type || 'Dine-In',
        tableNumber: order.tableNumber || order.table_number || 'N/A',
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
        tableNumber: token.tableNo || 'N/A',
        paymentMode: (token.paymentMode as any) || 'Cash',
        cart: newCart,
      };
    }),

  loadPreorderToCart: (preorder: any, dishes: Dish[]) =>
    set(() => {
      const itemsList = Array.isArray(preorder.items) ? preorder.items : [];
      const newCart: CartItem[] = itemsList.map((item: any) => {
        const dish = dishes.find((d: Dish) => d.id === item.itemId || d.name === item.name);
        const variant = item.variant || 'Full';
        let price = Number(item.unitPrice || 0);
        if (!price && dish) {
          if (variant === 'Quarter') price = dish.priceQuarter;
          else if (variant === 'Half') price = dish.priceHalf;
          else price = dish.priceFull;
        }

        const qty = Number(item.quantity || 1);
        return {
          cartKey: `${item.itemId || (dish ? dish.id : item.name)}_${variant}`,
          itemId: item.itemId || (dish ? dish.id : 0),
          name: item.name || (dish ? dish.name : 'Item'),
          variant,
          unitPrice: price,
          quantity: qty,
          totalPrice: price * qty,
          unit: item.unit || (dish?.unit || 'Plate'),
          hsnSac: item.hsnSac || dish?.hsnSac || undefined,
        };
      });

      return {
        orderType: preorder.orderType || 'Takeaway',
        tableNumber: preorder.orderType === 'Delivery' ? 'DEL' : preorder.orderType === 'Takeaway' ? 'TA' : 'Table 1',
        paymentMode: 'Cash',
        cart: newCart,
      };
    }),
}));
