/**
 * Admin › Inventory Sync (Backend-Driven)
 *
 * Upload MediVision Gold SDF files → server parses + writes to Firestore.
 * The browser never writes to Firestore directly; it only polls for progress.
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
  Loader2, X, Server, Activity, TriangleAlert, Package,
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
  { key: "stock",    formField: "stock_sdf",    label: "STOCK.SDF",    filename: "STOCK.SDF",    required: true,  description: "Batch stock — prices, quantities, expiry" },
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
  written: number;
  errors: string[];
  quotaExhausted: boolean;
  startedAt: number;
}

// ── Sub-component: File Upload Card ──────────────────────────────────────────

function FileUploadCard({
  slot,
  file,
  onFile,
  disabled,
}: {
  slot: FileSlot;
  file: File | null;
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
        className="hidden"
        accept=".sdf,.SDF"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(slot.key, f);
          e.target.value = "";
        }}
      />

      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
            file ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
          }`}
        >
          {file ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{slot.label}</span>
            {slot.required && (
              <span className="text-xs text-red-500 font-medium">required</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{slot.description}</p>
          {file ? (
            <p className="text-xs text-green-600 mt-1 font-medium truncate">
              ✓ {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/70 mt-1">
              Drop file here or click to browse
            </p>
          )}
        </div>

        {file && !disabled && (
          <button
            className="flex-shrink-0 text-muted-foreground hover:text-foreground p-1 rounded"
            onClick={(e) => {
              e.stopPropagation();
              onFile(slot.key, null);
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sub-component: Progress Display ──────────────────────────────────────────

function ProgressDisplay({
  job,
  onCancel,
  cancelling,
}: {
  job: SyncJob;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const isDone = job.status === "done";
  const isCancelled = job.status === "cancelled";
  const isError = job.status === "error";
  const isRunning = job.status === "running";

  const pct =
    job.total > 0
      ? Math.round((job.processed / job.total) * 100)
      : job.phase === "parsing" || job.phase === "reading"
      ? 5
      : job.phase === "categories" || job.phase === "brands"
      ? 15
      : 0;

  const elapsedSec = Math.round((Date.now() - job.startedAt) / 1000);
  const elapsed =
    elapsedSec < 60
      ? `${elapsedSec}s`
      : `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`;

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div
        className={`flex items-start gap-3 p-4 rounded-xl border ${
          isDone && !job.quotaExhausted && job.errors.length === 0
            ? "bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400"
            : isDone && job.quotaExhausted
            ? "bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400"
            : isError
            ? "bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400"
            : isCancelled
            ? "bg-muted border-border text-muted-foreground"
            : "bg-primary/5 border-primary/20 text-foreground"
        }`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {isRunning && <Loader2 className="w-4 h-4 animate-spin" />}
          {isDone && !job.quotaExhausted && job.errors.length === 0 && (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {(isDone && (job.quotaExhausted || job.errors.length > 0)) && (
            <TriangleAlert className="w-4 h-4" />
          )}
          {isError && <AlertCircle className="w-4 h-4" />}
          {isCancelled && <X className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{job.message}</p>
          {isRunning && (
            <p className="text-xs opacity-70 mt-0.5">Elapsed: {elapsed}</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(isRunning || (isDone && job.total > 0)) && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {job.phase === "medicines" && job.totalBatches > 0
                ? `Batch ${job.currentBatch}/${job.totalBatches}`
                : job.phase === "parsing" || job.phase === "reading"
                ? "Parsing files…"
                : job.phase === "categories"
                ? "Writing categories…"
                : job.phase === "brands"
                ? "Writing brands…"
                : "Processing…"}
            </span>
            <span>
              {job.total > 0
                ? `${job.processed.toLocaleString()} / ${job.total.toLocaleString()} (${pct}%)`
                : ""}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isDone && !job.quotaExhausted
                  ? "bg-green-500"
                  : isDone && job.quotaExhausted
                  ? "bg-amber-500"
                  : "bg-primary animate-pulse"
              }`}
              style={{ width: `${Math.max(pct, isDone ? 100 : 2)}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      {job.written > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold">{job.written.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Medicines written</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold">{job.totalBatches}</p>
            <p className="text-xs text-muted-foreground">Batches</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold">{elapsed}</p>
            <p className="text-xs text-muted-foreground">Elapsed</p>
          </div>
        </div>
      )}

      {/* Errors */}
      {job.errors.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <p className="text-xs font-semibold text-red-600 mb-1">
            {job.errors.length} error(s):
          </p>
          <ul className="space-y-0.5">
            {job.errors.slice(0, 5).map((e, i) => (
              <li key={i} className="text-xs text-red-600/80 font-mono truncate">
                {e}
              </li>
            ))}
            {job.errors.length > 5 && (
              <li className="text-xs text-red-600/60">
                …and {job.errors.length - 5} more
              </li>
            )}
          </ul>
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
    product: null,
    stock: null,
    company: null,
    category: null,
    drug: null,
  });
  const [stage, setStage] = useState<PageStage>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const queryClient = useQueryClient();

  const handleFile = useCallback((key: SdfFileKey, file: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
  }, []);

  const canStart = files.product !== null && files.stock !== null;

  // ── Poll backend for job status ─────────────────────────────────────────────
  const { data: statusData } = useQuery<{ running: boolean; job: SyncJob | null }>({
    queryKey: ["syncStatus"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      const resp = await fetch("/api/sync/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Failed to fetch sync status");
      return resp.json() as Promise<{ running: boolean; job: SyncJob | null }>;
    },
    refetchInterval: pollingEnabled ? 2000 : false,
    enabled: pollingEnabled,
  });

  const job = statusData?.job ?? null;

  // Stop polling when job finishes
  useEffect(() => {
    if (!job) return;
    if (job.status !== "running") {
      setPollingEnabled(false);
      setStage("done");
    }
  }, [job?.status]);

  // ── Upload handler ──────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!canStart) return;

    setUploadError(null);
    setStage("uploading");

    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) throw new Error("Not authenticated. Please sign in again.");

      const formData = new FormData();
      formData.append("product_sdf", files.product!);
      formData.append("stock_sdf", files.stock!);
      if (files.company) formData.append("company_sdf", files.company);
      if (files.category) formData.append("category_sdf", files.category);
      if (files.drug) formData.append("drug_sdf", files.drug);

      const resp = await fetch("/api/sync/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `Server error ${resp.status}` })) as { error?: string };
        throw new Error(err.error ?? `Server error ${resp.status}`);
      }

      // Job started — begin polling
      await queryClient.invalidateQueries({ queryKey: ["syncStatus"] });
      setPollingEnabled(true);
      setStage("running");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
      setStage("idle");
    }
  };

  // ── Cancel handler ──────────────────────────────────────────────────────────
  const handleCancel = async () => {
    setCancelling(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch("/api/sync/cancel", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore
    } finally {
      setCancelling(false);
    }
  };

  // ── Reset ───────────────────────────────────────────────────────────────────
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
            Upload MediVision Gold SDF exports — the server parses and writes all
            medicines directly to Firestore.
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
        <Activity className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-muted-foreground">
          <p>
            <strong className="text-foreground">Backend-driven sync.</strong>{" "}
            Files are parsed and written server-side at a controlled rate (50
            medicines/batch, 800 ms between batches) to avoid Firestore quota
            errors. The browser only shows progress.
          </p>
          <p>
            Existing medicines are updated in-place — custom images, featured
            flags, and display order are preserved.
          </p>
        </div>
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
          Upload &amp; Sync
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

      {/* Done — offer to run again */}
      {stage === "done" && job && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted/50 text-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Run another sync
          </button>
          {job.quotaExhausted && (
            <button
              onClick={handleUpload}
              disabled={!canStart}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm hover:bg-amber-500/20 transition-colors"
            >
              <Package className="w-3.5 h-3.5" />
              Resume sync (continues from where it stopped)
            </button>
          )}
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
              Export from MediVision Gold: <strong>File → Export → SDF Export</strong>
            </li>
            <li>
              ~13,000 medicines take approximately <strong>3–5 minutes</strong> at the
              safe write rate
            </li>
            <li>
              If quota is exhausted, re-run the sync — already-written medicines are
              skipped automatically
            </li>
            <li>
              The sync is safe to re-run at any time; it never deletes existing
              medicine data
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
