// CartPage — Full-page cart view (/cart).
// An alternative to the CartDrawer for deep-linking or mobile.

import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, AlertCircle, Tag, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { resolveMedicineImage } from "@/lib/medicineImage";

// ─── Coupon stub ──────────────────────────────────────────────────────────────
// When a coupon system is ready, replace this with a Firestore lookup.
const DEMO_COUPONS: Record<string, number> = {
  AYUSH10: 50,
  FIRST50: 50,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CartPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    summary,
    applyCoupon,
    removeCoupon,
    couponCode,
    couponDiscount,
  } = useCart();
  const [, navigate] = useLocation();
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    const discount = DEMO_COUPONS[code];
    if (discount === undefined) {
      setCouponError("Invalid coupon code.");
      return;
    }
    applyCoupon(code, discount);
    setCouponError("");
  };

  return (
    <div className="min-h-screen pt-28 pb-20 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <ShoppingCart size={28} className="text-primary" />
            My Cart
            {summary.itemCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({summary.itemCount} item{summary.itemCount !== 1 ? "s" : ""})
              </span>
            )}
          </h1>
        </motion.div>

        {/* Empty state */}
        {items.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-24 gap-5 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center">
              <ShoppingCart size={40} className="text-muted-foreground/30" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Your cart is empty</p>
              <p className="text-muted-foreground mt-1">
                Browse our medicine categories and add items.
              </p>
            </div>
            <button
              onClick={() => navigate("/categories")}
              className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
            >
              Browse Categories
            </button>
          </motion.div>
        )}

        {items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Items list */}
            <div className="lg:col-span-2 space-y-3">
              {/* Prescription warning */}
              {summary.requiresPrescription && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    One or more items require a valid prescription. You'll upload it during checkout.
                  </p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.div
                    key={item.medicineId}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="flex gap-4 p-4 rounded-2xl border border-border bg-card shadow-sm"
                  >
                    {/* Image */}
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img
                        src={resolveMedicineImage(item.imageUrl, item.categoryName)}
                        alt={item.medicineName}
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground leading-snug">{item.medicineName}</p>
                          {item.brandName && (
                            <p className="text-xs text-muted-foreground">{item.brandName}</p>
                          )}
                          {item.categoryName && (
                            <p className="text-xs text-muted-foreground/70">{item.categoryName}</p>
                          )}
                          {item.prescriptionRequired && (
                            <span className="inline-block mt-1 text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                              Prescription Required
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.medicineId)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Price */}
                        <div>
                          <p className="text-lg font-bold text-primary">
                            ₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ₹{item.unitPrice.toLocaleString("en-IN")} each
                          </p>
                        </div>

                        {/* Qty control */}
                        <div className="flex items-center gap-2 rounded-xl border border-border overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.medicineId, item.quantity - 1)}
                            className="w-9 h-9 flex items-center justify-center hover:bg-muted/50 transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-bold text-foreground min-w-[24px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.medicineId, item.quantity + 1)}
                            disabled={item.maxStock ? item.quantity >= item.maxStock : false}
                            className="w-9 h-9 flex items-center justify-center hover:bg-muted/50 transition-colors disabled:opacity-40"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Clear cart */}
              <button
                onClick={() => clearCart()}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={12} /> Clear cart
              </button>
            </div>

            {/* Order summary sidebar */}
            <div className="lg:col-span-1 space-y-4">

              {/* Coupon */}
              <div className="p-4 rounded-2xl border border-border bg-card">
                <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Tag size={14} /> Apply Coupon
                </p>
                {couponCode ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="flex-1 text-sm font-mono font-bold text-green-700 dark:text-green-400">
                      {couponCode}
                    </p>
                    <p className="text-sm font-bold text-green-700 dark:text-green-400">
                      −₹{couponDiscount}
                    </p>
                    <button onClick={removeCoupon}>
                      <X size={14} className="text-muted-foreground hover:text-destructive transition-colors" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                      placeholder="Enter coupon code"
                      className="flex-1 px-3 py-2 rounded-xl border border-border text-sm bg-background
                                 text-foreground placeholder:text-muted-foreground/50 outline-none
                                 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold
                                 hover:bg-primary/90 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {couponError && <p className="text-xs text-destructive mt-1.5">{couponError}</p>}
              </div>

              {/* Price breakdown */}
              <div className="p-4 rounded-2xl border border-border bg-card">
                <p className="text-sm font-semibold text-foreground mb-3">Order Summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₹{summary.subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery Charges</span>
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
                      <span>Coupon ({couponCode})</span>
                      <span>−₹{summary.discount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between font-bold text-foreground text-base mt-3 pt-3 border-t border-border">
                  <span>Grand Total</span>
                  <span>₹{summary.grandTotal.toLocaleString("en-IN")}</span>
                </div>

                {/* Free delivery nudge */}
                {summary.subtotal < 500 && summary.deliveryCharge > 0 && (
                  <p className="text-xs text-primary mt-2">
                    Add ₹{(500 - summary.subtotal).toLocaleString("en-IN")} more for free delivery
                  </p>
                )}

                <button
                  onClick={() => navigate("/checkout")}
                  className="w-full flex items-center justify-center gap-2 mt-4 py-3.5 rounded-2xl
                             bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors
                             shadow-lg shadow-primary/20"
                >
                  Proceed to Checkout <ArrowRight size={16} />
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
