import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pill, X, Loader2, Phone, MessageCircle, Mail,
  CheckCircle2, Clock, Paperclip, ExternalLink,
  Download, Search, Trash2, Eye,
  WifiOff, ChevronDown, Filter, RefreshCw,
  PackageCheck, PackageX, Truck, ShoppingCart, Ban, Hash,
  AlertCircle, ShieldCheck, IndianRupee, ChefHat, XCircle,
  MapPin, Image as ImageIcon, Save,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { RequestStatus } from "@/lib/orderStatus";
import { buildStatusUpdateMessage } from "@/lib/whatsappMessages";

// ─── Types ────────────────────────────────────────────────────────────────────
// `RequestStatus` is imported from `@/lib/orderStatus` so the admin panel,
// customer Track Order page, and WhatsApp message builder all agree on the
// exact same set of status keys and labels.

type RequestSource = "website" | "whatsapp" | "email";

type MedicineRequest = {
  id: string;
  requestId?: string;
  customerName: string;
  mobileNumber: string;
  whatsappNumber?: string;
  houseNumber?: string;
  street?: string;
  landmark?: string;
  pincode?: string;
  fullAddress?: string;
  deliveryInstructions?: string;
  deliveryEligible?: boolean;
  medicineName: string;
  medicineStrength?: string;
  medicineBrand?: string;
  quantity: string;
  notes?: string;
  source: RequestSource;
  status: RequestStatus;
  prescriptionUrl?: string | null;
  hasPrescription?: boolean;
  medicinePhotoUrl?: string | null;
  medicinePrice?: number | null;
  deliveryCharge?: number | null;
  discount?: number | null;
  grandTotal?: number | null;
  paymentStatus?: string;
  createdAt?: { seconds: number; nanoseconds?: number };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1108].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.frequency.value = freq;
      osc.type = "sine";
      osc.start(t);
      osc.stop(t + 0.55);
    });
    setTimeout(() => ctx.close().catch(() => {}), 2500);
  } catch { /* audio not supported */ }
}

function getTimestampSecs(r: MedicineRequest): number {
  return r.createdAt?.seconds ?? 0;
}

function isToday(secs: number) {
  const d = new Date(secs * 1000);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isYesterday(secs: number) {
  const d = new Date(secs * 1000);
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  return d.toDateString() === yest.toDateString();
}

function isThisWeek(secs: number) {
  const d = new Date(secs * 1000);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return d >= weekStart;
}

function formatDate(secs: number) {
  return new Date(secs * 1000).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatShortDate(secs: number) {
  return new Date(secs * 1000).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short",
  });
}

// ─── Status / Source config ───────────────────────────────────────────────────

