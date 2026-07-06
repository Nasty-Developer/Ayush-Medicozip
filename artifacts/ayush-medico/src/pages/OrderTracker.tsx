import { useEffect, useState } from "react";
import { useParams, useSearch, Link } from "wouter";
import { motion } from "framer-motion";
import {
  PackageSearch,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  IndianRupee,
  ChefHat,
  Truck,
  PackageCheck,
  Ban,
  XCircle,
  Phone,
  MessageCircle,
  Hash,
  MapPin,
  ShoppingCart,
  LockKeyhole,
} from "lucide-react";
import { getCollection, where } from "@/lib/firestoreHelpers";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  STATUS_PIPELINE,
  STATUS_LABELS,
  isNegativeStatus,
  getPipelineIndex,
  type RequestStatus,
} from "@/lib/orderStatus";

// ─── Types ────────────────────────────────────────────────────────────────────
// This shape mirrors the "inquiries" Firestore document for a medicine
// request. Kept intentionally loose/optional on customer-identity fields so
// this same lookup pattern can later be swapped for an authenticated
// customer-account query (see note near `lookupOrder` below) without
// changing the rendering code.

type TrackedRequest = {
  id: string;
  requestId?: string;
  customerName: string;
  mobileNumber: string;
  medicineName: string;
  quantity: string;
  fullAddress?: string;
  status: string;
  medicinePrice?: number | null;
  deliveryCharge?: number | null;
  discount?: number | null;
  grandTotal?: number | null;
  createdAt?: { seconds: number };
  updatedAt?: { seconds: number };
};

const STAGE_ICONS: Record<RequestStatus, React.ElementType> = {
  new: PackageSearch,
  "pending-verification": ShieldCheck,
  accepted: CheckCircle2,
  "medicine-reserved": ShoppingCart,
  "payment-pending": IndianRupee,
  "payment-received": IndianRupee,
  preparing: ChefHat,
  "out-for-delivery": Truck,
  delivered: PackageCheck,
  rejected: XCircle,
  "medicine-unavailable": XCircle,
  cancelled: Ban,
};

const STAGES = STATUS_PIPELINE.map((key) => ({
  key,
  label: STATUS_LABELS[key],
  icon: STAGE_ICONS[key],
}));

const GENERIC_NOT_FOUND =
  "Order not found. Please verify your Order ID and Mobile Number.";

