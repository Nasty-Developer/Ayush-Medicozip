// CartContext — localStorage-persisted shopping cart.
// Cart lives entirely in the browser until the customer places an order,
// at which point createOrder() is called and the cart is cleared.

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CartItem = {
  medicineId: string;
  medicineName: string;
  categoryName?: string;
  brandName?: string;
  unitPrice: number;
  quantity: number;
  prescriptionRequired: boolean;
  imageUrl?: string;
  /** Max stock available. 0 or undefined = unlimited. */
  maxStock?: number;
};

export type CartSummary = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  deliveryCharge: number;
  gst: number;
  discount: number;
  grandTotal: number;
  couponCode: string | null;
  requiresPrescription: boolean;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (medicineId: string) => void;
  updateQuantity: (medicineId: string, qty: number) => void;
  clearCart: () => void;
  summary: CartSummary;
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
  couponCode: string | null;
  couponDiscount: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "ayush_medico_cart_v1";
const GST_RATE = 0.05; // 5% GST on medicines
const FREE_DELIVERY_THRESHOLD = 500; // Free delivery above ₹500
const BASE_DELIVERY_CHARGE = 40; // ₹40 flat delivery

// ─── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota exceeded or private mode — silently ignore
  }
}

function computeSummary(
  items: CartItem[],
  couponDiscount: number,
  couponCode: string | null
): CartSummary {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const deliveryCharge =
    subtotal === 0
      ? 0
      : subtotal >= FREE_DELIVERY_THRESHOLD
      ? 0
      : BASE_DELIVERY_CHARGE;
  const gst = Math.round(subtotal * GST_RATE);
  const discount = Math.min(couponDiscount, subtotal); // can't discount more than subtotal
  const grandTotal = Math.max(0, subtotal + deliveryCharge + gst - discount);
  const requiresPrescription = items.some((i) => i.prescriptionRequired);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return {
    items,
    itemCount,
    subtotal,
    deliveryCharge,
    gst,
    discount,
    grandTotal,
    couponCode,
    requiresPrescription,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadFromStorage);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Persist on every change
  useEffect(() => {
    saveToStorage(items);
  }, [items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, qty = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.medicineId === item.medicineId);
        if (existing) {
          const max = existing.maxStock ?? Infinity;
          const newQty = Math.min(existing.quantity + qty, max > 0 ? max : Infinity);
          return prev.map((i) =>
            i.medicineId === item.medicineId ? { ...i, quantity: newQty } : i
          );
        }
        const max = item.maxStock ?? Infinity;
        return [...prev, { ...item, quantity: Math.min(qty, max > 0 ? max : qty) }];
      });
      setIsOpen(true);
    },
    []
  );

  const removeItem = useCallback((medicineId: string) => {
    setItems((prev) => prev.filter((i) => i.medicineId !== medicineId));
  }, []);

  const updateQuantity = useCallback((medicineId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.medicineId !== medicineId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.medicineId !== medicineId) return i;
        const max = i.maxStock ?? Infinity;
        return { ...i, quantity: Math.min(qty, max > 0 ? max : qty) };
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCouponCode(null);
    setCouponDiscount(0);
  }, []);

  const applyCoupon = useCallback((code: string, discount: number) => {
    setCouponCode(code);
    setCouponDiscount(discount);
  }, []);

  const removeCoupon = useCallback(() => {
    setCouponCode(null);
    setCouponDiscount(0);
  }, []);

  const summary = computeSummary(items, couponDiscount, couponCode);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        summary,
        applyCoupon,
        removeCoupon,
        couponCode,
        couponDiscount,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
