/**
 * Admin › Inventory Sync (PostgreSQL — chunked upload)
 *
 * Upload MediVision Gold SDF files → server parses + writes to PostgreSQL.
 * Re-imports are safe and idempotent — ~13k medicines in ~10–20 seconds.
 *
 * Upload flow (production-ready for Vercel):
 *  1. Create an upload session  (POST /api/sync/session)
 *  2. For each SDF file:
 *       a. Split into ≤3 MB chunks
 *       b. POST /api/sync/chunk once per chunk (multipart)
 *  3. POST /api/sync/start  → kicks off the server-side import job (202)
 *  4. Poll GET /api/sync/status every 2 s for live progress
 *
 * Why chunked? Vercel serverless functions have a hard 4.5 MB request body
 * limit. PRODUCT.SDF is ~24 MB, so we split it into pieces, each well under
 * the limit, and the server reassembles them from PostgreSQL before importing.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload, FileText, CheckCircle2, AlertCircle, RefreshCw,
  Loader2, X, Server, Activity, Database, CloudUpload,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { authFetch, getFreshIdToken } from "@/lib/apiAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum bytes per chunk. Must stay well under Vercel's 4.5 MB body limit. */
const CHUNK_SIZE = 3 * 1024 * 1024; // 3 MB

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

interface ChunkProgress {
  label: string;      // e.g. "PRODUCT.SDF"
  fileIndex: number;  // 0-based index among files being uploaded
  totalFiles: number;
  chunksDone: number;
  chunksTotal: number;
  bytesDone: number;
  bytesTotal: number;
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
            {file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)` : slot.description}
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

// ── Chunk Upload Progress ─────────────────────────────────────────────────────

function ChunkUploadProgress({ progress }: { progress: ChunkProgress }) {
  const filePct  = progress.chunksTotal > 0
    ? Math.round((progress.chunksDone / progress.chunksTotal) * 100)
    : 0;
  const overallPct = progress.totalFiles > 0
    ? Math.round(((progress.fileIndex + filePct / 100) / progress.totalFiles) * 100)
    : 0;

  const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-xl border bg-primary/5 border-primary/20 text-foreground">
        <CloudUpload className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">
            Uploading {progress.label}…
          </p>
          <p className="text-xs opacity-70 mt-0.5">
            File {progress.fileIndex + 1} of {progress.totalFiles} ·{" "}
            Chunk {progress.chunksDone}/{progress.chunksTotal} ·{" "}
            {mb(progress.bytesDone)} / {mb(progress.bytesTotal)}
          </p>
        </div>
      </div>

      {/* Per-file progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress.label}</span>
          <span>{filePct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${Math.max(filePct, 2)}%` }}
          />
        </div>
      </div>

      {/* Overall progress */}
      {progress.totalFiles > 1 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Overall upload</span>
            <span>{overallPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/50 transition-all duration-300"
              style={{ width: `${Math.max(overallPct, 1)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Import Progress Display ───────────────────────────────────────────────────

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
  const [stage,          setStage]          = useState<PageStage>("idle");
  const [uploadError,    setUploadError]    = useState<string | null>(null);
  const [cancelling,     setCancelling]     = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [chunkProgress,  setChunkProgress]  = useState<ChunkProgress | null>(null);
  const queryClient = useQueryClient();

  const handleFile = useCallback((key: SdfFileKey, file: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
  }, []);

  const canStart = files.product !== null && files.stock !== null;

  // ── Poll backend for job status ───────────────────────────────────────────

  const { data: statusData } = useQuery<{ running: boolean; job: SyncJob | null }>({
    queryKey: ["syncStatus"],
    queryFn: async () => {
      const resp = await authFetch("/api/sync/status");
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
      if (job.status === "done") {
        window.dispatchEvent(new CustomEvent("ayush:sync-complete"));
      }
    }
  }, [job?.status]);

  // ── Chunked upload helpers ────────────────────────────────────────────────

  /**
   * Upload a single File in ≤CHUNK_SIZE pieces.
   * Updates chunkProgress state after each piece for live UI feedback.
   */
  async function uploadFileChunked(
    sessionId: string,
    fileKey: string,
    file: File,
    fileIndex: number,
    totalFiles: number,
  ): Promise<void> {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end   = Math.min(start + CHUNK_SIZE, file.size);
      const slice = file.slice(start, end);

      setChunkProgress({
        label:      file.name,
        fileIndex,
        totalFiles,
        chunksDone: i,
        chunksTotal: totalChunks,
        bytesDone:  start,
        bytesTotal: file.size,
      });

      const form = new FormData();
      form.append("chunk",       slice, file.name);
      form.append("sessionId",   sessionId);
      form.append("fileKey",     fileKey);
      form.append("chunkIndex",  String(i));
      form.append("totalChunks", String(totalChunks));

      const resp = await authFetch("/api/sync/chunk", {
        method:  "POST",
        body:    form,
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({ error: `Server error ${resp.status}` })) as { error?: string };
        throw new Error(`Failed to upload chunk ${i + 1}/${totalChunks} of ${file.name}: ${body.error ?? resp.status}`);
      }
    }

    // Mark this file as fully uploaded
    setChunkProgress({
      label:       file.name,
      fileIndex,
      totalFiles,
      chunksDone:  totalChunks,
      chunksTotal: totalChunks,
      bytesDone:   file.size,
      bytesTotal:  file.size,
    });
  }

  // ── Upload & start handler ────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!canStart) return;
    setUploadError(null);
    setChunkProgress(null);
    setStage("uploading");

    try {
      await getFreshIdToken();

      // 1. Create upload session
      const sessionResp = await authFetch("/api/sync/session", {
        method:  "POST",
      });
      if (!sessionResp.ok) {
        throw new Error(`Failed to create upload session (${sessionResp.status})`);
      }
      const { sessionId } = await sessionResp.json() as { sessionId: string };

      // 2. Upload each file in chunks (sequentially to avoid overwhelming the server)
      const filesToUpload: Array<{ slot: FileSlot; file: File }> = FILE_SLOTS
        .map((slot) => ({ slot, file: files[slot.key] }))
        .filter((x): x is { slot: FileSlot; file: File } => x.file !== null);

      for (let fi = 0; fi < filesToUpload.length; fi++) {
        const { slot, file } = filesToUpload[fi]!;
        await uploadFileChunked(sessionId, slot.formField, file, fi, filesToUpload.length);
      }

      setChunkProgress(null);

      // 3. Start the import job
      const startResp = await authFetch("/api/sync/start", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!startResp.ok) {
        const err = await startResp.json().catch(() => ({ error: `Server error ${startResp.status}` })) as { error?: string };
        throw new Error(err.error ?? `Server error ${startResp.status}`);
      }

      // 4. Begin polling
      await queryClient.invalidateQueries({ queryKey: ["syncStatus"] });
      setPollingEnabled(true);
      setStage("running");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setChunkProgress(null);
      setStage("idle");
    }
  };

  // ── Cancel handler ────────────────────────────────────────────────────────

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await authFetch("/api/sync/cancel", {
        method: "DELETE",
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
    setChunkProgress(null);
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
            Large SDF files are uploaded in chunks and assembled server-side —
            no file size limits, no timeouts. ~13,000 medicines typically
            complete in{" "}
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
      {(stage === "idle" || (stage === "uploading" && !chunkProgress)) && (
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

      {/* Chunk upload progress */}
      {stage === "uploading" && chunkProgress && (
        <ChunkUploadProgress progress={chunkProgress} />
      )}

      {/* Preparing to start (after all chunks sent, waiting for 202) */}
      {stage === "uploading" && !chunkProgress && isRunning && (
        <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Starting import…</span>
        </div>
      )}

      {/* Import progress display */}
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
              Large files (e.g. PRODUCT.SDF at ~24 MB) are uploaded in 3 MB chunks
              — no size limits apply
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