function formatDate(secs?: number) {
  if (!secs) return "—";
  return new Date(secs * 1000).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function StatusBanner({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
    cancelled: { label: "This order was cancelled.", cls: "bg-destructive/10 text-destructive", icon: Ban },
    rejected: { label: "This order was not accepted.", cls: "bg-destructive/10 text-destructive", icon: XCircle },
    "medicine-unavailable": { label: "Sorry, this medicine is currently unavailable.", cls: "bg-amber-500/10 text-amber-600", icon: XCircle },
  };
  const c = cfg[status];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold mb-6 ${c.cls}`}>
      <Icon size={16} /> {c.label}
    </div>
  );
}

// ─── Lookup ───────────────────────────────────────────────────────────────────
// SECURITY: tracking requires BOTH the Order ID and the Mobile Number to
// match the same Firestore document. We never reveal which of the two was
// wrong — a mismatch on either (or both) returns the same generic message.
//
// FUTURE AUTH: this function is the natural seam for swapping in an
// authenticated lookup later (e.g. Firebase Phone Auth) — once a customer is
// signed in, this could instead query `where("customerUid", "==", uid)` to
// list their full order history, with no changes needed to the rendering
// code below.
async function lookupOrder(orderId: string, mobileNumber: string): Promise<TrackedRequest | null> {
  const normalizedId = orderId.trim().toUpperCase();
  const normalizedMobile = mobileNumber.trim();

  const docs = await getCollection(
    "inquiries",
    [where("requestId", "==", normalizedId)],
    `track_${normalizedId}`,
  );
  if (!docs.length) return null;

  const doc = docs[0] as TrackedRequest;
  // Compare only the last 10 digits so formatting differences (+91, spaces,
  // dashes) between what the customer typed and what's stored don't cause a
  // false mismatch.
  const storedDigits = (doc.mobileNumber || "").replace(/\D/g, "").slice(-10);
  const inputDigits = normalizedMobile.replace(/\D/g, "").slice(-10);
  if (!storedDigits || storedDigits !== inputDigits) return null;

  return doc;
}

function useOrderLookup() {
  const [data, setData] = useState<TrackedRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const search = async (orderId: string, mobileNumber: string) => {
    setLoading(true);
    setError(null);
    setData(null);
    setSearched(true);
    try {
      if (!isFirebaseConfigured) {
        setError("Tracking is temporarily unavailable.");
        return;
      }
      const result = await lookupOrder(orderId, mobileNumber);
      if (!result) {
        setError(GENERIC_NOT_FOUND);
        return;
      }
      setData(result);
    } catch (err) {
      console.error("[OrderTracker] Lookup failed:", err);
      setError("Something went wrong while looking up your order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, searched, search };
}

export default function OrderTracker() {
  const params = useParams<{ requestId?: string }>();
  const search = useSearch();
  const [orderId, setOrderId] = useState(params.requestId || "");
  const [mobileNumber, setMobileNumber] = useState("");
  const { data, loading, error, searched, search: runSearch } = useOrderLookup();

  // Prefill the Order ID from either a legacy `/track/:requestId` link or the
  // newer `/track?orderId=...` query param. Mobile number is intentionally
  // NEVER prefilled or auto-submitted — the customer must always provide it
  // themselves before any order data is revealed.
  useEffect(() => {
    if (params.requestId) {
      setOrderId(params.requestId);
      return;
    }
    const qp = new URLSearchParams(search);
    const fromQuery = qp.get("orderId");
    if (fromQuery) setOrderId(fromQuery);
  }, [params.requestId, search]);

  const activeIndex = data ? getPipelineIndex(data.status) : -1;
  const isNegative = data ? isNegativeStatus(data.status) : false;

  const computedTotal =
    (data?.medicinePrice || 0) + (data?.deliveryCharge || 0) - (data?.discount || 0);
  const grandTotal = data?.grandTotal ?? (computedTotal || null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !mobileNumber.trim()) return;
    runSearch(orderId, mobileNumber);
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
          ← Back to Ayush Medico
        </Link>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-4">
            <PackageSearch size={14} /> Track Your Order
          </div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Where's my medicine?
          </h1>
          <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
            <LockKeyhole size={12} /> Enter your Order ID and mobile number to view your order securely.
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-3 mb-8">
          <div className="relative">
            <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Order ID e.g. AYM-2026-000123"
              data-testid="input-track-order-id"
              className="w-full pl-9 pr-4 py-3 text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          <div className="relative">
            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="Mobile number used for the order"
              type="tel"
              data-testid="input-track-mobile"
              className="w-full pl-9 pr-4 py-3 text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!orderId.trim() || !mobileNumber.trim()}
            data-testid="button-track-search"
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all"
          >
            <Search size={16} /> Track Order
          </button>
        </form>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 size={24} className="animate-spin text-primary" />
            <p className="text-sm">Looking up your order…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center" data-testid="order-not-found">
            <XCircle size={28} className="text-destructive/60" />
            <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
          </div>
        )}

        {!loading && data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl shadow-sm p-6"
            data-testid="order-tracker-result"
          >
            <StatusBanner status={data.status} />

            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-muted-foreground">Order ID</p>
                <p className="text-sm font-bold font-mono text-foreground">{data.requestId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm text-foreground">{formatDate(data.updatedAt?.seconds ?? data.createdAt?.seconds)}</p>
              </div>
            </div>

            {/* Timeline */}
            {!isNegative && (
              <div className="space-y-0 mb-6">
                {STAGES.map((stage, i) => {
                  const Icon = stage.icon;
                  const done = activeIndex >= 0 && i <= activeIndex;
                  const isCurrent = i === activeIndex;
                  return (
                    <div key={stage.key} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            done ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                          } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                        >
                          <Icon size={14} />
                        </div>
                        {i < STAGES.length - 1 && (
                          <div className={`w-0.5 flex-1 min-h-[24px] ${i < activeIndex ? "bg-primary" : "bg-border"}`} />
                        )}
                      </div>
                      <div className="pb-6">
                        <p className={`text-sm font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>
                          {done ? "✅" : isCurrent ? "🟡" : "⚪"} {stage.label}
                        </p>
                        {isCurrent && <p className="text-xs text-primary mt-0.5">Current status</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Details */}
            <div className="space-y-2 pt-4 border-t border-border text-sm">
              <div className="flex gap-3">
                <span className="text-xs font-semibold text-muted-foreground w-28 flex-shrink-0">Medicine</span>
                <span className="text-foreground">{data.medicineName}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-xs font-semibold text-muted-foreground w-28 flex-shrink-0">Quantity</span>
                <span className="text-foreground">{data.quantity}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-xs font-semibold text-muted-foreground w-28 flex-shrink-0">Current Status</span>
                <span className="text-foreground font-semibold">{STATUS_LABELS[data.status as RequestStatus] ?? data.status}</span>
              </div>
              {data.fullAddress && (
                <div className="flex gap-3">
                  <span className="text-xs font-semibold text-muted-foreground w-28 flex-shrink-0 flex items-center gap-1">
                    <MapPin size={11} /> Address
                  </span>
                  <span className="text-foreground">{data.fullAddress}</span>
                </div>
              )}
              {(data.medicinePrice != null || data.deliveryCharge != null) && (
                <div className="flex gap-3">
                  <span className="text-xs font-semibold text-muted-foreground w-28 flex-shrink-0">Grand Total</span>
                  <span className="text-foreground font-bold">
                    {grandTotal != null ? `₹${grandTotal}` : "Pending pricing"}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-border">
              <a href="tel:+919833273838" className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-all">
                <Phone size={13} /> Call Us
              </a>
              <a
                href={`https://wa.me/919833273838?text=${encodeURIComponent(`Hi, I want an update on my order ${data.requestId}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/20 transition-all"
              >
                <MessageCircle size={13} /> WhatsApp Us
              </a>
            </div>
          </motion.div>
        )}

        {!loading && !error && !data && !searched && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center text-muted-foreground">
            <Clock size={26} className="opacity-40" />
            <p className="text-sm">Enter your Order ID and mobile number above to see live status.</p>
          </div>
        )}
      </div>
    </div>
  );
}
