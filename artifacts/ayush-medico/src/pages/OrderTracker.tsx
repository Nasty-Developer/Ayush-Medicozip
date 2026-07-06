import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
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
} from "lucide-react";
import { getCollection, where } from "@/lib/firestoreHelpers";
import { isFirebaseConfigured } from "@/lib/firebase";

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
};

const STAGES = [
  { key: "new", label: "Request Received", icon: PackageSearch },
  { key: "pending-verification", label: "Pharmacist Verifying", icon: ShieldCheck },
  { key: "accepted", label: "Accepted & Priced", icon: CheckCircle2 },
  { key: "payment-pending", label: "Payment Pending", icon: IndianRupee },
  { key: "payment-received", label: "Payment Received", icon: IndianRupee },
  { key: "preparing", label: "Preparing Order", icon: ChefHat },
  { key: "out-for-delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: PackageCheck },
];

const TERMINAL_NEGATIVE = ["cancelled", "rejected", "medicine-unavailable"];

function formatDate(secs?: number) {
  if (!secs) return "—";
  return new Date(secs * 1000).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function StatusBanner({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
    cancelled: { label: "This request was cancelled.", cls: "bg-destructive/10 text-destructive", icon: Ban },
    rejected: { label: "This request was not accepted.", cls: "bg-destructive/10 text-destructive", icon: XCircle },
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

function useTrackedRequest(requestId: string | undefined) {
  const [data, setData] = useState<TrackedRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    setData(null);
    (async () => {
      try {
        if (!isFirebaseConfigured) {
          setError("Tracking is temporarily unavailable.");
          return;
        }
        const docs = await getCollection(
          "inquiries",
          [where("requestId", "==", requestId.trim().toUpperCase())],
          `track_${requestId}`,
        );
        if (!docs.length) {
          setError("We couldn't find a request with that ID. Please check and try again.");
          return;
        }
        setData(docs[0] as TrackedRequest);
      } catch (err) {
        console.error("[OrderTracker] Lookup failed:", err);
        setError("Something went wrong while looking up your request.");
      } finally {
        setLoading(false);
      }
    })();
  }, [requestId]);

  return { data, loading, error };
}

export default function OrderTracker() {
  const params = useParams<{ requestId?: string }>();
  const [, navigate] = useLocation();
  const [inputId, setInputId] = useState(params.requestId || "");
  const { data, loading, error } = useTrackedRequest(params.requestId);

  const activeIndex = data ? STAGES.findIndex((s) => s.key === data.status) : -1;
  const isNegative = data ? TERMINAL_NEGATIVE.includes(data.status) : false;

  const computedTotal =
    (data?.medicinePrice || 0) + (data?.deliveryCharge || 0) - (data?.discount || 0);
  const grandTotal = data?.grandTotal ?? (computedTotal || null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputId.trim()) navigate(`/track/${inputId.trim().toUpperCase()}`);
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
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              placeholder="Enter your Request ID e.g. REQ-20260706-AB12"
              data-testid="input-track-request-id"
              className="w-full pl-9 pr-4 py-3 text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          <button
            type="submit"
            data-testid="button-track-search"
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
          >
            <Search size={16} /> Track
          </button>
        </form>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 size={24} className="animate-spin text-primary" />
            <p className="text-sm">Looking up your request…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <XCircle size={28} className="text-destructive/60" />
            <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
          </div>
        )}

        {!loading && data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl shadow-sm p-6"
          >
            <StatusBanner status={data.status} />

            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-muted-foreground">Request ID</p>
                <p className="text-sm font-bold font-mono text-foreground">{data.requestId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Placed On</p>
                <p className="text-sm text-foreground">{formatDate(data.createdAt?.seconds)}</p>
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
                          {stage.label}
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
                <span className="text-foreground">{data.medicineName} (Qty: {data.quantity})</span>
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

        {!loading && !error && !data && !params.requestId && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center text-muted-foreground">
            <Clock size={26} className="opacity-40" />
            <p className="text-sm">Enter your Request ID above to see live status.</p>
          </div>
        )}
      </div>
    </div>
  );
}
