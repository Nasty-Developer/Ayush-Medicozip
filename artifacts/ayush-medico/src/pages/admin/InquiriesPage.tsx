import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, X, Loader2, Phone, MessageCircle, Mail,
  AlertCircle, CheckCircle2, Clock, Paperclip, ExternalLink,
  Download, Search, Trash2, Send, Ban, Eye, RefreshCw,
  WifiOff, ChevronDown, Filter
} from "lucide-react";
import {
  subscribeToCollection, updateDocument, deleteDocument, orderBy
} from "@/lib/firestoreHelpers";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

type InquiryStatus = "new" | "in-progress" | "completed" | "cancelled";
type InquiryChannel = "whatsapp" | "email" | "normal";

type Inquiry = {
  id: string;
  customerName: string;
  mobileNumber: string;
  email?: string;
  medicineName: string;
  quantity: string;
  notes?: string;
  channel: InquiryChannel;
  status: InquiryStatus;
  prescriptionUrl?: string | null;
  hasPrescription?: boolean;
  createdAt?: { seconds: number; nanoseconds?: number };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = [880, 1108];
    notes.forEach((freq, i) => {
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

// ─── Status / Channel config ──────────────────────────────────────────────────

const STATUS_CFG: Record<InquiryStatus, { label: string; icon: React.ElementType; cls: string }> = {
  new:          { label: "New",         icon: AlertCircle,  cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  "in-progress":{ label: "In Progress", icon: Clock,        cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  completed:    { label: "Completed",   icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  cancelled:    { label: "Cancelled",   icon: Ban,          cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
};

const CHANNEL_CFG: Record<InquiryChannel, { label: string; cls: string }> = {
  whatsapp: { label: "WhatsApp", cls: "bg-[#25D366]/10 text-[#25D366]" },
  email:    { label: "Email",    cls: "bg-primary/10 text-primary" },
  normal:   { label: "Normal",   cls: "bg-muted text-muted-foreground" },
};

// ─── Prescription Viewer ─────────────────────────────────────────────────────

function PrescriptionViewer({ url }: { url: string }) {
  const isPDF = url.toLowerCase().includes(".pdf") || url.includes("/raw/");
  const isImage = !isPDF && (/\.(jpg|jpeg|png|gif|webp)/i.test(url) || url.includes("image") || url.includes("cloudinary"));

  return (
    <div className="space-y-2">
      {isImage ? (
        <div className="relative group rounded-xl overflow-hidden border border-border">
          <img
            src={url}
            alt="Prescription"
            className="w-full max-h-52 object-contain bg-muted/20"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove("hidden");
            }}
          />
          <div className="hidden flex items-center gap-2 p-3 text-muted-foreground text-sm">
            <Paperclip size={14} /> Could not preview — open in new tab
          </div>
        </div>
      ) : null}
      <div className="flex gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-all"
        >
          <Eye size={13} /> View
        </a>
        <a
          href={url}
          download
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-muted text-foreground text-xs font-semibold hover:bg-muted/70 transition-all"
        >
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
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
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
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-destructive text-white text-sm font-semibold hover:bg-destructive/90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
          >
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
  onUpdateStatus: (status: InquiryStatus) => Promise<void>;
  onDelete: () => void;
}) {
  const [updatingStatus, setUpdatingStatus] = useState<InquiryStatus | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const secs = getTimestampSecs(inquiry);
  const Cfg = STATUS_CFG[inquiry.status] ?? STATUS_CFG.new;
  const ChanCfg = CHANNEL_CFG[inquiry.channel] ?? CHANNEL_CFG.normal;

  const buildWAMessage = () =>
    `Hi ${inquiry.customerName}, this is Ayush Medico regarding your request for *${inquiry.medicineName}* (Qty: ${inquiry.quantity}). `;

  const buildEmailBody = () =>
    `Dear ${inquiry.customerName},\n\nThank you for your inquiry about ${inquiry.medicineName} (Qty: ${inquiry.quantity}).\n\n` +
    `We wanted to update you regarding your request.\n\nBest regards,\nAyush Medico Team\nKurla West, Mumbai`;

  const handleStatusChange = async (status: InquiryStatus) => {
    if (status === inquiry.status) return;
    setUpdatingStatus(status);
    await onUpdateStatus(status);
    setUpdatingStatus(null);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
    setShowDeleteConfirm(false);
    onClose();
  };

  const fields = [
    { label: "Customer", value: inquiry.customerName },
    { label: "Mobile",   value: inquiry.mobileNumber },
    { label: "Email",    value: inquiry.email || "—" },
    { label: "Medicine", value: inquiry.medicineName },
    { label: "Quantity", value: inquiry.quantity },
    { label: "Channel",  value: ChanCfg.label },
    { label: "Notes",    value: inquiry.notes || "—" },
    { label: "Received", value: secs ? formatDate(secs) : "—" },
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
                Inquiry Details
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${Cfg.cls}`}>
                  <Cfg.icon size={10} /> {Cfg.label}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${ChanCfg.cls}`}>
                  {ChanCfg.label}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
            {/* Fields */}
            <div className="space-y-2.5">
              {fields.map(({ label, value }) => (
                <div key={label} className="flex gap-3 text-sm">
                  <span className="text-xs font-semibold text-muted-foreground w-20 flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-foreground break-words min-w-0">{value}</span>
                </div>
              ))}
            </div>

            {/* Prescription */}
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
                    <Loader2 size={13} className="animate-spin" />
                    Prescription is being uploaded…
                  </div>
                )}
              </div>
            )}

            {/* Status Update */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Update Status</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(STATUS_CFG) as [InquiryStatus, typeof STATUS_CFG[InquiryStatus]][]).map(([s, cfg]) => {
                  const Icon = cfg.icon;
                  const isActive = inquiry.status === s;
                  const isLoading = updatingStatus === s;
                  return (
                    <button
                      key={s}
                      disabled={!!updatingStatus || isActive}
                      onClick={() => handleStatusChange(s)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? cfg.cls + " ring-1 ring-current"
                          : "bg-muted text-muted-foreground hover:bg-muted/70 disabled:opacity-50"
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

          {/* Footer Actions */}
          <div className="px-5 pb-5 pt-3 border-t border-border flex-shrink-0 space-y-2">
            {/* Reply Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${inquiry.mobileNumber}`}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-all"
              >
                <Phone size={13} /> Call
              </a>
              <a
                href={`https://wa.me/91${inquiry.mobileNumber.replace(/\D/g, "")}?text=${encodeURIComponent(buildWAMessage())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/20 transition-all"
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
              {inquiry.email && (
                <a
                  href={`mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: ${inquiry.medicineName} Request — Ayush Medico`)}&body=${encodeURIComponent(buildEmailBody())}`}
                  className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-muted text-foreground text-xs font-semibold hover:bg-muted/70 transition-all"
                >
                  <Mail size={13} /> Reply via Email
                </a>
              )}
            </div>

            {/* Delete */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-destructive text-xs font-semibold hover:bg-destructive/5 transition-all"
            >
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

type DateFilter = "all" | "today" | "yesterday" | "week";
type StatusFilter = "all" | InquiryStatus;
type ChannelFilter = "all" | InquiryChannel;

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const prevNewCountRef = useRef(-1);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    const unsub = subscribeToCollection(
      "inquiries",
      [orderBy("createdAt", "desc")],
      (docs) => {
        const data = docs as Inquiry[];
        const newCount = data.filter((d) => d.status === "new").length;

        // Play chime when a new "new" inquiry arrives (not on initial load)
        if (initialLoadDone.current && newCount > prevNewCountRef.current && prevNewCountRef.current >= 0) {
          playChime();
          toast({ title: "🔔 New Inquiry", description: "A new request just arrived!" });
        }

        prevNewCountRef.current = newCount;
        initialLoadDone.current = true;

        setInquiries(data);
        setLoading(false);
        setError(false);

        // Keep detail modal in sync
        setSelected((prev) => {
          if (!prev) return null;
          const updated = data.find((d) => d.id === prev.id);
          return updated ?? null;
        });
      },
      () => {
        setLoading(false);
        setError(true);
      }
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

  // Stats
  const totalCount    = inquiries.length;
  const newCount      = inquiries.filter((i) => i.status === "new").length;
  const inProgressCnt = inquiries.filter((i) => i.status === "in-progress").length;
  const completedCnt  = inquiries.filter((i) => i.status === "completed").length;
  const cancelledCnt  = inquiries.filter((i) => i.status === "cancelled").length;
  const waCnt         = inquiries.filter((i) => i.channel === "whatsapp").length;
  const emailCnt      = inquiries.filter((i) => i.channel === "email").length;
  const normalCnt     = inquiries.filter((i) => i.channel === "normal").length;

  // Filtered list
  const filtered = inquiries.filter((inq) => {
    if (search) {
      const q = search.toLowerCase();
      const name = inq.customerName.toLowerCase();
      const med = inq.medicineName.toLowerCase();
      const phone = inq.mobileNumber;
      if (!name.includes(q) && !med.includes(q) && !phone.includes(q)) return false;
    }
    const secs = getTimestampSecs(inq);
    if (dateFilter === "today"     && !isToday(secs))     return false;
    if (dateFilter === "yesterday" && !isYesterday(secs)) return false;
    if (dateFilter === "week"      && !isThisWeek(secs))  return false;
    if (statusFilter !== "all"  && inq.status  !== statusFilter)  return false;
    if (channelFilter !== "all" && inq.channel !== channelFilter) return false;
    return true;
  });

  const hasActiveFilters = dateFilter !== "all" || statusFilter !== "all" || channelFilter !== "all" || !!search;

  const resetFilters = () => {
    setDateFilter("all");
    setStatusFilter("all");
    setChannelFilter("all");
    setSearch("");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Page Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Inquiries
            {newCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-5.5 px-1.5 rounded-full bg-primary text-white text-xs font-bold animate-pulse">
                {newCount}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {totalCount} total · {newCount} new · {inProgressCnt} in progress
          </p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
          <WifiOff size={16} className="text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-destructive">Could not load inquiries</p>
            <p className="text-xs text-destructive/70 mt-0.5">
              Check your Firestore Rules — publish the rules from <code className="bg-destructive/10 px-1 rounded">firestore.rules</code> in Firebase Console → Firestore → Rules.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex-shrink-0 flex items-center gap-1 text-xs text-destructive font-semibold hover:underline"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {[
          { label: "Total",       value: totalCount,    cls: "text-foreground" },
          { label: "New",         value: newCount,      cls: "text-blue-600 dark:text-blue-400" },
          { label: "In Progress", value: inProgressCnt, cls: "text-amber-600 dark:text-amber-400" },
          { label: "Completed",   value: completedCnt,  cls: "text-emerald-600 dark:text-emerald-400" },
          { label: "WhatsApp",    value: waCnt,         cls: "text-[#25D366]" },
          { label: "Email/Normal",value: emailCnt + normalCnt, cls: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center shadow-sm">
            <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, medicine or phone…"
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
            hasActiveFilters
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <Filter size={14} />
          Filters
          {hasActiveFilters && (
            <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">
              {[dateFilter !== "all", statusFilter !== "all", channelFilter !== "all"].filter(Boolean).length}
            </span>
          )}
          <ChevronDown size={12} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-3 py-2.5 rounded-xl border border-border bg-card text-xs text-muted-foreground hover:text-foreground transition-all"
          >
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
                  {([
                    { value: "all",       label: "All Time" },
                    { value: "today",     label: "Today" },
                    { value: "yesterday", label: "Yesterday" },
                    { value: "week",      label: "This Week" },
                  ] as { value: DateFilter; label: string }[]).map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setDateFilter(f.value)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        dateFilter === f.value
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { value: "all",         label: "All" },
                    { value: "new",         label: "New" },
                    { value: "in-progress", label: "In Progress" },
                    { value: "completed",   label: "Completed" },
                    { value: "cancelled",   label: "Cancelled" },
                  ] as { value: StatusFilter; label: string }[]).map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setStatusFilter(f.value)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        statusFilter === f.value
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f.label}
                      {f.value === "new" && newCount > 0 && ` (${newCount})`}
                      {f.value === "completed" && completedCnt > 0 && ` (${completedCnt})`}
                      {f.value === "cancelled" && cancelledCnt > 0 && ` (${cancelledCnt})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Channel</p>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { value: "all",      label: "All Channels" },
                    { value: "whatsapp", label: `WhatsApp (${waCnt})` },
                    { value: "email",    label: `Email (${emailCnt})` },
                    { value: "normal",   label: `Normal (${normalCnt})` },
                  ] as { value: ChannelFilter; label: string }[]).map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setChannelFilter(f.value)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        channelFilter === f.value
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
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
          Showing {filtered.length} of {totalCount} inquiries
        </p>
      )}

      {/* Inquiry List */}
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
              <button onClick={resetFilters} className="text-xs text-primary hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table Header — desktop */}
            <div className="hidden sm:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2.5 border-b border-border bg-muted/30">
              {["Customer", "Medicine", "Phone", "Type", "Status", "Date", ""].map((h) => (
                <p key={h} className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{h}</p>
              ))}
            </div>

            <div className="divide-y divide-border">
              {filtered.map((inquiry) => {
                const Cfg = STATUS_CFG[inquiry.status] ?? STATUS_CFG.new;
                const ChanCfg = CHANNEL_CFG[inquiry.channel] ?? CHANNEL_CFG.normal;
                const StatusIcon = Cfg.icon;
                const secs = getTimestampSecs(inquiry);

                return (
                  <div
                    key={inquiry.id}
                    className="group"
                  >
                    {/* Desktop row */}
                    <div className="hidden sm:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr_auto] gap-3 items-center px-4 py-3 hover:bg-muted/20 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{inquiry.customerName}</p>
                        {inquiry.hasPrescription && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-primary mt-0.5">
                            <Paperclip size={9} /> Rx
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{inquiry.medicineName}</p>
                      <p className="text-sm text-muted-foreground">{inquiry.mobileNumber}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${ChanCfg.cls} w-fit`}>
                        {ChanCfg.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${Cfg.cls} w-fit`}>
                        <StatusIcon size={9} /> {Cfg.label}
                      </span>
                      <p className="text-xs text-muted-foreground">{secs ? formatShortDate(secs) : "—"}</p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelected(inquiry)}
                          title="View"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                        >
                          <Eye size={14} />
                        </button>
                        <a
                          href={`https://wa.me/91${inquiry.mobileNumber.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${inquiry.customerName}, this is Ayush Medico regarding your request for *${inquiry.medicineName}*. `)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Reply via WhatsApp"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-[#25D366] hover:bg-[#25D366]/10 transition-all"
                        >
                          <MessageCircle size={14} />
                        </a>
                        {inquiry.status !== "completed" && (
                          <button
                            onClick={() => handleUpdateStatus(inquiry, "completed")}
                            title="Mark Completed"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-all"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div
                      className="sm:hidden flex items-center gap-3 px-4 py-3.5 hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => setSelected(inquiry)}
                    >
                      <div className={`p-2 rounded-xl flex-shrink-0 ${Cfg.cls}`}>
                        <StatusIcon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{inquiry.customerName}</p>
                          {inquiry.hasPrescription && <Paperclip size={10} className="text-primary flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{inquiry.medicineName} · {inquiry.mobileNumber}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${ChanCfg.cls}`}>
                          {ChanCfg.label}
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
            onUpdateStatus={(status) => handleUpdateStatus(selected, status)}
            onDelete={() => handleDelete(selected)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
