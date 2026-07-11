// "My Orders" — shows all cart-based orders for the signed-in customer
// with real-time status updates via Firestore onSnapshot.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Hash, Loader2, ChevronRight, ArrowLeft, MapPin, IndianRupee,
  Package, Pill, Clock, CheckCircle2, XCircle, Truck,
} from "lucide-react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { subscribeToCustomerOrders, type Order } from "@/lib/orderService";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_PIPELINE,
  ORDER_NEGATIVE_STATUSES,
  isNegativeOrderStatus,
  getOrderPipelineIndex,
  type OrderStatus,
} from "@/lib/orderStatus";
import type { Timestamp } from "firebase/firestore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(t?: Timestamp | null): string {
  if (!t) return "—";
  return new Date(t.seconds * 1000).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatDateTime(t?: Timestamp | null): string {
  if (!t) return "—";
  return new Date(t.seconds * 1000).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// ─── Status colours ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:             "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  "payment-pending":   "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
  "payment-verified":  "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  preparing:           "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
  packed:              "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400",
  "ready-for-pickup":  "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400",
  "delivery-assigned": "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  "out-for-delivery":  "bg-primary/10 text-primary",
  delivered:           "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  cancelled:           "bg-destructive/10 text-destructive",
  returned:            "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
  refunded:            "bg-gray-100 dark:bg-gray-800/50 text-muted-foreground",
};

// ─── Status Timeline ──────────────────────────────────────────────────────────

const TIMELINE_STEPS: { key: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { key: "pending",           label: "Order Placed",    icon: <Package size={13} /> },
  { key: "payment-verified",  label: "Confirmed",       icon: <CheckCircle2 size={13} /> },
  { key: "preparing",         label: "Preparing",       icon: <Clock size={13} /> },
  { key: "out-for-delivery",  label: "Out for Delivery", icon: <Truck size={13} /> },
  { key: "delivered",         label: "Delivered",       icon: <CheckCircle2 size={13} /> },
];

