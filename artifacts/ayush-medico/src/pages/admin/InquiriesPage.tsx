import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, X, Loader2, Phone, MessageCircle, Mail,
  AlertCircle, CheckCircle2, Clock, Paperclip, ExternalLink,
  Download, Search, Trash2, Eye, RefreshCw,
  WifiOff, ChevronDown, Filter, Ban, Hash, RotateCcw,
} from "lucide-react";
import {
  subscribeToCollection, updateDocument, deleteDocument, orderBy
} from "@/lib/firestoreHelpers";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

// New statuses — old records may carry legacy values; we handle both.
type InquiryStatus = "pending" | "replied" | "follow-up" | "resolved" | "closed";
type LegacyStatus  = "new" | "in-progress" | "completed" | "cancelled";
type AnyStatus     = InquiryStatus | LegacyStatus;

type InquirySource = "website" | "whatsapp" | "email" | "normal";

type Inquiry = {
  id: string;
  type?: string;            // "inquiry" | "medicine-request" — filters out requests that belong in MedicineRequestsPage
  // New schema fields
  inquiryId?: string;
  subject?: string;
  message?: string;
  preferredContact?: "phone" | "whatsapp" | "email";
  source?: InquirySource;
  // Legacy fields (medicine requests stored here before MedicineRequestsPage)
  medicineName?: string;
  quantity?: string;
  channel?: InquirySource; // old field name for source
  // Common
  customerName: string;
  mobileNumber: string;
  email?: string;
  notes?: string;
  status: AnyStatus;
  prescriptionUrl?: string | null;
  hasPrescription?: boolean;
  createdAt?: { seconds: number; nanoseconds?: number };
};

// ─── Normalize legacy → current ───────────────────────────────────────────────

function normalizeStatus(s: AnyStatus): InquiryStatus {
  const map: Record<LegacyStatus, InquiryStatus> = {
    "new":         "pending",
    "in-progress": "replied",
    "completed":   "resolved",
    "cancelled":   "closed",
  };
  return (map as Record<string, InquiryStatus>)[s] ?? (s as InquiryStatus);
}

function getSource(inq: Inquiry): InquirySource {
  return inq.source ?? inq.channel ?? "website";
}

function getSubjectDisplay(inq: Inquiry): string {
  if (inq.subject) return inq.subject;
  if (inq.medicineName) return `Medicine: ${inq.medicineName}${inq.quantity ? ` (${inq.quantity})` : ""}`;
  return "General Inquiry";
}

function getMessageDisplay(inq: Inquiry): string {
  if (inq.message) return inq.message;
  if (inq.notes) return inq.notes;
  return "—";
}

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