const STATUS_CFG: Record<RequestStatus, { label: string; icon: React.ElementType; cls: string }> = {
  "new":                   { label: "New",               icon: AlertCircle,  cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  "pending-verification":  { label: "Pending Verify",     icon: ShieldCheck,  cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  "accepted":              { label: "Accepted",           icon: CheckCircle2, cls: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  "medicine-reserved":     { label: "Medicine Reserved",  icon: ShoppingCart, cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  "rejected":              { label: "Rejected",           icon: XCircle,      cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  "medicine-unavailable":  { label: "Unavailable",        icon: PackageX,     cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  "payment-pending":       { label: "Payment Pending",    icon: IndianRupee,  cls: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  "payment-received":      { label: "Payment Received",   icon: IndianRupee,  cls: "bg-lime-500/10 text-lime-600 dark:text-lime-400" },
  "preparing":             { label: "Preparing",          icon: ChefHat,      cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  "out-for-delivery":      { label: "Out for Delivery",   icon: Truck,        cls: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  "delivered":             { label: "Delivered",          icon: PackageCheck, cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  "cancelled":             { label: "Cancelled",          icon: Ban,          cls: "bg-muted text-muted-foreground" },
};

const STATUS_ORDER: RequestStatus[] = [
  "new", "pending-verification", "accepted", "medicine-reserved", "payment-pending", "payment-received",
  "preparing", "out-for-delivery", "delivered", "medicine-unavailable", "rejected", "cancelled",
];

const SOURCE_CFG: Record<RequestSource, { label: string; cls: string }> = {
  website:  { label: "Website",  cls: "bg-primary/10 text-primary" },
  whatsapp: { label: "WhatsApp", cls: "bg-[#25D366]/10 text-[#25D366]" },
  email:    { label: "Email",    cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
};

// ─── Prescription / Photo Viewer ──────────────────────────────────────────────

function ImageOrFileViewer({ url, label }: { url: string; label: string }) {
  const isImage = /\.(jpg|jpeg|png|gif|webp)/i.test(url) || url.includes("image") || url.includes("cloudinary");
  return (
    <div className="space-y-2">
      {isImage && (
        <div className="rounded-xl overflow-hidden border border-border">
          <img src={url} alt={label} className="w-full max-h-52 object-contain bg-muted/20" />
        </div>
      )}
      <div className="flex gap-2">
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-all">
          <Eye size={13} /> View
        </a>
        <a href={url} download
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-muted text-foreground text-xs font-semibold hover:bg-muted/70 transition-all">
          <Download size={13} /> Download
        </a>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ name, onCancel, onConfirm, loading }: {
  name: string; onCancel: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6"
      >
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <Trash2 size={20} className="text-destructive" />
        </div>
        <h3 className="text-base font-bold text-foreground mb-1">Delete Request</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Delete request from <strong>{name}</strong>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-destructive text-white text-sm font-semibold hover:bg-destructive/90 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Pricing Panel ────────────────────────────────────────────────────────────

function PricingPanel({ req, onSave }: {
  req: MedicineRequest;
  onSave: (fields: { medicinePrice: number; deliveryCharge: number; discount: number; grandTotal: number }) => Promise<void>;
}) {
  const [medicinePrice, setMedicinePrice] = useState(String(req.medicinePrice ?? ""));
  const [deliveryCharge, setDeliveryCharge] = useState(String(req.deliveryCharge ?? ""));
  const [discount, setDiscount] = useState(String(req.discount ?? "0"));
  const [saving, setSaving] = useState(false);

  const mp = parseFloat(medicinePrice) || 0;
  const dc = parseFloat(deliveryCharge) || 0;
  const disc = parseFloat(discount) || 0;
  const grandTotal = Math.max(0, mp + dc - disc);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ medicinePrice: mp, deliveryCharge: dc, discount: disc, grandTotal });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Medicine Price (₹)</label>
          <input
            type="number" min="0" value={medicinePrice}
            onChange={(e) => setMedicinePrice(e.target.value)}
            data-testid="input-medicine-price"
            className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Delivery Charge (₹)</label>
          <input
            type="number" min="0" value={deliveryCharge}
            onChange={(e) => setDeliveryCharge(e.target.value)}
            data-testid="input-delivery-charge"
            className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Discount (₹)</label>
          <input
            type="number" min="0" value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            data-testid="input-discount"
            className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
        <span className="text-xs font-semibold text-foreground">Grand Total</span>
        <span className="text-base font-bold text-primary">₹{grandTotal.toFixed(2)}</span>
      </div>
      <button
        onClick={handleSave}
        disabled={saving || mp <= 0}
        data-testid="button-save-pricing"
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all"
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
        Save Pricing & Send to Customer
      </button>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function RequestDetailModal({ req, onClose, onUpdateStatus, onDelete, onSavePricing }: {
  req: MedicineRequest;
  onClose: () => void;
  onUpdateStatus: (s: RequestStatus) => Promise<void>;
  onDelete: () => void;
  onSavePricing: (fields: { medicinePrice: number; deliveryCharge: number; discount: number; grandTotal: number }) => Promise<void>;
}) {
  const [updatingStatus, setUpdatingStatus] = useState<RequestStatus | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const secs = getTimestampSecs(req);
  const Cfg = STATUS_CFG[req.status] ?? STATUS_CFG.new;
  const SrcCfg = SOURCE_CFG[req.source] ?? SOURCE_CFG.website;

  const buildWAReply = () =>
    `Hi ${req.customerName}, this is Ayush Medico regarding your medicine request for *${req.medicineName}* (Qty: ${req.quantity}). `;

  const buildEmailReply = () =>
    `Dear ${req.customerName},\n\nThank you for your request for ${req.medicineName} (Qty: ${req.quantity}).\n\nWe wanted to update you regarding your request.\n\nBest regards,\nAyush Medico Team\nKurla West, Mumbai`;

  const handleStatusChange = async (s: RequestStatus) => {
    if (s === req.status) return;
    setUpdatingStatus(s);
    await onUpdateStatus(s);
    setUpdatingStatus(null);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
      setShowDeleteConfirm(false);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const fields = [
    { label: "Request ID",  value: req.requestId || req.id.slice(0, 8).toUpperCase() },
    { label: "Customer",    value: req.customerName },
    { label: "Mobile",      value: req.mobileNumber },
    { label: "WhatsApp",    value: req.whatsappNumber || req.mobileNumber },
    { label: "Medicine",    value: `${req.medicineName}${req.medicineStrength ? ` (${req.medicineStrength})` : ""}` },
    { label: "Brand Pref.", value: req.medicineBrand || "—" },
    { label: "Quantity",    value: req.quantity },
    { label: "Source",      value: SrcCfg.label },
    { label: "Notes",       value: req.notes || "—" },
    { label: "Received",    value: secs ? formatDate(secs) : "—" },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
            <div>
              <h3 className="text-base font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Medicine Request
              </h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${Cfg.cls}`}>
                  <Cfg.icon size={10} /> {Cfg.label}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${SrcCfg.cls}`}>
                  {SrcCfg.label}
                </span>
                {req.deliveryEligible === false && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive">
                    Outside Zone
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
            <div className="space-y-2.5">
              {fields.map(({ label, value }) => (
                <div key={label} className="flex gap-3 text-sm">
                  <span className="text-xs font-semibold text-muted-foreground w-24 flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-foreground break-words min-w-0">{value}</span>
                </div>
              ))}
              {req.fullAddress && (
                <div className="flex gap-3 text-sm">
                  <span className="text-xs font-semibold text-muted-foreground w-24 flex-shrink-0 pt-0.5 flex items-center gap-1">
                    <MapPin size={11} /> Address
                  </span>
                  <span className="text-foreground break-words min-w-0">{req.fullAddress}</span>
                </div>
              )}
              {req.deliveryInstructions && (
                <div className="flex gap-3 text-sm">
                  <span className="text-xs font-semibold text-muted-foreground w-24 flex-shrink-0 pt-0.5">Instructions</span>
                  <span className="text-foreground break-words min-w-0">{req.deliveryInstructions}</span>
                </div>
              )}
            </div>

            {/* Prescription */}
            {req.hasPrescription && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Paperclip size={13} className="text-primary" />
                  <p className="text-xs font-semibold text-foreground">Prescription</p>
                </div>
                {req.prescriptionUrl ? (
                  <ImageOrFileViewer url={req.prescriptionUrl} label="Prescription" />
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border text-muted-foreground text-xs">
                    <Loader2 size={13} className="animate-spin" />
                    Prescription is being uploaded…
                  </div>
                )}
              </div>
            )}

            {/* Medicine photo */}
            {req.medicinePhotoUrl && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon size={13} className="text-primary" />
                  <p className="text-xs font-semibold text-foreground">Medicine Photo</p>
                </div>
                <ImageOrFileViewer url={req.medicinePhotoUrl} label="Medicine" />
              </div>
            )}

            {/* Pricing */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <IndianRupee size={12} /> Pricing
              </p>
              <PricingPanel req={req} onSave={onSavePricing} />
            </div>

            {/* Status update */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Update Status</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_ORDER.map((s) => {
                  const cfg = STATUS_CFG[s];
                  const Icon = cfg.icon;
                  const isActive = req.status === s;
                  const isLoading = updatingStatus === s;
                  return (
                    <button
                      key={s}
                      disabled={!!updatingStatus || isActive}
                      onClick={() => handleStatusChange(s)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive ? cfg.cls + " ring-1 ring-current" : "bg-muted text-muted-foreground hover:bg-muted/70 disabled:opacity-50"
                      }`}
                    >
                      {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 pt-3 border-t border-border flex-shrink-0 space-y-2">
            <a
              href={`https://wa.me/91${(req.whatsappNumber || req.mobileNumber).replace(/\D/g, "")}?text=${encodeURIComponent(buildStatusUpdateMessage({
                customerName: req.customerName,
                requestId: req.requestId,
                medicineName: req.medicineName,
                status: req.status,
                grandTotal: req.grandTotal,
                medicinePrice: req.medicinePrice,
                deliveryCharge: req.deliveryCharge,
                fullAddress: req.fullAddress,
              }))}`}
              target="_blank" rel="noopener noreferrer"
              data-testid="button-send-status-whatsapp"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-bold shadow-sm hover:bg-[#1ebe57] transition-all">
              <MessageCircle size={13} /> Send Status Update on WhatsApp
            </a>
            <div className="grid grid-cols-2 gap-2">
              <a href={`tel:${req.mobileNumber}`}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-all">
                <Phone size={13} /> Call Customer
              </a>
              <a
                href={`https://wa.me/91${(req.whatsappNumber || req.mobileNumber).replace(/\D/g, "")}?text=${encodeURIComponent(buildWAReply())}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/20 transition-all">
                <MessageCircle size={13} /> Reply on WhatsApp
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(`Re: Medicine Request — ${req.medicineName} | Ayush Medico`)}&body=${encodeURIComponent(buildEmailReply())}`}
                className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-muted text-foreground text-xs font-semibold hover:bg-muted/70 transition-all">
                <Mail size={13} /> Reply via Email
              </a>
              {req.prescriptionUrl && (
                <a href={req.prescriptionUrl} target="_blank" rel="noopener noreferrer"
                  className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-xl text-primary text-xs font-semibold hover:bg-primary/5 transition-all">
                  <ExternalLink size={13} /> View Prescription
                </a>
              )}
            </div>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-destructive text-xs font-semibold hover:bg-destructive/5 transition-all">
              <Trash2 size={13} /> Delete Request
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <DeleteConfirm
            name={req.customerName}
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            loading={deleting}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type DateFilter = "all" | "today" | "yesterday" | "week";
type StatusFilter = "all" | RequestStatus;
type SourceFilter = "all" | RequestSource;

export default function MedicineRequestsPage() {
  const [requests, setRequests] = useState<MedicineRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [selected, setSelected] = useState<MedicineRequest | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const prevPendingRef = useRef(-1);
  const initialLoadDone = useRef(false);

  // Normalize PG row → UI MedicineRequest type
  const normalizeRow = (row: Record<string, unknown>): MedicineRequest => ({
    ...row,
    id: String(row.id),
    medicineName: (row.medicineName as string) || "—",
    quantity: (row.quantity as string) || "1",
    source: (row.source as RequestSource) || "website",
    status: (row.status as RequestStatus) || "new",
    createdAt: row.createdAt
      ? { seconds: Math.floor(new Date(row.createdAt as string).getTime() / 1000) }
      : undefined,
  } as MedicineRequest);

  const loadRequests = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/inquiries?type=medicine-request", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Fetch failed");
      const { data } = await res.json() as { data: Record<string, unknown>[] };
      const normalized = (data ?? []).map(normalizeRow);
      const pendingCount = normalized.filter((d) => d.status === "new").length;

      if (initialLoadDone.current && pendingCount > prevPendingRef.current && prevPendingRef.current >= 0) {
        playChime();
        toast({ title: "🔔 New Medicine Request", description: "A new request just arrived!" });
      }

      prevPendingRef.current = pendingCount;
      initialLoadDone.current = true;
      setRequests(normalized);
      setLoading(false);
      setError(false);

      setSelected((prev) => {
        if (!prev) return null;
        return normalized.find((d) => d.id === prev.id) ?? null;
      });
    } catch {
      setLoading(false);
      setError(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 30_000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  const handleUpdateStatus = useCallback(async (req: MedicineRequest, status: RequestStatus) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/inquiries/${req.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      await loadRequests();
    } catch (err) {
      console.error("[MedicineRequestsPage] Status update failed:", err);
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }, [loadRequests]);

  const handleSavePricing = useCallback(async (req: MedicineRequest, fields: { medicinePrice: number; deliveryCharge: number; discount: number; grandTotal: number }) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const newStatus = req.status === "new" || req.status === "pending-verification" ? "accepted" : req.status;
      const res = await fetch(`/api/inquiries/${req.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...fields, status: newStatus }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Pricing saved", description: "Customer can now proceed to payment." });
      await loadRequests();
    } catch (err) {
      console.error("[MedicineRequestsPage] Pricing save failed:", err);
      toast({ variant: "destructive", title: "Failed to save pricing" });
    }
  }, [loadRequests]);

  const handleDelete = useCallback(async (req: MedicineRequest) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/inquiries/${req.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Request deleted" });
      await loadRequests();
    } catch (err) {
      console.error("[MedicineRequestsPage] Delete failed:", err);
      toast({ variant: "destructive", title: "Failed to delete request" });
    }
  }, [loadRequests]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const total       = requests.length;
  const newCount     = requests.filter((r) => r.status === "new").length;
  const pendingVerify = requests.filter((r) => r.status === "pending-verification").length;
  const accepted     = requests.filter((r) => r.status === "accepted").length;
  const paymentPending = requests.filter((r) => r.status === "payment-pending").length;
  const paymentReceived = requests.filter((r) => r.status === "payment-received").length;
  const preparing    = requests.filter((r) => r.status === "preparing").length;
  const outForDelivery = requests.filter((r) => r.status === "out-for-delivery").length;
  const delivered    = requests.filter((r) => r.status === "delivered").length;
  const cancelled    = requests.filter((r) => r.status === "cancelled" || r.status === "rejected" || r.status === "medicine-unavailable").length;
  const todayCount   = requests.filter((r) => isToday(getTimestampSecs(r))).length;

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = requests.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !r.customerName.toLowerCase().includes(q) &&
        !r.medicineName.toLowerCase().includes(q) &&
        !r.mobileNumber.includes(q) &&
        !(r.requestId ?? "").toLowerCase().includes(q)
      ) return false;
    }
    const secs = getTimestampSecs(r);
    if (dateFilter === "today"     && !isToday(secs))     return false;
    if (dateFilter === "yesterday" && !isYesterday(secs)) return false;
    if (dateFilter === "week"      && !isThisWeek(secs))  return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
    return true;
  });

  const hasActiveFilters = dateFilter !== "all" || statusFilter !== "all" || sourceFilter !== "all" || !!search;

  const resetFilters = () => {
    setDateFilter("all");
    setStatusFilter("all");
    setSourceFilter("all");
    setSearch("");
  };

  const statCards = [
    { label: "Total",           value: total,          cls: "text-foreground" },
    { label: "New",             value: newCount,       cls: "text-blue-600 dark:text-blue-400" },
    { label: "Pending Verify",  value: pendingVerify,  cls: "text-amber-600 dark:text-amber-400" },
    { label: "Accepted",        value: accepted,       cls: "text-teal-600 dark:text-teal-400" },
    { label: "Payment Pending", value: paymentPending, cls: "text-orange-600 dark:text-orange-400" },
    { label: "Payment Done",    value: paymentReceived,cls: "text-lime-600 dark:text-lime-400" },
    { label: "Preparing",       value: preparing,      cls: "text-violet-600 dark:text-violet-400" },
    { label: "Out for Delivery",value: outForDelivery, cls: "text-cyan-600 dark:text-cyan-400" },
    { label: "Delivered",       value: delivered,      cls: "text-emerald-600 dark:text-emerald-400" },
    { label: "Cancelled",       value: cancelled,      cls: "text-rose-600 dark:text-rose-400" },
    { label: "Today",           value: todayCount,     cls: "text-primary" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Medicine Requests
            {newCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-5.5 px-1.5 rounded-full bg-primary text-white text-xs font-bold animate-pulse">
                {newCount}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {total} total · {newCount} new · {todayCount} today
          </p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
          <WifiOff size={16} className="text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-destructive">Could not load requests</p>
            <p className="text-xs text-destructive/70 mt-0.5">
              Failed to load requests from the API server. Check that the API server is running.
            </p>
          </div>
          <button onClick={() => window.location.reload()}
            className="flex-shrink-0 flex items-center gap-1 text-xs text-destructive font-semibold hover:underline">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-5">
        {statCards.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center shadow-sm">
            <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, medicine, phone, or request ID…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
            hasActiveFilters ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <Filter size={14} />
          Filters
          {hasActiveFilters && (
            <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">
              {[dateFilter !== "all", statusFilter !== "all", sourceFilter !== "all"].filter(Boolean).length}
            </span>
          )}
          <ChevronDown size={12} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
        {hasActiveFilters && (
          <button onClick={resetFilters}
            className="px-3 py-2.5 rounded-xl border border-border bg-card text-xs text-muted-foreground hover:text-foreground transition-all">
            Clear
          </button>
        )}
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              {/* Date */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Date Range</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["all", "today", "yesterday", "week"] as DateFilter[]).map((f) => (
                    <button key={f} onClick={() => setDateFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all capitalize ${dateFilter === f ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                      {f === "all" ? "All Time" : f === "week" ? "This Week" : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${statusFilter === "all" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                    All
                  </button>
                  {STATUS_ORDER.map((s) => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${statusFilter === s ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                      {STATUS_CFG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Source</p>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setSourceFilter("all")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${sourceFilter === "all" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                    All Sources
                  </button>
                  {(Object.entries(SOURCE_CFG) as [RequestSource, (typeof SOURCE_CFG)[RequestSource]][]).map(([src, cfg]) => (
                    <button key={src} onClick={() => setSourceFilter(src)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${sourceFilter === src ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      {hasActiveFilters && !loading && (
        <p className="text-xs text-muted-foreground mb-2 px-1">
          Showing {filtered.length} of {total} requests
        </p>
      )}

      {/* List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 size={22} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading medicine requests…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <PackageX size={26} className="opacity-50" />
            <p className="text-sm font-medium">
              {hasActiveFilters ? "No requests match your filters" : "No medicine requests yet"}
            </p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-xs text-primary hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <>
            {/* Table header — desktop */}
            <div className="hidden sm:grid grid-cols-[1.5fr_2fr_2fr_1.5fr_1fr_1.3fr_1fr_auto] gap-3 px-4 py-2.5 border-b border-border bg-muted/30">
              {["ID", "Customer", "Medicine", "Phone", "Source", "Status", "Date", ""].map((h) => (
                <p key={h} className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{h}</p>
              ))}
            </div>

            <div className="divide-y divide-border">
              {filtered.map((req) => {
                const Cfg = STATUS_CFG[req.status] ?? STATUS_CFG.new;
                const SrcCfg = SOURCE_CFG[req.source] ?? SOURCE_CFG.website;
                const StatusIcon = Cfg.icon;
                const secs = getTimestampSecs(req);

                return (
                  <div key={req.id} className="group">
                    {/* Desktop row */}
                    <div className="hidden sm:grid grid-cols-[1.5fr_2fr_2fr_1.5fr_1fr_1.3fr_1fr_auto] gap-3 items-center px-4 py-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-1 min-w-0">
                        <Hash size={10} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate font-mono">
                          {req.requestId?.slice(-8) ?? req.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{req.customerName}</p>
                        {req.hasPrescription && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-primary mt-0.5">
                            <Paperclip size={9} /> Rx
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{req.medicineName}</p>
                      <p className="text-sm text-muted-foreground">{req.mobileNumber}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${SrcCfg.cls} w-fit`}>
                        {SrcCfg.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${Cfg.cls} w-fit`}>
                        <StatusIcon size={9} /> {Cfg.label}
                      </span>
                      <p className="text-xs text-muted-foreground">{secs ? formatShortDate(secs) : "—"}</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelected(req)} title="View"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                          <Eye size={14} />
                        </button>
                        <a href={`tel:${req.mobileNumber}`} title="Call"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-secondary hover:bg-secondary/10 transition-all">
                          <Phone size={14} />
                        </a>
                        <a href={`https://wa.me/91${(req.whatsappNumber || req.mobileNumber).replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${req.customerName}, this is Ayush Medico regarding your request for *${req.medicineName}*. `)}`}
                          target="_blank" rel="noopener noreferrer" title="WhatsApp"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-[#25D366] hover:bg-[#25D366]/10 transition-all">
                          <MessageCircle size={14} />
                        </a>
                        {req.status !== "delivered" && (
                          <button onClick={() => handleUpdateStatus(req, "delivered")} title="Mark Delivered"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-all">
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="sm:hidden flex items-center gap-3 px-4 py-3.5 hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => setSelected(req)}>
                      <div className={`p-2 rounded-xl flex-shrink-0 ${Cfg.cls}`}>
                        <StatusIcon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{req.customerName}</p>
                          {req.hasPrescription && <Paperclip size={10} className="text-primary flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{req.medicineName} · {req.mobileNumber}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${SrcCfg.cls}`}>
                          {SrcCfg.label}
                        </span>
                        <p className="text-[10px] text-muted-foreground">{secs ? formatShortDate(secs) : "—"}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <RequestDetailModal
            req={selected}
            onClose={() => setSelected(null)}
            onUpdateStatus={(s) => handleUpdateStatus(selected, s)}
            onDelete={() => handleDelete(selected)}
            onSavePricing={(fields) => handleSavePricing(selected, fields)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
