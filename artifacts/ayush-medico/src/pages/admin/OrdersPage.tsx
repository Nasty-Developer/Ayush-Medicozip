// OrdersPage — Admin view for Phase 2 cart-based orders.
// Separate from MedicineRequestsPage (prescription inquiries).
// Route: /admin  →  tab "orders" in AdminLayout.

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Search, Filter, RefreshCw, Loader2, AlertCircle,
  ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, Package,
  Truck, CreditCard, Phone, Eye, ChevronRight,
} from "lucide-react";
import {
  subscribeToAllOrders,
  updateOrderStatus,
  updateOrderPayment,
  updateOrderDelivery,
  type Order,
} from "@/lib/orderService";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_PIPELINE,
  ORDER_NEGATIVE_STATUSES,
  isNegativeOrderStatus,
  getOrderPipelineIndex,
  type OrderStatus,
} from "@/lib/orderStatus";
import { queueNotification } from "@/lib/notificationService";
import { verifyUpiPayment } from "@/lib/paymentService";
import { assignDeliveryPartner } from "@/lib/deliveryService";
import type { Timestamp } from "firebase/firestore";
import { useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "createdAt" | "status" | "total";
type FilterStatus = "all" | OrderStatus;

// ─── Status colour map ────────────────────────────────────────────────────────

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

function ts(t: Timestamp | undefined): string {
  if (!t) return "—";
  return new Date(t.seconds * 1000).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAllOrders(
      (data) => { setOrders(data); setLoading(false); },
      (err) => { setError(err); setLoading(false); }
    );
    return unsub;
  }, []);

  // ── Derived list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = orders;
    if (filterStatus !== "all") {
      list = list.filter((o) => o.status === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.orderId.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.address?.mobileNumber?.includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let diff = 0;
      if (sortKey === "createdAt") diff = (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0);
      if (sortKey === "status") diff = a.status.localeCompare(b.status);
      if (sortKey === "total") diff = a.pricing.grandTotal - b.pricing.grandTotal;
      return sortAsc ? diff : -diff;
    });
    return list;
  }, [orders, filterStatus, search, sortKey, sortAsc]);

  // ── Counts ──────────────────────────────────────────────────────────────────
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const paymentPendingCount = orders.filter((o) => o.status === "payment-pending").length;
  const activeCount = orders.filter(
    (o) => !isNegativeOrderStatus(o.status) && o.status !== "delivered"
  ).length;

  // ── Sort toggle ─────────────────────────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart size={22} className="text-primary" /> Orders
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cart-based orders from the website
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {pendingCount > 0 && (
            <span className="px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-bold">
              {pendingCount} new
            </span>
          )}
          {paymentPendingCount > 0 && (
            <span className="px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold">
              {paymentPendingCount} awaiting payment
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Orders",  value: orders.length,                 color: "text-foreground" },
          { label: "Active",        value: activeCount,                    color: "text-primary" },
          { label: "Delivered",     value: orders.filter((o) => o.status === "delivered").length, color: "text-green-600 dark:text-green-400" },
          { label: "Revenue",
            value: `₹${orders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.pricing.grandTotal, 0).toLocaleString("en-IN")}`,
            color: "text-green-600 dark:text-green-400" },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-xl border border-border bg-card">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID, customer name, phone…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm
                       text-foreground placeholder:text-muted-foreground/50 outline-none
                       focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                     outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Statuses</option>
          {([...ORDER_STATUS_PIPELINE, ...ORDER_NEGATIVE_STATUSES] as OrderStatus[]).map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
          <AlertCircle size={16} className="text-destructive" />
          <p className="text-sm text-destructive">Failed to load orders: {error.message}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <ShoppingCart size={36} className="text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">
            {search || filterStatus !== "all"
              ? "No orders match your filters."
              : "No orders yet. Orders placed via the cart checkout will appear here."}
          </p>
        </div>
      )}

      {/* Orders list */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                expanded={expandedId === order.id}
                onToggle={() => setExpandedId((v) => (v === order.id ? null : order.id))}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

function OrderCard({ order, expanded, onToggle }: {
  order: Order;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [upiInput, setUpiInput] = useState(order.payment.upiTransactionId ?? "");
  const [partnerName, setPartnerName] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const action = async (label: string, fn: () => Promise<void>) => {
    setActionLoading(label);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError((err as Error).message ?? "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const statusAdvance = async (nextStatus: OrderStatus) => {
    await action("status", async () => {
      await updateOrderStatus(order.id, nextStatus);
      const eventMap: Partial<Record<OrderStatus, import("@/lib/notificationService").NotificationEvent>> = {
        preparing: "order_preparing",
        packed: "order_packed",
        "out-for-delivery": "out_for_delivery",
        delivered: "order_delivered",
        cancelled: "order_cancelled",
        refunded: "order_refunded",
      };
      const event = eventMap[nextStatus];
      if (event) {
        await queueNotification({
          orderId: order.orderId,
          orderDocId: order.id,
          customerId: order.customerId,
          customerName: order.customerName,
          customerPhone: order.address?.mobileNumber,
          customerEmail: order.customerEmail,
          event,
          channels: ["whatsapp"],
        });
      }
    });
  };

  const handleVerifyPayment = async () => {
    if (!upiInput.trim()) { setActionError("Enter UPI transaction ID first."); return; }
    await action("payment", async () => {
      // paymentDocId is null — orders are the source of truth (no separate payment doc in current arch)
      await verifyUpiPayment(null, order.id, upiInput.trim());
      await updateOrderStatus(order.id, "payment-verified");
      await queueNotification({
        orderId: order.orderId,
        orderDocId: order.id,
        customerId: order.customerId,
        customerName: order.customerName,
        customerPhone: order.address?.mobileNumber,
        customerEmail: order.customerEmail,
        event: "payment_received",
        channels: ["whatsapp"],
      });
    });
  };

  const handleAssignDelivery = async () => {
    if (!partnerName.trim() || !partnerPhone.trim()) {
      setActionError("Enter partner name and phone.");
      return;
    }
    await action("delivery", async () => {
      const assigned = await assignDeliveryPartner({
        orderId: order.id,
        partnerName: partnerName.trim(),
        partnerPhone: partnerPhone.trim(),
      });
      await updateOrderDelivery(order.id, {
        status: "assigned",
        partnerId: assigned.partnerId,
        partnerName: assigned.partnerName,
        partnerPhone: assigned.partnerPhone,
      });
      await updateOrderStatus(order.id, "delivery-assigned");
    });
  };

  const nextStatusAction = getNextAction(order.status, order.payment.method);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Row header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors text-left"
      >
        {/* Order ID */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <p className="text-sm font-bold text-foreground font-mono">{order.orderId}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}`}>
              {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
            </span>
            {order.prescription.required && !order.prescription.verified && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                Rx Pending
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {order.customerName} · {order.address?.mobileNumber} · ₹{order.pricing.grandTotal.toLocaleString("en-IN")}
            {order.createdAt && ` · ${ts(order.createdAt)}`}
          </p>
        </div>
        {expanded ? <ChevronUp size={15} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={15} className="text-muted-foreground flex-shrink-0" />}
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border space-y-4">

              {/* Items */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Items</p>
                <div className="space-y-1">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-foreground">{item.medicineName} <span className="text-muted-foreground">×{item.quantity}</span></span>
                      <span className="font-medium text-foreground">₹{item.totalPrice.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-border flex justify-between text-sm font-bold text-foreground">
                  <span>Grand Total</span>
                  <span>₹{order.pricing.grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Address + payment side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Delivery Address</p>
                  {order.address && (
                    <div className="text-xs text-foreground">
                      <p className="font-semibold">{order.address.fullName}</p>
                      <p className="text-muted-foreground mt-0.5">
                        {[order.address.houseNumber, order.address.buildingName, order.address.street, order.address.area, order.address.city, order.address.pincode].filter(Boolean).join(", ")}
                      </p>
                      <p className="text-muted-foreground">{order.address.mobileNumber}</p>
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Payment</p>
                  <p className="text-xs text-foreground font-semibold capitalize">
                    {order.payment.method === "cod" ? "Cash on Delivery" : order.payment.method.toUpperCase()}
                  </p>
                  <p className={`text-xs font-semibold capitalize mt-0.5 ${
                    order.payment.status === "verified" || order.payment.status === "completed"
                      ? "text-green-600 dark:text-green-400"
                      : order.payment.status === "failed"
                      ? "text-destructive"
                      : "text-amber-600 dark:text-amber-400"
                  }`}>
                    {order.payment.status}
                  </p>
                  {order.payment.upiTransactionId && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">UTR: {order.payment.upiTransactionId}</p>
                  )}
                </div>
              </div>

              {/* Action panel */}
              {actionError && (
                <p className="text-xs text-destructive">{actionError}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {/* UPI payment verification */}
                {order.payment.method === "upi" && order.payment.status === "pending" && (
                  <div className="w-full flex gap-2">
                    <input
                      value={upiInput}
                      onChange={(e) => setUpiInput(e.target.value)}
                      placeholder="UPI transaction ID / UTR"
                      className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-xs
                                 text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <ActionBtn
                      label="Verify Payment"
                      icon={<CreditCard size={12} />}
                      loading={actionLoading === "payment"}
                      onClick={handleVerifyPayment}
                      color="blue"
                    />
                  </div>
                )}

                {/* Delivery assignment */}
                {order.status === "ready-for-pickup" && (
                  <div className="w-full space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={partnerName}
                        onChange={(e) => setPartnerName(e.target.value)}
                        placeholder="Partner name"
                        className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <input
                        value={partnerPhone}
                        onChange={(e) => setPartnerPhone(e.target.value)}
                        placeholder="Partner phone"
                        className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                        type="tel"
                      />
                    </div>
                    <ActionBtn
                      label="Assign Delivery"
                      icon={<Truck size={12} />}
                      loading={actionLoading === "delivery"}
                      onClick={handleAssignDelivery}
                      color="purple"
                    />
                  </div>
                )}

                {/* Next pipeline step */}
                {nextStatusAction && (
                  <ActionBtn
                    label={nextStatusAction.label}
                    icon={nextStatusAction.icon}
                    loading={actionLoading === "status"}
                    onClick={() => statusAdvance(nextStatusAction.next)}
                    color={nextStatusAction.color}
                  />
                )}

                {/* Cancel */}
                {!isNegativeOrderStatus(order.status) && order.status !== "delivered" && (
                  <ActionBtn
                    label="Cancel Order"
                    icon={<XCircle size={12} />}
                    loading={actionLoading === "status"}
                    onClick={() => statusAdvance("cancelled")}
                    color="red"
                  />
                )}

                {/* Refund */}
                {(order.status === "cancelled" || order.status === "returned") && order.payment.method !== "cod" && order.payment.status !== "refunded" && (
                  <ActionBtn
                    label="Mark Refunded"
                    icon={<RefreshCw size={12} />}
                    loading={actionLoading === "status"}
                    onClick={async () => {
                      await updateOrderStatus(order.id, "refunded");
                      await updateOrderPayment(order.id, { status: "refunded" });
                      await queueNotification({ orderId: order.orderId, orderDocId: order.id, customerId: order.customerId, customerName: order.customerName, customerPhone: order.address?.mobileNumber, customerEmail: order.customerEmail, event: "order_refunded", channels: ["whatsapp"] });
                    }}
                    color="gray"
                  />
                )}

                {/* Call customer */}
                <a
                  href={`tel:${order.address?.mobileNumber}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border
                             text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                >
                  <Phone size={12} /> Call
                </a>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── ActionBtn ────────────────────────────────────────────────────────────────

function ActionBtn({
  label, icon, loading, onClick, color,
}: {
  label: string;
  icon: React.ReactNode;
  loading: boolean;
  onClick: () => void;
  color: "green" | "blue" | "purple" | "red" | "gray" | "orange";
}) {
  const colors = {
    green:  "bg-green-600 hover:bg-green-700 text-white",
    blue:   "bg-blue-600 hover:bg-blue-700 text-white",
    purple: "bg-purple-600 hover:bg-purple-700 text-white",
    red:    "bg-destructive hover:bg-destructive/90 text-white",
    gray:   "bg-muted hover:bg-muted/80 text-foreground border border-border",
    orange: "bg-orange-500 hover:bg-orange-600 text-white",
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                  disabled:opacity-50 transition-colors ${colors[color]}`}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

// ─── Next action map ─────────────────────────────────────────────────────────
// COD orders skip payment-pending (payment happens at doorstep).
// UPI/Razorpay orders must pass through payment-pending + admin verification.

type NextAction = {
  label: string;
  icon: React.ReactNode;
  next: OrderStatus;
  color: "green" | "blue" | "purple" | "red" | "gray" | "orange";
};

function getNextAction(
  status: OrderStatus,
  paymentMethod?: import("@/lib/orderService").PaymentMethod
): NextAction | null {
  const isCod = paymentMethod === "cod";

  const map: Partial<Record<OrderStatus, NextAction>> = {
    // COD → skip payment steps; UPI/Razorpay → wait for verification
    pending: isCod
      ? {
          label: "Accept & Prepare",
          icon: <CheckCircle2 size={12} />,
          next: "payment-verified", // COD: payment happens on delivery — mark as verified immediately
          color: "green",
        }
      : {
          label: "Accept Order",
          icon: <CheckCircle2 size={12} />,
          next: "payment-pending",  // UPI: admin must verify transaction next
          color: "green",
        },
    // After payment verified (UPI confirmed / COD accepted), start preparing
    "payment-verified": {
      label: "Start Preparing",
      icon: <Package size={12} />,
      next: "preparing",
      color: "blue",
    },
    preparing: {
      label: "Mark Packed",
      icon: <Package size={12} />,
      next: "packed",
      color: "orange",
    },
    packed: {
      label: "Ready for Pickup",
      icon: <Truck size={12} />,
      next: "ready-for-pickup",
      color: "purple",
    },
    "delivery-assigned": {
      label: "Out for Delivery",
      icon: <Truck size={12} />,
      next: "out-for-delivery",
      color: "purple",
    },
    "out-for-delivery": {
      label: "Mark Delivered",
      icon: <CheckCircle2 size={12} />,
      next: "delivered",
      color: "green",
    },
  };
  return map[status] ?? null;
}