function getTimestampSecs(inq: Inquiry): number {
  return inq.createdAt?.seconds ?? 0;
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

const STATUS_CFG: Record<InquiryStatus, { label: string; icon: React.ElementType; cls: string }> = {
  pending:     { label: "Pending",     icon: AlertCircle,  cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  replied:     { label: "Replied",     icon: MessageSquare,cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  "follow-up": { label: "Follow Up",  icon: RotateCcw,    cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  resolved:    { label: "Resolved",   icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  closed:      { label: "Closed",     icon: Ban,          cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
};

const SOURCE_CFG: Record<InquirySource, { label: string; cls: string }> = {
  website:  { label: "Website",  cls: "bg-primary/10 text-primary" },
  whatsapp: { label: "WhatsApp", cls: "bg-[#25D366]/10 text-[#25D366]" },
  email:    { label: "Email",    cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  normal:   { label: "Direct",   cls: "bg-muted text-muted-foreground" },
};

// ─── Prescription Viewer ──────────────────────────────────────────────────────

function PrescriptionViewer({ url }: { url: string }) {
  const isImage = /\.(jpg|jpeg|png|gif|webp)/i.test(url) || url.includes("image") || url.includes("cloudinary");
  return (
    <div className="space-y-2">
      {isImage && (
        <div className="rounded-xl overflow-hidden border border-border">
          <img src={url} alt="Prescription" className="w-full max-h-52 object-contain bg-muted/20" />
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
        <h3 className="text-base font-bold text-foreground mb-1">Delete Inquiry</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Delete inquiry from <strong>{name}</strong>? This cannot be undone.
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

// ─── Inquiry Detail Modal ─────────────────────────────────────────────────────

function InquiryDetailModal({ inquiry, onClose, onUpdateStatus, onDelete }: {
  inquiry: Inquiry;
  onClose: () => void;
  onUpdateStatus: (s: InquiryStatus) => Promise<void>;
  onDelete: () => void;
}) {
  const [updatingStatus, setUpdatingStatus] = useState<InquiryStatus | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const secs = getTimestampSecs(inquiry);
  const currentStatus = normalizeStatus(inquiry.status);
  const Cfg = STATUS_CFG[currentStatus];
  const src = getSource(inquiry);
  const SrcCfg = SOURCE_CFG[src] ?? SOURCE_CFG.website;
  const displayId = inquiry.inquiryId ?? inquiry.id.slice(0, 8).toUpperCase();

  const buildWAReply = () =>
    `Hi ${inquiry.customerName}, this is Ayush Medico regarding your inquiry. `;

  const buildEmailReply = () => {
    const subj = getSubjectDisplay(inquiry);
    return `Dear ${inquiry.customerName},\n\nThank you for your inquiry: "${subj}".\n\nWe will get back to you shortly.\n\nBest regards,\nAyush Medico Team\nKurla West, Mumbai`;
  };

  const handleStatusChange = async (s: InquiryStatus) => {
    if (s === currentStatus) return;
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
    { label: "Inquiry ID",   value: displayId },
    { label: "Customer",     value: inquiry.customerName },
    { label: "Mobile",       value: inquiry.mobileNumber },
    { label: "Email",        value: inquiry.email || "—" },
    { label: "Subject",      value: getSubjectDisplay(inquiry) },
    { label: "Message",      value: getMessageDisplay(inquiry) },
    inquiry.preferredContact
      ? { label: "Pref. Contact", value: inquiry.preferredContact }
      : null,
    { label: "Source",       value: SrcCfg.label },
    { label: "Received",     value: secs ? formatDate(secs) : "—" },
  ].filter(Boolean) as { label: string; value: string }[];

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
                Inquiry Details
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${Cfg.cls}`}>
                  <Cfg.icon size={10} /> {Cfg.label}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${SrcCfg.cls}`}>
                  {SrcCfg.label}
                </span>
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
                  <span className="text-foreground break-words min-w-0 whitespace-pre-wrap">{value}</span>
                </div>
              ))}
            </div>

            {/* Prescription (legacy inquiries) */}
            {inquiry.hasPrescription && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Paperclip size={13} className="text-primary" />
                  <p className="text-xs font-semibold text-foreground">Prescription</p>
                </div>
                {inquiry.prescriptionUrl ? (
                  <PrescriptionViewer url={inquiry.prescriptionUrl} />
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border text-muted-foreground text-xs">
                    <Loader2 size={13} className="animate-spin" /> Prescription is being uploaded…
                  </div>
                )}
              </div>
            )}

            {/* Status update */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Update Status</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(STATUS_CFG) as [InquiryStatus, (typeof STATUS_CFG)[InquiryStatus]][]).map(([s, cfg]) => {
                  const Icon = cfg.icon;
                  const isActive = currentStatus === s;
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
            <div className="grid grid-cols-2 gap-2">
              <a href={`tel:${inquiry.mobileNumber}`}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-all">
                <Phone size={13} /> Call Customer
              </a>
              <a
                href={`https://wa.me/91${inquiry.mobileNumber.replace(/\D/g, "")}?text=${encodeURIComponent(buildWAReply())}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/20 transition-all">
                <MessageCircle size={13} /> Reply on WhatsApp
              </a>
              {inquiry.email ? (
                <a
                  href={`mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: ${getSubjectDisplay(inquiry)} — Ayush Medico`)}&body=${encodeURIComponent(buildEmailReply())}`}
                  className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-muted text-foreground text-xs font-semibold hover:bg-muted/70 transition-all">
                  <Mail size={13} /> Reply via Email
                </a>
              ) : null}
              {inquiry.prescriptionUrl && (
                <a href={inquiry.prescriptionUrl} target="_blank" rel="noopener noreferrer"
                  className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-xl text-primary text-xs font-semibold hover:bg-primary/5 transition-all">
                  <ExternalLink size={13} /> View Prescription
                </a>
              )}
            </div>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-destructive text-xs font-semibold hover:bg-destructive/5 transition-all">
              <Trash2 size={13} /> Delete Inquiry
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <DeleteConfirm
            name={inquiry.customerName}
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

type DateFilter   = "all" | "today" | "yesterday" | "week";
type StatusFilter = "all" | InquiryStatus;
type SourceFilter = "all" | InquirySource;

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const prevPendingRef = useRef(-1);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    const unsub = subscribeToCollection(
      "inquiries",
      [orderBy("createdAt", "desc")],
      (docs) => {
        // Exclude medicine-request type — those belong in MedicineRequestsPage
        const data = (docs as Inquiry[]).filter((d) => d.type !== "medicine-request");
        const pendingCount = data.filter((d) => normalizeStatus(d.status) === "pending").length;

        if (initialLoadDone.current && pendingCount > prevPendingRef.current && prevPendingRef.current >= 0) {
          playChime();
          toast({ title: "🔔 New Inquiry", description: "A new inquiry just arrived!" });
        }

        prevPendingRef.current = pendingCount;
        initialLoadDone.current = true;
        setInquiries(data);
        setLoading(false);
        setError(false);

        setSelected((prev) => {
          if (!prev) return null;
          return data.find((d) => d.id === prev.id) ?? null;
        });
      },
      () => { setLoading(false); setError(true); }
    );
    return unsub;
  }, []);

  const handleUpdateStatus = useCallback(async (inquiry: Inquiry, status: InquiryStatus) => {
    try {
      await updateDocument("inquiries", inquiry.id, { status });
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    }
  }, []);

  const handleDelete = useCallback(async (inquiry: Inquiry) => {
    try {
      await deleteDocument("inquiries", inquiry.id);
      toast({ title: "Inquiry deleted" });
    } catch {
      toast({ variant: "destructive", title: "Failed to delete inquiry" });
    }
  }, []);

  // ── Stats ────────────────────────────────────────────────────────────────
  const total       = inquiries.length;
  const pending     = inquiries.filter((i) => normalizeStatus(i.status) === "pending").length;
  const resolved    = inquiries.filter((i) => normalizeStatus(i.status) === "resolved").length;
  const todayCount  = inquiries.filter((i) => isToday(getTimestampSecs(i))).length;
  const waCnt       = inquiries.filter((i) => getSource(i) === "whatsapp").length;
  const emailCnt    = inquiries.filter((i) => getSource(i) === "email").length;
  const webCnt      = inquiries.filter((i) => ["website", "normal"].includes(getSource(i))).length;

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = inquiries.filter((inq) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !inq.customerName.toLowerCase().includes(q) &&
        !inq.mobileNumber.includes(q) &&
        !(inq.email ?? "").toLowerCase().includes(q) &&
        !(inq.subject ?? "").toLowerCase().includes(q) &&
        !(inq.inquiryId ?? "").toLowerCase().includes(q)
      ) return false;
    }
    const secs = getTimestampSecs(inq);
    if (dateFilter === "today"     && !isToday(secs))     return false;
    if (dateFilter === "yesterday" && !isYesterday(secs)) return false;
    if (dateFilter === "week"      && !isThisWeek(secs))  return false;
    if (statusFilter !== "all" && normalizeStatus(inq.status) !== statusFilter) return false;
    if (sourceFilter !== "all") {
      const src = getSource(inq);
      // "website" filter matches both website and normal
      if (sourceFilter === "website" && src !== "website" && src !== "normal") return false;
      if (sourceFilter !== "website" && src !== sourceFilter) return false;
    }
    return true;
  });

  const hasActiveFilters = dateFilter !== "all" || statusFilter !== "all" || sourceFilter !== "all" || !!search;

  const resetFilters = () => {
    setDateFilter("all");
    setStatusFilter("all");
    setSourceFilter("all");
    setSearch("");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Inquiries
            {pending > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-5.5 px-1.5 rounded-full bg-primary text-white text-xs font-bold animate-pulse">
                {pending}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {total} total · {pending} pending · {todayCount} today
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
          <WifiOff size={16} className="text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-destructive">Could not load inquiries</p>
            <p className="text-xs text-destructive/70 mt-0.5">
              Check your Firestore rules — publish the rules from <code className="bg-destructive/10 px-1 rounded">firestore.rules</code> in Firebase Console.
            </p>
          </div>
          <button onClick={() => window.location.reload()}
            className="flex-shrink-0 flex items-center gap-1 text-xs text-destructive font-semibold hover:underline">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
        {[
          { label: "Total",    value: total,      cls: "text-foreground" },
          { label: "Pending",  value: pending,    cls: "text-blue-600 dark:text-blue-400" },
          { label: "Resolved", value: resolved,   cls: "text-emerald-600 dark:text-emerald-400" },
          { label: "Today",    value: todayCount, cls: "text-amber-600 dark:text-amber-400" },
          { label: "WhatsApp", value: waCnt,      cls: "text-[#25D366]" },
          { label: "Email",    value: emailCnt,   cls: "text-primary" },
          { label: "Website",  value: webCnt,     cls: "text-violet-600 dark:text-violet-400" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center shadow-sm">
            <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter toggle */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, subject, or inquiry ID…"
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

      {/* Filter panel */}
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
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${dateFilter === f ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
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
                  {(Object.entries(STATUS_CFG) as [InquiryStatus, (typeof STATUS_CFG)[InquiryStatus]][]).map(([s, cfg]) => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${statusFilter === s ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Source</p>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { value: "all",      label: "All Sources" },
                    { value: "website",  label: `Website (${webCnt})` },
                    { value: "whatsapp", label: `WhatsApp (${waCnt})` },
                    { value: "email",    label: `Email (${emailCnt})` },
                  ] as { value: SourceFilter; label: string }[]).map((f) => (
                    <button key={f.value} onClick={() => setSourceFilter(f.value)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${sourceFilter === f.value ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                      {f.label}
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
          Showing {filtered.length} of {total} inquiries
        </p>
      )}

      {/* List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 size={22} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading inquiries…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <MessageSquare size={26} className="opacity-50" />
            <p className="text-sm font-medium">
              {hasActiveFilters ? "No inquiries match your filters" : "No inquiries yet"}
            </p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-xs text-primary hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <>
            {/* Table header — desktop */}
            <div className="hidden sm:grid grid-cols-[1.5fr_2fr_2fr_1.5fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2.5 border-b border-border bg-muted/30">
              {["ID", "Customer", "Subject", "Phone", "Source", "Status", "Date", ""].map((h) => (
                <p key={h} className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{h}</p>
              ))}
            </div>

            <div className="divide-y divide-border">
              {filtered.map((inq) => {
                const status = normalizeStatus(inq.status);
                const Cfg = STATUS_CFG[status];
                const src = getSource(inq);
                const SrcCfg = SOURCE_CFG[src] ?? SOURCE_CFG.website;
                const StatusIcon = Cfg.icon;
                const secs = getTimestampSecs(inq);
                const displayId = inq.inquiryId?.slice(-8) ?? inq.id.slice(0, 8).toUpperCase();

                return (
                  <div key={inq.id} className="group">
                    {/* Desktop row */}
                    <div className="hidden sm:grid grid-cols-[1.5fr_2fr_2fr_1.5fr_1fr_1fr_1fr_auto] gap-3 items-center px-4 py-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-1 min-w-0">
                        <Hash size={10} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground font-mono truncate">{displayId}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{inq.customerName}</p>
                        {inq.hasPrescription && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-primary mt-0.5">
                            <Paperclip size={9} /> Rx
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{getSubjectDisplay(inq)}</p>
                      <p className="text-sm text-muted-foreground">{inq.mobileNumber}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${SrcCfg.cls} w-fit`}>
                        {SrcCfg.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${Cfg.cls} w-fit`}>
                        <StatusIcon size={9} /> {Cfg.label}
                      </span>
                      <p className="text-xs text-muted-foreground">{secs ? formatShortDate(secs) : "—"}</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelected(inq)} title="View"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                          <Eye size={14} />
                        </button>
                        <a
                          href={`https://wa.me/91${inq.mobileNumber.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${inq.customerName}, this is Ayush Medico. `)}`}
                          target="_blank" rel="noopener noreferrer" title="WhatsApp"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-[#25D366] hover:bg-[#25D366]/10 transition-all">
                          <MessageCircle size={14} />
                        </a>
                        {status !== "resolved" && (
                          <button onClick={() => handleUpdateStatus(inq, "resolved")} title="Mark Resolved"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-all">
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="sm:hidden flex items-center gap-3 px-4 py-3.5 hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => setSelected(inq)}>
                      <div className={`p-2 rounded-xl flex-shrink-0 ${Cfg.cls}`}>
                        <StatusIcon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{inq.customerName}</p>
                          {inq.hasPrescription && <Paperclip size={10} className="text-primary flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{getSubjectDisplay(inq)} · {inq.mobileNumber}</p>
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
          <InquiryDetailModal
            inquiry={selected}
            onClose={() => setSelected(null)}
            onUpdateStatus={(s) => handleUpdateStatus(selected, s)}
            onDelete={() => handleDelete(selected)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
