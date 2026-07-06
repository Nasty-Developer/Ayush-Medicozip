// "My Orders" — lists every medicine request linked to the signed-in
// customer's Firebase uid, and lets them drill into full order details
// (timeline, payment, waiting state) without ever needing an Order ID.
//
// SECURITY: this queries "inquiries" filtered by `where("customerUid", "==",
// user.uid)`. Firestore rules are managed in the Firebase Console (out of
// scope here to edit), so the *client-side* filter is only as strong as
// whatever rules currently allow. For this to be a true security boundary
// (not just a UI convenience), the "inquiries" collection's rules should
// restrict reads so a document is only returned when
// `resource.data.customerUid == request.auth.uid` (or the request is
// unauthenticated and matches by requestId+mobileNumber, for Track Order).
// Flagging this so it isn't mistaken for enforced security today.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Hash, Loader2, ChevronRight, ArrowLeft, MapPin, IndianRupee, Pill,
} from "lucide-react";
import { getCollection, where } from "@/lib/firestoreHelpers";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { STATUS_LABELS, isNegativeStatus, type RequestStatus } from "@/lib/orderStatus";
import OrderStatusTimeline, { NegativeStatusBanner } from "@/components/customer/OrderStatusTimeline";
import WaitingBanner from "@/components/customer/WaitingBanner";
import PaymentRequiredPanel from "@/components/customer/PaymentRequiredPanel";

type CustomerOrder = {
  id: string;
  requestId?: string;
  medicineName: string;
  quantity: string;
  fullAddress?: string;
  status: RequestStatus | string;
  paymentStatus?: string;
  medicinePrice?: number | null;
  deliveryCharge?: number | null;
  discount?: number | null;
  grandTotal?: number | null;
  createdAt?: { seconds: number } | null;
  updatedAt?: { seconds: number } | null;
};

function formatDate(secs?: number) {
  if (!secs) return "—";
  return new Date(secs * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(secs?: number) {
  if (!secs) return "—";
  return new Date(secs * 1000).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function deliveryStatusFor(status: string): string {
  if (status === "out-for-delivery") return "Out for Delivery";
  if (status === "delivered") return "Delivered";
  if (["preparing", "payment-received"].includes(status)) return "Preparing";
  return "Not yet dispatched";
}

export default function MyOrdersModal({ onClose }: { onClose: () => void }) {
  const { user } = useCustomerAuth();
  const [orders, setOrders] = useState<CustomerOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CustomerOrder | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        // NOTE: sorted client-side (not via Firestore `orderBy`) so this
        // query never needs a composite index — a single-field `where` on
        // `customerUid` works out of the box on any Firestore project.
        const docs = await getCollection(
          "inquiries",
          [where("customerUid", "==", user.uid)],
          undefined,
        );
        const sorted = [...(docs as CustomerOrder[])].sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        );
        if (!cancelled) setOrders(sorted);
      } catch (err) {
        console.error("[MyOrders] Failed to load orders:", err);
        if (!cancelled) setError("Couldn't load your orders right now. Please try again shortly.");
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const grandTotalFor = (o: CustomerOrder) => {
    if (o.grandTotal != null) return o.grandTotal;
    const computed = (o.medicinePrice || 0) + (o.deliveryCharge || 0) - (o.discount || 0);
    return computed || null;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col"
          data-testid="my-orders-modal"
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              {selected && (
                <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                  <ArrowLeft size={16} />
                </button>
              )}
              <h3 className="text-base font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {selected ? "Order Details" : "My Orders"}
              </h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-5 py-4">
            {!selected ? (
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
                    <p className="text-sm">You haven't placed any medicine requests yet.</p>
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
                            <Hash size={10} /> {o.requestId}
                          </span>
                          <ChevronRight size={14} className="text-muted-foreground" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">{o.medicineName} · Qty {o.quantity}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[11px] text-muted-foreground">{formatDate(o.createdAt?.seconds)}</span>
                          <span className="text-[11px] font-semibold text-foreground">
                            {STATUS_LABELS[o.status as RequestStatus] ?? o.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div data-testid="order-detail-view">
                <WaitingBanner order={selected} orderId={selected.requestId} />
                <NegativeStatusBanner status={selected.status} />

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Order ID</p>
                    <p className="text-sm font-bold font-mono text-foreground">{selected.requestId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="text-sm text-foreground">{formatDateTime(selected.updatedAt?.seconds ?? selected.createdAt?.seconds)}</p>
                  </div>
                </div>

                {selected.status === "payment-pending" && (
                  <div className="mb-4">
                    <PaymentRequiredPanel amount={grandTotalFor(selected)} />
                  </div>
                )}

                <div className="mb-4">
                  <OrderStatusTimeline status={selected.status} />
                </div>

                <div className="space-y-2 pt-3 border-t border-border text-sm">
                  <div className="flex gap-3">
                    <span className="text-xs font-semibold text-muted-foreground w-28 flex-shrink-0">Medicine</span>
                    <span className="text-foreground">{selected.medicineName}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xs font-semibold text-muted-foreground w-28 flex-shrink-0">Quantity</span>
                    <span className="text-foreground">{selected.quantity}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xs font-semibold text-muted-foreground w-28 flex-shrink-0">Payment Status</span>
                    <span className="text-foreground">{selected.paymentStatus === "not-applicable" || !selected.paymentStatus ? "Pending pricing" : selected.paymentStatus}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xs font-semibold text-muted-foreground w-28 flex-shrink-0">Delivery Status</span>
                    <span className="text-foreground">{deliveryStatusFor(selected.status)}</span>
                  </div>
                  {selected.fullAddress && (
                    <div className="flex gap-3">
                      <span className="text-xs font-semibold text-muted-foreground w-28 flex-shrink-0 flex items-center gap-1">
                        <MapPin size={11} /> Address
                      </span>
                      <span className="text-foreground">{selected.fullAddress}</span>
                    </div>
                  )}
                  {grandTotalFor(selected) != null && (
                    <div className="flex gap-3">
                      <span className="text-xs font-semibold text-muted-foreground w-28 flex-shrink-0 flex items-center gap-1">
                        <IndianRupee size={11} /> Grand Total
                      </span>
                      <span className="text-foreground font-bold">₹{grandTotalFor(selected)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
