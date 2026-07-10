// CartDrawer — slide-out cart panel displayed on every page.
// Opened via useCart().openCart() or the cart icon in the header.

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Plus, Minus, ShoppingCart, AlertCircle, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/context/CartContext";
import { resolveMedicineImage } from "@/lib/medicineImage";

// ─── Component ────────────────────────────────────────────────────────────────

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, summary } = useCart();
  const [, navigate] = useLocation();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeCart(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [closeCart]);

  const handleCheckout = () => {
    closeCart();
    navigate("/checkout");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeCart}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 35 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] flex flex-col
                       bg-background border-l border-border shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-primary" />
                <h2 className="text-base font-bold text-foreground">My Cart</h2>
                {summary.itemCount > 0 && (
                  <span className="text-xs font-bold text-white bg-primary rounded-full px-2 py-0.5 min-w-[20px] text-center">
                    {summary.itemCount}
                  </span>
                )}
              </div>
              <button
                onClick={closeCart}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground
                           hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Empty state */}
            {items.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
                  <ShoppingCart size={32} className="text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Your cart is empty</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Browse categories and add medicines to get started.
                  </p>
                </div>
                <button
                  onClick={() => { closeCart(); navigate("/categories"); }}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
                             hover:bg-primary/90 transition-colors"
                >
                  Browse Medicines
                </button>
              </div>
            )}

            {/* Cart items */}
            {items.length > 0 && (
              <>
                {/* Prescription warning */}
                {summary.requiresPrescription && (
                  <div className="mx-4 mt-3 flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Some items require a valid prescription. You'll upload it during checkout.
                    </p>
                  </div>
                )}

                {/* Free delivery progress */}
                {summary.subtotal < 500 && (
                  <div className="mx-4 mt-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-[11px] text-primary font-medium mb-1.5">
                      Add ₹{(500 - summary.subtotal).toLocaleString("en-IN")} more for free delivery!
                    </p>
                    <div className="h-1.5 rounded-full bg-primary/15 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((summary.subtotal / 500) * 100, 100)}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </div>
                )}
                {summary.subtotal >= 500 && (
                  <div className="mx-4 mt-3 p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-[11px] text-green-700 dark:text-green-400 font-medium text-center">
                      🎉 You've unlocked free delivery!
                    </p>
                  </div>
                )}

                {/* Item list */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.div
                        key={item.medicineId}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex gap-3 p-3 rounded-2xl border border-border bg-card"
                      >
                        {/* Medicine image placeholder */}
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <img
                            src={resolveMedicineImage(item.imageUrl)}
                            alt={item.medicineName}
                            className="w-full h-full object-contain rounded-xl"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
                            {item.medicineName}
                          </p>
                          {item.brandName && (
                            <p className="text-[10px] text-muted-foreground">{item.brandName}</p>
                          )}
                          <p className="text-sm font-bold text-primary mt-1">
                            ₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}
                          </p>
                          {item.prescriptionRequired && (
                            <span className="text-[9px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                              Rx
                            </span>
                          )}
                        </div>

                        {/* Qty + remove */}
                        <div className="flex flex-col items-end gap-2">
                          <button
                            onClick={() => removeItem(item.medicineId)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                          <div className="flex items-center gap-1.5 rounded-lg border border-border overflow-hidden">
                            <button
                              onClick={() => updateQuantity(item.medicineId, item.quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center hover:bg-muted/50 transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-sm font-bold text-foreground min-w-[20px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.medicineId, item.quantity + 1)}
                              disabled={item.maxStock ? item.quantity >= item.maxStock : false}
                              className="w-7 h-7 flex items-center justify-center hover:bg-muted/50 transition-colors disabled:opacity-40"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Summary + Checkout */}
                <div className="px-4 pb-5 pt-3 border-t border-border flex-shrink-0 space-y-3">
                  {/* Pricing */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal ({summary.itemCount} item{summary.itemCount !== 1 ? "s" : ""})</span>
                      <span>₹{summary.subtotal.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Delivery</span>
                      <span className={summary.deliveryCharge === 0 ? "text-green-600 dark:text-green-400 font-medium" : ""}>
                        {summary.deliveryCharge === 0 ? "FREE" : `₹${summary.deliveryCharge}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>GST (5%)</span>
                      <span>₹{summary.gst.toLocaleString("en-IN")}</span>
                    </div>
                    {summary.discount > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Coupon Discount</span>
                        <span>−₹{summary.discount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-foreground pt-1.5 border-t border-border">
                      <span>Total</span>
                      <span>₹{summary.grandTotal.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Checkout button */}
                  <button
                    onClick={handleCheckout}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
                               bg-primary text-white font-bold text-sm hover:bg-primary/90
                               transition-colors shadow-lg shadow-primary/20"
                  >
                    Proceed to Checkout <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