function OrderTimeline({ status }: { status: string }) {
  const isNeg = isNegativeOrderStatus(status);
  if (isNeg) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl border border-destructive/20 bg-destructive/5">
        <XCircle size={16} className="text-destructive flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-destructive">
            {ORDER_STATUS_LABELS[status as OrderStatus] ?? status}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {status === "cancelled" ? "This order was cancelled." : status === "refunded" ? "A refund has been initiated." : "The order was returned."}
          </p>
        </div>
      </div>
    );
  }

  const currentIdx = TIMELINE_STEPS.findIndex((s) => s.key === status);
  const pipeIdx = getOrderPipelineIndex(status);

  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-2">
      {TIMELINE_STEPS.map((step, i) => {
        const stepPipeIdx = getOrderPipelineIndex(step.key);
        const done = pipeIdx >= stepPipeIdx && pipeIdx !== -1;
        const active = step.key === status || (i === 0 && !ORDER_STATUS_PIPELINE.includes(status as OrderStatus));

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-[60px]">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all
                ${done ? "bg-primary border-primary text-white" : active ? "border-primary text-primary" : "border-border text-muted-foreground bg-background"}`}>
                {done && !active ? <CheckCircle2 size={14} className="text-white" /> : step.icon}
              </div>
              <p className={`text-[9px] font-semibold text-center leading-tight max-w-[56px]
                ${done ? "text-primary" : "text-muted-foreground"}`}>
                {step.label}
              </p>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-5 mx-0.5 transition-colors ${done && pipeIdx > stepPipeIdx ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MyOrdersModal({ onClose }: { onClose: () => void }) {
  const { user } = useCustomerAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToCustomerOrders(
      user.uid,
      (data) => setOrders(data),
      (err) => {
        console.error("[MyOrders] Failed to load orders:", err);
        setError("Couldn't load your orders right now. Please try again shortly.");
      }
    );
    return unsub;
  }, [user]);

  // Update the selected order in real-time as Firestore pushes changes
  useEffect(() => {
    if (!selected || !orders) return;
    const updated = orders.find((o) => o.id === selected.id);
    if (updated) setSelected(updated);
  }, [orders]);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col"
          data-testid="my-orders-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              {selected && (
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <h3 className="text-base font-bold text-foreground">
                {selected ? `Order ${selected.orderId}` : "My Orders"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-5 py-4">
            {!selected ? (
              /* ── Orders list ── */
              <>
                {orders === null && !error && (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                    <Loader2 size={22} className="animate-spin text-primary" />
                    <p className="text-sm">Loading your orders…</p>
                  </div>
                )}
                {error && <p className="text-sm text-destructive text-center py-10">{error}</p>}
                {orders && orders.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-center text-muted-foreground">
                    <Pill size={26} className="opacity-40" />
                    <p className="text-sm font-semibold">No orders yet</p>
                    <p className="text-xs">Orders you place from the cart will appear here.</p>
                  </div>
                )}
                {orders && orders.length > 0 && (
                  <div className="space-y-2.5">
                    {orders.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setSelected(o)}
                        data-testid={`order-card-${o.id}`}
                        className="w-full text-left p-3.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-1 text-xs font-bold font-mono text-primary">
                            <Hash size={10} /> {o.orderId}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] ?? "bg-muted text-muted-foreground"}`}>
                            {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground line-clamp-1">
                          {o.items.slice(0, 2).map((i) => i.medicineName).join(", ")}
                          {o.items.length > 2 ? ` +${o.items.length - 2} more` : ""}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[11px] text-muted-foreground">{formatDate(o.createdAt)}</span>
                          <span className="text-[11px] font-bold text-foreground">₹{o.pricing.grandTotal.toLocaleString("en-IN")}</span>
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground absolute right-5" style={{ marginTop: "-2rem" }} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* ── Order detail ── */
              <div data-testid="order-detail-view" className="space-y-4">

                {/* Status badge + timestamp */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[selected.status] ?? "bg-muted text-muted-foreground"}`}>
                    {ORDER_STATUS_LABELS[selected.status as OrderStatus] ?? selected.status}
                  </span>
                  <p className="text-xs text-muted-foreground">{formatDateTime(selected.updatedAt ?? selected.createdAt)}</p>
                </div>

                {/* Timeline */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Order Progress</p>
                  <OrderTimeline status={selected.status} />
                </div>

                {/* Prescription status (if required) */}
                {selected.prescription?.required && (
                  <div className={`p-3 rounded-xl border ${
                    selected.prescription.verified
                      ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10"
                      : selected.prescription.url
                      ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10"
                      : "border-destructive/20 bg-destructive/5"
                  }`}>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Prescription</p>
                    {selected.prescription.verified ? (
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">✓ Verified by pharmacist</p>
                    ) : selected.prescription.url ? (
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">⏳ Pending pharmacist review</p>
                    ) : (
                      <p className="text-sm font-semibold text-destructive">⚠ No prescription uploaded</p>
                    )}
                  </div>
                )}

                {/* Items */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Items</p>
                  <div className="space-y-1.5">
                    {selected.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-foreground flex-1 min-w-0 truncate pr-2">
                          {item.medicineName}
                          <span className="text-muted-foreground"> ×{item.quantity}</span>
                          {item.prescriptionRequired && (
                            <span className="ml-1 text-[9px] text-amber-600 dark:text-amber-400 font-semibold">Rx</span>
                          )}
                        </span>
                        <span className="font-medium text-foreground flex-shrink-0">₹{item.totalPrice.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₹{selected.pricing.subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery</span>
                    <span className={selected.pricing.deliveryCharge === 0 ? "text-green-600" : ""}>
                      {selected.pricing.deliveryCharge === 0 ? "FREE" : `₹${selected.pricing.deliveryCharge}`}
                    </span>
                  </div>
                  {selected.pricing.gst > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>GST</span>
                      <span>₹{selected.pricing.gst}</span>
                    </div>
                  )}
                  {selected.pricing.discount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Discount</span>
                      <span>−₹{selected.pricing.discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-foreground pt-1.5 border-t border-border">
                    <span>Grand Total</span>
                    <span className="flex items-center gap-0.5">
                      <IndianRupee size={13} />{selected.pricing.grandTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Payment */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Payment</p>
                  <p className="text-sm font-semibold text-foreground capitalize">
                    {selected.payment.method === "cod" ? "Cash on Delivery" : selected.payment.method.toUpperCase()}
                  </p>
                  <p className={`text-xs font-semibold capitalize mt-0.5 ${
                    selected.payment.status === "verified" || selected.payment.status === "completed"
                      ? "text-green-600 dark:text-green-400"
                      : selected.payment.status === "failed" ? "text-destructive"
                      : "text-amber-600 dark:text-amber-400"
                  }`}>
                    {selected.payment.status}
                  </p>
                </div>

                {/* Delivery address */}
                {selected.address && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                      <MapPin size={10} /> Delivery Address
                    </p>
                    <p className="text-sm font-semibold text-foreground">{selected.address.fullName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[selected.address.houseNumber, selected.address.buildingName, selected.address.street,
                        selected.address.area, selected.address.city, selected.address.pincode].filter(Boolean).join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground">{selected.address.mobileNumber}</p>
                  </div>
                )}

              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
