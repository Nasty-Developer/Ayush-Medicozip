/**
 * Admin › Inventory Sync (PostgreSQL)
 *
 * Upload MediVision Gold SDF files → server parses + writes to PostgreSQL.
 * Re-imports are safe and idempotent — ~13k medicines in ~10–20 seconds.
 *
 * Flow:
 *  1. Admin selects up to 5 SDF files via drag-drop or click
 *  2. "Upload & Sync" sends them as multipart/form-data to POST /api/sync/upload
 *  3. Browser polls GET /api/sync/status every 2 s and shows live progress
 *  4. Done / error state shown when job finishes
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload, FileText, CheckCircle2, AlertCircle, RefreshCw,
  Loader2, X, Server, Activity, Database,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// ── Types ─────────────────────────────────────────────────────────────────────

type SdfFileKey = "product" | "stock" | "company" | "category" | "drug";

interface FileSlot {
  key: SdfFileKey;
  formField: string;
  label: string;
  filename: string;
  required: boolean;
  description: string;
}

const FILE_SLOTS: FileSlot[] = [
  { key: "product",  formField: "product_sdf",  label: "PRODUCT.SDF",  filename: "PRODUCT.SDF",  required: true,  description: "Medicine catalog — names, companies, categories" },
  { key: "stock",    formField: "stock_sdf",    label: "STOCK.SDF",    filename: "STOCK.SDF",    required: true,  description: "Batch stock — prices, quantities" },
  { key: "company",  formField: "company_sdf",  label: "COMPANY.SDF",  filename: "COMPANY.SDF",  required: false, description: "Company / manufacturer master list" },
  { key: "category", formField: "category_sdf", label: "CATEGORY.SDF", filename: "CATEGORY.SDF", required: false, description: "Medicine category master list" },
  { key: "drug",     formField: "drug_sdf",     label: "DRUG.SDF",     filename: "DRUG.SDF",     required: false, description: "Generic / drug composition groups" },
];

interface SyncJob {
  id: string;
  status: "running" | "done" | "cancelled" | "error";
  phase: string;
  message: string;
  total: number;
  processed: number;
  currentBatch: number;
  totalBatches: number;
  cancelRequested: boolean;
  startedAt: number;
  report: {
    medicines: number;
    companies: number;
    categories: number;
    drugGroups: number;
    stockRecords: number;
    parseErrors: number;
    skipped: number;
    durationMs: number;
  };
}

// ── File Upload Card ──────────────────────────────────────────────────────────

function FileUploadCard({
  slot, file, onFile, disabled,
}: {
  slot: FileSlot; file: File | null;
  onFile: (key: SdfFileKey, file: File | null) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      const f = e.dataTransfer.files[0];
      if (f) onFile(slot.key, f);
    },
    [slot.key, onFile, disabled]
  );

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-4 transition-colors ${
        disabled
          ? "opacity-50 cursor-not-allowed border-border"
          : file
          ? "border-green-500/50 bg-green-500/5 cursor-pointer"
          : "border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".sdf,.SDF"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(slot.key, f);
          e.target.value = "";
        }}
        disabled={disabled}
      />
      <div className="flex items-center gap-3">
        {file ? (
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
        ) : (
          <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {slot.label}
            {slot.required && <span className="text-destructive ml-1">*</span>}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {file ? `${file.name} (${(file.size / 1024).toFixed(0)} KB)` : slot.description}
          </p>
        </div>
        {file && !disabled && (
          <button
            onClick={(e) => { e.stopPropagation(); onFile(slot.key, null); }}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Progress Display ──────────────────────────────────────────────────────────

function ProgressDisplay({
  job, onCancel, cancelling,
}: {
  job: SyncJob;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (job.status !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [job.status]);

  const elapsed    = Math.floor((now - job.startedAt) / 1000);
  const elapsedStr = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
  const pct        = job.total > 0 ? Math.min(100, Math.round((job.processed / job.total) * 100)) : 0;

  const isRunning   = job.status === "running";
  const isDone      = job.status === "done";
  const isError     = job.status === "error";
  const isCancelled = job.status === "cancelled";

  const phaseLabel: Record<string, string> = {
    parsing:    "Parsing SDF files…",
    companies:  "Upserting companies…",
    categories: "Upserting categories…",
    drug_groups: "Upserting drug groups…",
    medicines:  `Medicines: batch ${job.currentBatch}/${job.totalBatches}`,
    stock:      "Writing stock records…",
    done:       "Complete",
  };

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${
        isDone      ? "bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400" :
        isError     ? "bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400" :
        isCancelled ? "bg-muted border-border text-muted-foreground" :
                      "bg-primary/5 border-primary/20 text-foreground"
      }`}>
        <div className="flex-shrink-0 mt-0.5">
          {isRunning   && <Loader2      className="w-4 h-4 animate-spin" />}
          {isDone      && <CheckCircle2 className="w-4 h-4" />}
          {isError     && <AlertCircle  className="w-4 h-4" />}
          {isCancelled && <X            className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{job.message}</p>
          {isRunning && (
            <p className="text-xs opacity-70 mt-0.5">
              {phaseLabel[job.phase] ?? job.phase} · Elapsed: {elapsedStr}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(isRunning || isDone) && job.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{phaseLabel[job.phase] ?? job.phase}</span>
            <span>{job.processed.toLocaleString()} / {job.total.toLocaleString()} ({pct}%)</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isDone ? "bg-green-500" : "bg-primary animate-pulse"
              }`}
              style={{ width: `${Math.max(pct, isDone ? 100 : 2)}%` }}
            />
          </div>
        </div>
      )}

      {/* Report stats */}
      {isDone && job.report.medicines > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Medicines",   val: job.report.medicines.toLocaleString() },
            { label: "Companies",   val: job.report.companies.toString() },
            { label: "Categories",  val: job.report.categories.toString() },
            { label: "Drug Groups", val: job.report.drugGroups.toString() },
          ].map(({ label, val }) => (
            <div key={label} className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold">{val}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Cancel button */}
      {isRunning && (
        <button
          onClick={onCancel}
          disabled={cancelling}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
        >
          {cancelling ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <X className="w-3.5 h-3.5" />
          )}
          {cancelling ? "Cancelling…" : "Cancel sync"}
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type PageStage = "idle" | "uploading" | "running" | "done";

export default function InventorySyncPage() {
  const [files, setFiles] = useState<Record<SdfFileKey, File | null>>({
    product: null, stock: null, company: null, category: null, drug: null,
  });
  const [stage,         setStage]         = useState<PageStage>("idle");
  const [uploadError,   setUploadError]   = useState<string | null>(null);
  const [cancelling,    setCancelling]    = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const queryClient = useQueryClient();

  const handleFile = useCallback((key: SdfFileKey, file: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
  }, []);

  const canStart = files.product !== null && files.stock !== null;

  // ── Poll backend for job status ───────────────────────────────────────────

  const { data: statusData } = useQuery<{ running: boolean; job: SyncJob | null }>({
    queryKey: ["syncStatus"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      const resp  = await fetch("/api/sync/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Failed to fetch sync status");
      return resp.json() as Promise<{ running: boolean; job: SyncJob | null }>;
    },
    refetchInterval: pollingEnabled ? 2000 : false,
    enabled: pollingEnabled,
  });

  const job = statusData?.job ?? null;

  useEffect(() => {
    if (!job) return;
    if (job.status !== "running") {
      setPollingEnabled(false);
      setStage("done");
    }
  }, [job?.status]);

  // ── Upload handler ────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!canStart) return;
    setUploadError(null);
    setStage("uploading");

    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) throw new Error("Not authenticated. Please sign in again.");

      const formData = new FormData();
      formData.append("product_sdf", files.product!);
      formData.append("stock_sdf",   files.stock!);
      if (files.company)  formData.append("company_sdf",  files.company);
      if (files.category) formData.append("category_sdf", files.category);
      if (files.drug)     formData.append("drug_sdf",     files.drug);

      const resp = await fetch("/api/sync/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `Server error ${resp.status}` })) as { error?: string };
        throw new Error(err.error ?? `Server error ${resp.status}`);
      }

      await queryClient.invalidateQueries({ queryKey: ["syncStatus"] });
      setPollingEnabled(true);
      setStage("running");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setStage("idle");
    }
  };

  // ── Cancel handler ────────────────────────────────────────────────────────

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch("/api/sync/cancel", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* non-fatal */ }
    finally { setCancelling(false); }
  };

  // ── Reset ────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setFiles({ product: null, stock: null, company: null, category: null, drug: null });
    setStage("idle");
    setUploadError(null);
    setPollingEnabled(false);
    queryClient.removeQueries({ queryKey: ["syncStatus"] });
  };

  const isRunning = stage === "running" || stage === "uploading";

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="w-6 h-6 text-primary" />
            Inventory Sync
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload MediVision Gold SDF exports — medicines are imported directly
            into PostgreSQL. Re-importing is safe and idempotent.
          </p>
        </div>
        {stage === "done" && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            New sync
          </button>
        )}
      </div>

      {/* Architecture note */}
      <div className="flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-xl p-4 text-sm">
        <Database className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-muted-foreground">
          <p>
            <strong className="text-foreground">Fast PostgreSQL import.</strong>{" "}
            SDF files are parsed server-side and written directly to the database
            using bulk upserts — no quota limits, no delays between batches.
            ~13,000 medicines typically complete in{" "}
            <strong className="text-foreground">under 30 seconds</strong>.
          </p>
          <p>
            Re-importing the same files is fully safe. Admin-managed fields
            (featured flag, special, new arrivals) are{" "}
            <strong className="text-foreground">always preserved</strong> across
            imports.
          </p>
        </div>
      </div>

      {/* Activity info */}
      <div className="flex items-start gap-3 bg-muted/40 border border-border rounded-xl p-4 text-sm text-muted-foreground">
        <Activity className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          After importing, go to <strong className="text-foreground">Categories</strong>{" "}
          to customise icons, colours, and display order for each medicine group.
        </p>
      </div>

      {/* File upload section */}
      {(stage === "idle" || stage === "uploading") && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            SDF Files
          </h2>
          <div className="space-y-2">
            {FILE_SLOTS.map((slot) => (
              <FileUploadCard
                key={slot.key}
                slot={slot}
                file={files[slot.key]}
                onFile={handleFile}
                disabled={isRunning}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{uploadError}</p>
        </div>
      )}

      {/* Start button */}
      {stage === "idle" && (
        <button
          onClick={handleUpload}
          disabled={!canStart}
          className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold transition-all ${
            canStart
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload &amp; Import to PostgreSQL
          {!canStart && (
            <span className="text-xs font-normal opacity-70 ml-1">
              (select PRODUCT.SDF and STOCK.SDF)
            </span>
          )}
        </button>
      )}

      {/* Uploading spinner */}
      {stage === "uploading" && (
        <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Uploading files to server…</span>
        </div>
      )}

      {/* Progress display */}
      {(stage === "running" || stage === "done") && job && (
        <ProgressDisplay
          job={job}
          onCancel={handleCancel}
          cancelling={cancelling}
        />
      )}

      {/* Done — run another */}
      {stage === "done" && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted/50 text-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Run another sync
          </button>
        </div>
      )}

      {/* Tips */}
      {stage === "idle" && (
        <div className="bg-muted/30 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Tips
          </p>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>
              Export from MediVision Gold:{" "}
              <strong>File → Export → SDF Export</strong>
            </li>
            <li>
              ~13,000 medicines complete in under 30 seconds with no throttling
            </li>
            <li>
              Re-running a sync on unchanged files is safe — all records are
              upserted, nothing is duplicated or deleted
            </li>
            <li>
              Featured, Special, and New Arrivals flags are admin-managed and
              are never overwritten by the importer
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
