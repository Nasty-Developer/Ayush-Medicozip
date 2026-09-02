// OrderDetailPage — Customer order detail + live tracking.
// Route: /order/:docId
//
// Shows: status timeline, items, address, payment info, delivery info.
// Allows cancellation if eligible (status is pending or payment-pending).

import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, MapPin, CreditCard, Truck, AlertCircle, Loader2,
  ChevronLeft, CheckCircle2, Clock, XCircle, PhoneCall, UserRound,
  FileText, BadgeCheck,
} from "lucide-react";
import { subscribeToOrder, updateOrderStatus, type Order } from "@/lib/orderService";
import {
  ORDER_STATUS_PIPELINE, ORDER_STATUS_LABELS,
  canCustomerCancel, getOrderPipelineIndex, isNegativeOrderStatus,
  type OrderStatus,
} from "@/lib/orderStatus";
import { queueNotification } from "@/lib/notificationService";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import UpiPaymentPanel from "@/components/customer/UpiPaymentPanel";
import { InvoiceActions } from "@/components/customer/Invoice";

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const [matched, params] = useRoute("/order/:docId");
  const [, navigate] = useLocation();
  const { user } = useCustomerAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const docId = params?.docId ?? "";

  useEffect(() => {
    if (!docId) return;
    const unsub = subscribeToOrder(
      docId,
       (o) => {
         setOrder(o);
         setLoading(false);
         setLoadError(o ? null : "Order not found.");
       },
       () => {
         setLoading(false);
         setLoadError("We couldn't load this order right now. Please refresh and try again.");
       }
    );
    return unsub;
  }, [docId]);

  const handleCancel = async () => {
    if (!order || !user) return;
    if (!canCustomerCancel(order.status)) return;
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await updateOrderStatus(docId, "cancelled");
      await queueNotification({
        orderId: order.orderId,
        orderDocId: docId,
        customerId: user.uid,
        customerName: user.displayName ?? "Customer",
        customerPhone: order.address?.mobileNumber,
        customerEmail: user.email,
        event: "order_cancelled",
        channels: ["whatsapp"],
      });
    } catch {
      setCancelError("Could not cancel order. Please call us.");
    } finally {
      setCancelling(false);
    }
  };

  if (!matched) { navigate("/"); return null; }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

   if (!order || loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 pt-16 text-center">
         <AlertCircle size={40} className="text-amber-500" />
         <p className="text-lg font-semibold text-foreground">{loadError ?? "Order not found"}</p>
         <button onClick={() => navigate("/track")} className="text-primary hover:underline text-sm">Track Order</button>
      </div>
    );
  }

  // Client-side ownership check — prevents one customer from viewing another's
  // order by guessing a Firestore document ID.
  // Note: Firestore security rules should be the authoritative enforcement layer.
  if (user && order.customerId !== user.uid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 pt-16 text-center">
        <AlertCircle size={40} className="text-destructive/60" />
        <p className="text-lg font-semibold text-foreground">Access denied</p>
        <p className="text-sm text-muted-foreground">This order does not belong to your account.</p>
        <button onClick={() => navigate("/")} className="text-primary hover:underline text-sm">Go home</button>
      </div>
    );
  }

  const isNegative = isNegativeOrderStatus(order.status);
  const pipelineIdx = getOrderPipelineIndex(order.status);

  return (
    <div className="min-h-screen pt-28 pb-20 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* Back */}
        <button
          onClick={() => navigate(-1 as any)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ChevronLeft size={15} /> Back
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Order ID</p>
            <h1 className="text-xl font-bold text-foreground font-mono">{order.orderId}</h1>
            {order.createdAt && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(order.createdAt.seconds * 1000).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <InvoiceActions order={order} />
            <StatusBadge status={order.status} />
          </div>
        </div>

        <div className="space-y-4">
          {!isNegative && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-bold text-foreground">
                {order.status === "pending"
                  ? "Order received — under review"
                  : order.status === "payment-pending"
                  ? "Payment required"
                  : order.status === "payment-verification-pending"
                  ? "Payment verification pending"
                  : ORDER_STATUS_LABELS[order.status]}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {order.status === "pending"
                  ? "We will review your prescription when required, confirm the delivery charge, and then make UPI payment available."
                  : order.status === "payment-pending"
                  ? "Your order has been reviewed. Complete the UPI payment below to send it for verification."
                  : order.status === "payment-verification-pending"
                  ? "Your payment confirmation is with our pharmacy team. We will verify it before preparing your order."
                  : "Your order is moving through our pharmacy and delivery workflow."}
              </p>
            </div>
          )}

          {/* Status timeline */}
          {!isNegative && (
            <div className="p-5 rounded-2xl border border-border bg-card">
              <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <Truck size={14} className="text-primary" /> Order Progress
              </h2>
              <div className="space-y-0">
                {ORDER_STATUS_PIPELINE.map((s, i) => {
                  const done = i <= pipelineIdx;
                  const current = i === pipelineIdx;
                  const isLast = i === ORDER_STATUS_PIPELINE.length - 1;
                  return (
                    <div key={s} className="flex gap-3">
                      {/* Dot + line */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                                      ${done ? "bg-primary border-primary" : "border-border"}`}
                        >
                          {done ? (
                            current
                              ? <Clock size={12} className="text-white" />
                              : <CheckCircle2 size={12} className="text-white" />
                          ) : null}
                        </div>
                        {!isLast && (
                          <div className={`w-0.5 h-6 mt-1 ${i < pipelineIdx ? "bg-primary" : "bg-border"}`} />
                        )}
                      </div>
                      {/* Label */}
                      <div className="pb-6 flex-1">
                        <p className={`text-sm font-semibold transition-colors ${done ? "text-foreground" : "text-muted-foreground/50"}`}>
                          {ORDER_STATUS_LABELS[s]}
                        </p>
                        {current && (
                          <p className="text-xs text-primary font-medium">Current status</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cancelled / negative status */}
          {isNegative && (
            <div className="p-5 rounded-2xl border border-destructive/20 bg-destructive/5 flex items-start gap-3">
              <XCircle size={20} className="text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-foreground">{ORDER_STATUS_LABELS[order.status as OrderStatus]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  If you have any questions, please call us at +91 98332 73838.
                </p>
              </div>
            </div>
          )}

          {/* Customer */}
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <UserRound size={14} className="text-primary" /> Customer
            </h2>
            <div className="grid gap-1 text-sm sm:grid-cols-2">
              <div>
                <p className="font-semibold text-foreground">{order.customerName}</p>
                <p className="text-xs text-muted-foreground">{order.customerEmail || "Email not provided"}</p>
              </div>
              <p className="text-xs text-muted-foreground sm:text-right">{order.customerPhone}</p>
            </div>
          </div>

          {/* Items */}
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Package size={14} className="text-primary" /> Items ({order.items.length})
            </h2>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-sm py-2 border-b border-border/60 last:border-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-primary/60">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package size={17} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{item.medicineName}</p>
                      {item.brandName && <p className="text-xs text-muted-foreground">{item.brandName}</p>}
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity} × ₹{item.unitPrice}</p>
                    </div>
                  </div>
                  <p className="font-bold text-foreground">₹{item.totalPrice.toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
            {/* Pricing */}
            <div className="mt-4 pt-3 border-t border-border space-y-1.5 text-sm text-muted-foreground">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{order.pricing.subtotal.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span>Delivery</span><span>{order.pricing.deliveryCharge == null ? "Pending review" : order.pricing.deliveryCharge === 0 ? "Included" : `₹${order.pricing.deliveryCharge}`}</span></div>
              <div className="flex justify-between"><span>GST</span><span>₹{order.pricing.gst.toLocaleString("en-IN")}</span></div>
              {order.pricing.discount > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><span>Discount</span><span>−₹{order.pricing.discount}</span></div>}
              <div className="flex justify-between font-bold text-foreground text-base pt-2 border-t border-border">
                <span>Total</span><span>{order.pricing.grandTotal == null ? "Pending review" : `₹${order.pricing.grandTotal.toLocaleString("en-IN")}`}</span>
              </div>
            </div>
          </div>

          {/* Delivery address */}
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <MapPin size={14} className="text-primary" /> Delivery Address
            </h2>
            {order.address && (
              <div className="text-sm">
                <p className="font-semibold text-foreground">{order.address.fullName}</p>
                <p className="text-muted-foreground mt-0.5">
                  {[order.address.houseNumber, order.address.buildingName, order.address.street, order.address.area, order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(", ")}
                </p>
                <p className="text-muted-foreground">{order.address.mobileNumber}</p>
              </div>
            )}
          </div>

          {/* Prescription */}
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <FileText size={14} className="text-primary" /> Prescription
            </h2>
            {!order.prescription.required ? (
              <p className="text-sm text-muted-foreground">No prescription was required for this order.</p>
            ) : (
              <div className="flex items-start gap-2">
                <BadgeCheck size={17} className={order.prescription.verified ? "text-emerald-600" : "text-amber-600"} />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {order.prescription.verified ? "Verified by pharmacist" : order.prescription.url ? "Pending pharmacist review" : "Prescription not uploaded"}
                  </p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                    {order.prescription.status ?? (order.prescription.verified ? "approved" : "pending")}
                    {order.prescription.rejectionReason ? ` · ${order.prescription.rejectionReason}` : ""}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Delivery status */}
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <Truck size={14} className="text-primary" /> Delivery status
            </h2>
            <div className="grid gap-1 text-sm sm:grid-cols-2">
              <div>
                <p className="font-semibold capitalize text-foreground">{order.delivery.status.replaceAll("-", " ")}</p>
                {order.delivery.partnerName && <p className="text-xs text-muted-foreground">Partner: {order.delivery.partnerName}</p>}
              </div>
              <div className="sm:text-right">
                {order.delivery.trackingId && <p className="font-mono text-xs text-foreground">Tracking {order.delivery.trackingId}</p>}
                {order.delivery.partnerPhone && <p className="text-xs text-muted-foreground">{order.delivery.partnerPhone}</p>}
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <CreditCard size={14} className="text-primary" /> Payment
            </h2>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-semibold text-foreground capitalize">
                  {order.payment.method === "cod" ? "Cash on Delivery" : order.payment.method.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-semibold capitalize ${
                  ["paid", "verified", "completed"].includes(order.payment.status)
                    ? "text-green-600 dark:text-green-400"
                    : order.payment.status === "failed"
                    ? "text-destructive"
                    : "text-amber-600 dark:text-amber-400"
                }`}>
                  {order.payment.status === "verification-pending" ? "Verification pending" : order.payment.status}
                </span>
              </div>
              {order.payment.upiTransactionId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UTR</span>
                  <span className="font-mono text-foreground text-xs">{order.payment.upiTransactionId}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── UPI payment panel (available only after pharmacy request) ── */}
          {order.status === "payment-pending" && order.payment.method === "upi" &&
           order.pricing.grandTotal != null &&
           !["paid", "verified", "completed"].includes(order.payment.status) && (
            <UpiPaymentPanel
              orderDbId={order.id}
              orderId={order.orderId}
              amount={order.pricing.grandTotal}
              paymentStatus={order.payment.status}
            />
          )}


          {/* Actions */}
          <div className="flex flex-col gap-3">
            {canCustomerCancel(order.status) && (
              <>
                {cancelError && (
                  <p className="text-sm text-destructive">{cancelError}</p>
                )}
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl
                             border border-destructive/30 text-destructive font-semibold text-sm
                             hover:bg-destructive/5 disabled:opacity-50 transition-colors"
                >
                  {cancelling ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                  {cancelling ? "Cancelling…" : "Cancel Order"}
                </button>
              </>
            )}
            <a
              href="tel:+919833273838"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl
                         border border-border text-sm font-semibold text-foreground
                         hover:bg-muted/40 transition-colors"
            >
              <PhoneCall size={14} /> Call for Help
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const label = ORDER_STATUS_LABELS[status] ?? status;
  const negative = isNegativeOrderStatus(status);
  const delivered = status === "delivered";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold
                  ${delivered
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : negative
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
                  }`}
    >
      {delivered ? <CheckCircle2 size={12} /> : negative ? <XCircle size={12} /> : <Clock size={12} />}
      {label}
    </span>
  );
}
