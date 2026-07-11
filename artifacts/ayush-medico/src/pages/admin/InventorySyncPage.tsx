/**
 * Admin › Inventory Sync
 *
 * Upload MediVision Gold SDF exports, preview the diff against Firestore,
 * then confirm to write changes. Nothing touches Firestore until "Confirm Sync".
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload, FileText, CheckCircle2, AlertCircle, RefreshCw,
  Eye, Zap, Package, Building2, Tag, Pill, BarChart3,
  ChevronDown, ChevronUp, Loader2, X, Info, Server, Monitor,
  Activity, TriangleAlert,
} from "lucide-react";
import {
  collection, query, where, getDocs, getCountFromServer,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { readSdfLines } from "@/lib/sdf/sdfReader";
import { parseAllFiles } from "@/lib/sdf/stagingEngine";
import { buildSyncPreview } from "@/lib/sdf/stagingEngine";
import { executeSyncToFirestore } from "@/lib/sdf/firestoreSync";
import type { SyncPreview, SyncProgress } from "@/lib/sdf/types";

// ── File slot definition ──────────────────────────────────────────────────────

type SdfFileKey = "product" | "stock" | "company" | "category" | "drug";

interface FileSlot {
  key: SdfFileKey;
  label: string;
  filename: string;   // expected filename hint
  required: boolean;
  description: string;
}

const FILE_SLOTS: FileSlot[] = [
  { key: "product",  label: "PRODUCT.SDF",  filename: "PRODUCT.SDF",  required: true,  description: "Medicine catalog — names, companies, categories" },
  { key: "stock",    label: "STOCK.SDF",    filename: "STOCK.SDF",    required: true,  description: "Batch stock — prices, quantities, expiry" },
  { key: "company",  label: "COMPANY.SDF",  filename: "COMPANY.SDF",  required: false, description: "Company / manufacturer master list" },
  { key: "category", label: "CATEGORY.SDF", filename: "CATEGORY.SDF", required: false, description: "Medicine category master list" },
  { key: "drug",     label: "DRUG.SDF",     filename: "DRUG.SDF",     required: false, description: "Generic / drug composition groups" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function FileUploadCard({
  slot,
  file,
  onFile,
}: {
  slot: FileSlot;
  file: File | null;
  onFile: (key: SdfFileKey, file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = e.dataTransfer.files[0];
      if (dropped) onFile(slot.key, dropped);
    },
    [slot.key, onFile]
  );

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-4 transition-colors cursor-pointer ${
        file
          ? "border-green-500/50 bg-green-500/5"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".sdf,.SDF,.txt"
        className="hidden"
        onChange={(e) => onFile(slot.key, e.target.files?.[0] ?? null)}
      />

      <div className="flex items-start gap-3">
        <div className={`mt-0.5 p-2 rounded-lg ${file ? "bg-green-500/10" : "bg-muted"}`}>
          {file ? (
            <CheckCircle2 size={16} className="text-green-500" />
          ) : (
            <Upload size={16} className="text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{slot.label}</span>
            {slot.required && (
              <span className="text-xs text-destructive font-medium">required</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{slot.description}</p>
          {file && (
            <p className="text-xs text-green-600 mt-1 truncate">
              ✓ {file.name} ({(file.size / 1024).toFixed(0)} KB)
            </p>
          )}
        </div>
        {file && (
          <button
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onFile(slot.key, null);
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg px-3 py-2 text-center ${color}`}>
      <div className="text-xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs opacity-70 mt-0.5">{label}</div>
    </div>
  );
}

function DiffBadge({ label, count, variant }: { label: string; count: number; variant: "create" | "update" | "skip" | "error" }) {
  if (count === 0) return null;
  const styles = {
    create: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    update: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    skip:   "bg-muted text-muted-foreground",
    error:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {count.toLocaleString()} {label}
    </span>
  );
}

function PreviewSection({ preview }: { preview: SyncPreview }) {
  const [showNew, setShowNew] = useState(false);
  const [showUpdated, setShowUpdated] = useState(false);

  const newMeds = preview.medicines.items.filter((m) => m.action === "create");
  const updatedMeds = preview.medicines.items.filter((m) => m.action === "update");

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <BarChart3 size={16} className="text-primary" />
          Parsed from SDF files
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <StatBadge label="Products" value={preview.stats.totalProducts} color="bg-primary/10 text-primary" />
          <StatBadge label="Companies" value={preview.stats.totalCompanies} color="bg-secondary/10 text-secondary" />
          <StatBadge label="Categories" value={preview.stats.totalCategories} color="bg-purple-500/10 text-purple-600" />
          <StatBadge label="Drug Groups" value={preview.stats.totalDrugGroups} color="bg-orange-500/10 text-orange-600" />
          <StatBadge label="Stock Records" value={preview.stats.totalStockRecords} color="bg-green-500/10 text-green-600" />
        </div>
      </div>

      {/* Diff summary */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Eye size={16} className="text-primary" />
          Comparison with Firestore
        </h3>
        <div className="space-y-3">
          {/* Medicines */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Pill size={16} className="text-primary" />
                <span className="font-medium">Medicines</span>
                <span className="text-sm text-muted-foreground">({preview.medicines.total.toLocaleString()} total)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <DiffBadge label="new" count={preview.medicines.toCreate} variant="create" />
                <DiffBadge label="to update" count={preview.medicines.toUpdate} variant="update" />
                <DiffBadge label="unchanged" count={preview.medicines.toSkip} variant="skip" />
              </div>
            </div>

            {/* New medicines collapsible */}
            {newMeds.length > 0 && (
              <div className="mt-3">
                <button
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {showNew ? "Hide" : "Preview"} new medicines
                </button>
                {showNew && (
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Name</th>
                          <th className="text-left px-3 py-2 font-medium">Brand</th>
                          <th className="text-left px-3 py-2 font-medium">Category</th>
                          <th className="text-right px-3 py-2 font-medium">MRP</th>
                          <th className="text-left px-3 py-2 font-medium">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newMeds.slice(0, 200).map((m, i) => (
                          <tr key={i} className="border-t border-border/50">
                            <td className="px-3 py-1.5 font-medium">{m.name}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{m.brand || "—"}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{m.categoryName || "—"}</td>
                            <td className="px-3 py-1.5 text-right">
                              {m.mrp > 0 ? `₹${m.mrp.toFixed(2)}` : "—"}
                            </td>
                            <td className="px-3 py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                m.stockStatus === "in_stock"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {m.stockStatus === "in_stock" ? "In Stock" : "Out"}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {newMeds.length > 200 && (
                          <tr className="border-t border-border/50">
                            <td colSpan={5} className="px-3 py-2 text-center text-muted-foreground">
                              … and {(newMeds.length - 200).toLocaleString()} more
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Updated medicines collapsible */}
            {updatedMeds.length > 0 && (
              <div className="mt-2">
                <button
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  onClick={() => setShowUpdated(!showUpdated)}
                >
                  {showUpdated ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {showUpdated ? "Hide" : "Preview"} medicines to update
                </button>
                {showUpdated && (
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Name</th>
                          <th className="text-left px-3 py-2 font-medium">Changes</th>
                          <th className="text-right px-3 py-2 font-medium">New MRP</th>
                          <th className="text-left px-3 py-2 font-medium">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {updatedMeds.slice(0, 200).map((m, i) => (
                          <tr key={i} className="border-t border-border/50">
                            <td className="px-3 py-1.5 font-medium">{m.name}</td>
                            <td className="px-3 py-1.5">
                              <div className="flex flex-wrap gap-1">
                                {m.changedFields?.map((f) => (
                                  <span key={f} className="px-1 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                                    {f}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              {m.mrp > 0 ? `₹${m.mrp.toFixed(2)}` : "—"}
                            </td>
                            <td className="px-3 py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                m.stockStatus === "in_stock"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {m.stockStatus === "in_stock" ? "In Stock" : "Out"}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {updatedMeds.length > 200 && (
                          <tr className="border-t border-border/50">
                            <td colSpan={4} className="px-3 py-2 text-center text-muted-foreground">
                              … and {(updatedMeds.length - 200).toLocaleString()} more
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-purple-500" />
              <span className="font-medium">Categories</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <DiffBadge label="new" count={preview.categories.toCreate} variant="create" />
              {preview.categories.toCreate === 0 && (
                <span className="text-xs text-muted-foreground">All categories already exist</span>
              )}
            </div>
          </div>

          {/* Brands */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-secondary" />
              <span className="font-medium">Brands / Companies</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <DiffBadge label="new" count={preview.brands.toCreate} variant="create" />
              {preview.brands.toCreate === 0 && (
                <span className="text-xs text-muted-foreground">All brands already exist</span>
              )}
            </div>
          </div>

          {/* Parse errors */}
          {preview.parseErrors > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-destructive" />
                <span className="font-medium">Parse Errors</span>
              </div>
              <DiffBadge label="lines skipped" count={preview.parseErrors} variant="error" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function formatEta(seconds?: number): string | null {
  if (seconds === undefined || seconds === null) return null;
  if (seconds < 60) return `~${seconds}s left`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `~${mins}m ${secs}s left`;
}

function ProgressBar({ progress }: { progress: SyncProgress }) {
  const pct =
    progress.total > 0
      ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
      : 0;

  const colorMap: Record<SyncProgress["phase"], string> = {
    idle: "bg-muted",
    parsing: "bg-blue-500",
    staging: "bg-purple-500",
    syncing: "bg-primary",
    done: "bg-green-500",
    error: "bg-destructive",
  };

  const eta = formatEta(progress.etaSeconds);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm gap-2">
        <span className="text-muted-foreground truncate">{progress.message}</span>
        {progress.total > 0 && (
          <span className="font-mono text-xs shrink-0">{pct}%</span>
        )}
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorMap[progress.phase]}`}
          style={{ width: `${pct || (progress.phase !== "idle" ? 100 : 0)}%` }}
        />
      </div>
      {(progress.totalBatches || eta) && (
        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>
            {progress.processed.toLocaleString()} / {progress.total.toLocaleString()} medicines
            {progress.totalBatches ? ` · batch ${progress.currentBatch}/${progress.totalBatches}` : ""}
            {progress.retries ? ` · ${progress.retries} retr${progress.retries === 1 ? "y" : "ies"}` : ""}
          </span>
          {eta && <span>{eta}</span>}
        </div>
      )}
    </div>
  );
}

// ── Inventory Diagnostics Panel ───────────────────────────────────────────────
// Reads Firestore directly to produce a medicine count report — no SDF files
// needed. Helps identify why medicines appear "missing" from the website.

type DiagCategoryRow = { name: string; count: number; slug?: string };

interface DiagReport {
  total: number;
  inStock: number;
  outOfStock: number;
  categories: DiagCategoryRow[];
  emptyCategoryCount: number;
  runAt: Date;
}

function DiagnosticsPanel() {
  const [running, setRunning]   = useState(false);
  const [report, setReport]     = useState<DiagReport | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll]   = useState(false);

  async function runDiagnostics() {
    if (!db) { setError("Firestore not initialised."); return; }
    setRunning(true);
    setError(null);
    try {
      // Total medicines
      const totalSnap = await getCountFromServer(collection(db, "medicines"));
      const total = totalSnap.data().count;

      // In-stock count
      const inStockSnap = await getCountFromServer(
        query(collection(db, "medicines"), where("stockStatus", "in", ["in_stock", "low_stock"]))
      );
      const inStock = inStockSnap.data().count;

      // Categories from the `categories` collection
      const catSnap = await getDocs(collection(db, "categories"));
      const categoryNames: { name: string; slug?: string }[] = catSnap.docs.map((d) => ({
        name:  d.data().name as string,
        slug:  d.data().slug as string | undefined,
      }));

      // Count medicines for each category (getCountFromServer = 1 read per category)
      const rows: DiagCategoryRow[] = await Promise.all(
        categoryNames.map(async (cat) => {
          const snap = await getCountFromServer(
            query(collection(db, "medicines"), where("categoryName", "==", cat.name))
          );
          return { name: cat.name, count: snap.data().count, slug: cat.slug };
        })
      );

      rows.sort((a, b) => b.count - a.count);

      setReport({
        total,
        inStock,
        outOfStock: total - inStock,
        categories: rows,
        emptyCategoryCount: rows.filter((r) => r.count === 0).length,
        runAt: new Date(),
      });
    } catch (err) {
      setError((err as Error).message ?? "Diagnostics failed.");
    } finally {
      setRunning(false);
    }
  }

  const displayRows = report
    ? (showAll ? report.categories : report.categories.slice(0, 20))
    : [];

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          <span className="font-semibold text-foreground">Inventory Diagnostics</span>
          <span className="text-xs text-muted-foreground font-normal">
            — check why medicines may be missing from the website
          </span>
        </div>
        {expanded ? <ChevronUp size={15} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={15} className="text-muted-foreground flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-6 pb-6 pt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Queries Firestore directly (no SDF files required). Shows how many medicines are in each category
            so you can spot categories with zero medicines — a common cause of "missing" products.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={runDiagnostics}
              disabled={running}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium
                         hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {running ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
              {running ? "Running…" : "Run Diagnostics"}
            </button>
            {report && (
              <p className="text-xs text-muted-foreground">
                Last run: {report.runAt.toLocaleTimeString("en-IN")}
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl p-3">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          {report && (
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
                  <p className="text-2xl font-bold text-primary">{report.total.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total Medicines</p>
                </div>
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{report.inStock.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">In Stock</p>
                </div>
                <div className="p-3 rounded-xl bg-muted border border-border text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{report.outOfStock.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Out of Stock</p>
                </div>
                <div className={`p-3 rounded-xl border text-center ${
                  report.emptyCategoryCount > 0
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                    : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                }`}>
                  <p className={`text-2xl font-bold ${report.emptyCategoryCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                    {report.emptyCategoryCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Empty Categories</p>
                </div>
              </div>

              {/* Category breakdown */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Tag size={11} /> Medicines per Category
                  {report.emptyCategoryCount > 0 && (
                    <span className="ml-1 flex items-center gap-1 text-amber-600 dark:text-amber-400 font-normal normal-case">
                      <TriangleAlert size={11} />
                      {report.emptyCategoryCount} categor{report.emptyCategoryCount === 1 ? "y" : "ies"} with 0 medicines — check categoryName case or re-run sync
                    </span>
                  )}
                </p>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Category</th>
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Count</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Bar</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map((row, i) => {
                        const maxCount = report.categories[0]?.count ?? 1;
                        const pct = maxCount > 0 ? (row.count / maxCount) * 100 : 0;
                        const isEmpty = row.count === 0;
                        return (
                          <tr key={i} className={`border-t border-border/50 ${isEmpty ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}>
                            <td className="px-3 py-2 font-medium text-foreground">{row.name}</td>
                            <td className={`px-3 py-2 text-right font-bold ${isEmpty ? "text-destructive" : "text-foreground"}`}>
                              {row.count.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 w-32">
                              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isEmpty ? "bg-destructive" : "bg-primary"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {isEmpty ? (
                                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                                  <TriangleAlert size={10} /> Missing
                                </span>
                              ) : (
                                <span className="text-green-600 dark:text-green-400">OK</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {report.categories.length > 20 && (
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    {showAll ? "Show fewer" : `Show all ${report.categories.length} categories`}
                  </button>
                )}
              </div>

              {/* Tips for missing medicines */}
              {report.emptyCategoryCount > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300 space-y-2">
                  <p className="font-semibold flex items-center gap-1.5"><AlertCircle size={14} /> Why might a category show 0 medicines?</p>
                  <ul className="list-disc ml-4 space-y-1 text-xs">
                    <li>The SDF sync was interrupted by quota exhaustion before that category was reached.</li>
                    <li>The category name in SDF (e.g. <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">ANTIBIOTICS</code>) doesn't match what's on the website — the medicines exist but under a different <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">categoryName</code>.</li>
                    <li>The medicines for that category haven't been synced yet — run a fresh SDF sync to fill them in.</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type PagePhase = "upload" | "parsing" | "preview" | "syncing" | "done";

export default function InventorySyncPage() {
  const [files, setFiles] = useState<Partial<Record<SdfFileKey, File>>>({});
  const [phase, setPhase] = useState<PagePhase>("upload");
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [progress, setProgress] = useState<SyncProgress>({
    phase: "idle",
    message: "Ready",
    processed: 0,
    total: 0,
    errors: [],
  });
  const [syncResult, setSyncResult] = useState<{
    created: number;
    updated: number;
    failed: number;
    errors: string[];
    quotaExhausted: boolean;
  } | null>(null);

  // Which sync path was used: "backend" (API server) or "frontend" (browser)
  const [syncMode, setSyncMode] = useState<"backend" | "frontend" | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const handleFile = useCallback((key: SdfFileKey, file: File | null) => {
    setFiles((prev) => {
      const next = { ...prev };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
  }, []);

  const canParse = !!files.product && !!files.stock;

  async function handleParseAndPreview() {
    if (!files.product || !files.stock) return;

    setPhase("parsing");
    setProgress({ phase: "parsing", message: "Parsing…", processed: 0, total: 6, errors: [] });

    try {
      // Read all uploaded files
      const readFile = async (f: File | undefined) =>
        f ? await readSdfLines(f) : [];

      setProgress((p) => ({ ...p, message: "Parsing… reading PRODUCT.SDF", processed: 1 }));
      const productLines = await readSdfLines(files.product);

      setProgress((p) => ({ ...p, message: "Parsing… reading STOCK.SDF", processed: 2 }));
      const stockLines = await readSdfLines(files.stock);

      setProgress((p) => ({ ...p, message: "Parsing… reading master files", processed: 3 }));
      const [companyLines, categoryLines, drugLines] = await Promise.all([
        readFile(files.company),
        readFile(files.category),
        readFile(files.drug),
      ]);

      setProgress((p) => ({ ...p, message: "Parsing… processing SDF records", processed: 4, total: 6 }));
      const parsed = await parseAllFiles(
        { product: productLines, stock: stockLines, company: companyLines, category: categoryLines, drug: drugLines },
        (msg, processed, total) =>
          setProgress((p) => ({ ...p, message: `Parsing… ${msg}`, processed: 4 + (total > 0 ? processed / total : 0), total: 6 }))
      );

      setProgress({ phase: "staging", message: "Preparing… comparing with Firestore", processed: 0, total: 0, errors: [] });
      const syncPreview = await buildSyncPreview(parsed, (msg) =>
        setProgress((p) => ({ ...p, message: msg }))
      );

      setPreview(syncPreview);
      setPhase("preview");
      setProgress({ phase: "idle", message: "Preview ready", processed: 0, total: 0, errors: [] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setProgress({ phase: "error", message: msg, processed: 0, total: 0, errors: [msg] });
      setPhase("upload");
    }
  }

  async function handleConfirmSync() {
    if (!preview) return;

    const total = preview.medicines.toCreate + preview.medicines.toUpdate;
    setPhase("syncing");
    setSyncMode(null);
    setProgress({ phase: "syncing", message: "Connecting to sync service…", processed: 0, total, errors: [] });

    // ── Step 1: Try backend sync ────────────────────────────────────────────
    try {
      const token = await auth?.currentUser?.getIdToken();
      const body = {
        medicines: {
          creates: preview.medicines.items
            .filter((m) => m.action === "create")
            .map(({ action: _a, existingDocId: _e, changedFields: _c, ...m }) => m),
          updates: preview.medicines.items
            .filter((m) => m.action === "update")
            .map(({ action: _a, changedFields: _c, ...m }) => m),
        },
        categories: preview.categories.items
          .filter((c) => c.action === "create")
          .map(({ action: _a, ...c }) => c),
        brands: preview.brands.items
          .filter((b) => b.action === "create")
          .map(({ action: _a, ...b }) => b),
      };

      const startResp = await fetch("/api/sync/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (startResp.ok) {
        // Backend accepted the job — start polling
        setSyncMode("backend");
        setProgress((p) => ({
          ...p, message: "Backend sync started — processing in server…",
        }));

        pollIntervalRef.current = setInterval(async () => {
          try {
            const pollToken = await auth?.currentUser?.getIdToken();
            const statusResp = await fetch("/api/sync/status", {
              headers: pollToken ? { Authorization: `Bearer ${pollToken}` } : {},
            });
            const data = await statusResp.json() as {
              running: boolean;
              job?: {
                status: string;
                phase: string;
                message: string;
                processed: number;
                total: number;
                currentBatch: number;
                totalBatches: number;
                created: number;
                updated: number;
                failed: number;
                errors: string[];
                quotaExhausted: boolean;
              };
            };

            if (data.job) {
              const job = data.job;
              setProgress({
                phase: job.status === "done" ? "done" : job.status === "error" ? "error" : "syncing",
                message: job.message,
                processed: job.processed,
                total: job.total,
                currentBatch: job.currentBatch,
                totalBatches: job.totalBatches,
                errors: job.errors ?? [],
              });

              if (job.status !== "running") {
                stopPolling();
                setSyncResult({
                  created: job.created,
                  updated: job.updated,
                  failed: job.failed,
                  errors: job.errors ?? [],
                  quotaExhausted: job.quotaExhausted,
                });
                setPhase("done");
              }
            }
          } catch {
            // Network hiccup — keep polling
          }
        }, 3000);

        return; // Backend is handling it — don't run frontend sync
      }

      // 503 = no service account configured → fall through to frontend sync
      // 409 = already running → tell user
      if (startResp.status === 409) {
        const err = await startResp.json() as { error: string };
        setProgress({
          phase: "error",
          message: err.error ?? "A backend sync is already running. Cancel it first.",
          processed: 0, total, errors: [err.error],
        });
        setPhase("upload");
        return;
      }

      // For 503 (no service account) or any other error, fall through
      const errData = await startResp.json() as { error?: string; code?: string };
      if (errData.code !== "no_service_account") {
        // Unexpected backend error — fall through to frontend sync
        console.warn("[sync] Backend error:", errData.error, "— falling back to frontend sync");
      }
    } catch {
      // Backend unreachable — fall through to frontend sync
      console.warn("[sync] Backend unavailable — falling back to frontend sync");
    }

    // ── Step 2: Frontend fallback sync ──────────────────────────────────────
    setSyncMode("frontend");
    setProgress((p) => ({
      ...p, message: "Using browser sync (backend service account not configured)…",
    }));

    const result = await executeSyncToFirestore(preview, (p) =>
      setProgress((prev) => ({ ...prev, ...p, phase: "syncing" }))
    );

    setSyncResult(result);
    setPhase("done");
    setProgress({
      phase: "done",
      message: result.quotaExhausted
        ? `Quota reached: ${result.created + result.updated} saved. Re-run to continue.`
        : `Sync complete: ${result.created} created, ${result.updated} updated${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
      processed: result.created + result.updated,
      total,
      errors: result.errors,
    });
  }

  function handleReset() {
    stopPolling();
    setFiles({});
    setPhase("upload");
    setPreview(null);
    setSyncResult(null);
    setSyncMode(null);
    setProgress({ phase: "idle", message: "Ready", processed: 0, total: 0, errors: [] });
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RefreshCw size={22} className="text-primary" />
          Inventory Sync
        </h1>
        <p className="text-muted-foreground mt-1">
          Import medicines from MediVision Gold SDF exports. Preview all changes before writing to Firestore.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
        <Info size={16} className="mt-0.5 shrink-0" />
        <div>
          <strong>Safe by design:</strong> No data is written to Firestore until you click "Confirm Sync". You can inspect every new and updated medicine in the preview below before committing.
        </div>
      </div>

      {/* File upload section */}
      {(phase === "upload" || phase === "parsing") && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Upload size={18} className="text-primary" />
            <h2 className="font-semibold text-lg">Upload SDF Files</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FILE_SLOTS.map((slot) => (
              <FileUploadCard
                key={slot.key}
                slot={slot}
                file={files[slot.key] ?? null}
                onFile={handleFile}
              />
            ))}
          </div>

          {phase === "parsing" && (
            <ProgressBar progress={progress} />
          )}

          {progress.phase === "error" && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
              <AlertCircle size={16} />
              <span>{progress.message}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              PRODUCT.SDF and STOCK.SDF are required. Others optional.
            </p>
            <button
              disabled={!canParse || phase === "parsing"}
              onClick={handleParseAndPreview}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {phase === "parsing" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Parsing…
                </>
              ) : (
                <>
                  <Eye size={16} />
                  Parse & Preview
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Preview section */}
      {phase === "preview" && preview && (
        <>
          <div className="bg-card border border-border rounded-2xl p-6">
            <PreviewSection preview={preview} />
          </div>

          {/* Confirm / Back */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-muted transition-colors text-sm"
            >
              <X size={14} />
              Start Over
            </button>

            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <div className="font-semibold">
                  {(preview.medicines.toCreate + preview.medicines.toUpdate).toLocaleString()} changes to apply
                </div>
                <div className="text-muted-foreground">
                  {preview.medicines.toCreate.toLocaleString()} new · {preview.medicines.toUpdate.toLocaleString()} updates
                </div>
              </div>
              <button
                onClick={handleConfirmSync}
                disabled={preview.medicines.toCreate + preview.medicines.toUpdate === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Zap size={16} />
                Confirm Sync
              </button>
            </div>
          </div>
        </>
      )}

      {/* Syncing */}
      {phase === "syncing" && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
          <Loader2 size={40} className="animate-spin text-primary mx-auto" />
          <h2 className="text-lg font-semibold">Syncing to Firestore…</h2>
          {syncMode && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
              ${syncMode === "backend"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
              }`}>
              {syncMode === "backend"
                ? <><Server size={12} /> Running in server (closes tab safely)</>
                : <><Monitor size={12} /> Running in browser (keep tab open)</>
              }
            </div>
          )}
          <div className="max-w-md mx-auto">
            <ProgressBar progress={progress} />
          </div>
          {syncMode === "backend" ? (
            <p className="text-sm text-muted-foreground">Processing on the server — you can navigate away safely.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Please keep this tab open while syncing.</p>
          )}
        </div>
      )}

      {/* Done */}
      {phase === "done" && syncResult && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6">
          {syncResult.quotaExhausted ? (
            <>
              <AlertCircle size={48} className="text-amber-500 mx-auto" />
              <div>
                <h2 className="text-xl font-bold text-amber-600">Quota Reached — Partially Synced</h2>
                <p className="text-muted-foreground mt-1 max-w-lg mx-auto">
                  Firestore's daily write quota was exhausted before all medicines could be saved.
                  The sync stopped safely — no data was lost or duplicated.
                </p>
              </div>
            </>
          ) : (
            <>
              <CheckCircle2 size={48} className="text-green-500 mx-auto" />
              <div>
                <h2 className="text-xl font-bold text-green-600">Sync Complete!</h2>
                <p className="text-muted-foreground mt-1">Your Firestore inventory has been updated.</p>
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{syncResult.created.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Created</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{syncResult.updated.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Updated</div>
            </div>
            <div className={`rounded-xl p-3 text-center ${syncResult.failed > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-muted"}`}>
              <div className={`text-2xl font-bold ${syncResult.failed > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {syncResult.failed.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Failed</div>
            </div>
          </div>

          {syncResult.quotaExhausted && (
            <div className="max-w-lg mx-auto text-left bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-400 space-y-1">
              <p className="font-semibold flex items-center gap-1.5"><RefreshCw size={13} /> How to resume:</p>
              <p>Re-run the sync tomorrow using the same SDF files. Already-written medicines will be automatically skipped — only the remaining ones will be uploaded.</p>
            </div>
          )}

          {syncResult.errors.length > 0 && !syncResult.quotaExhausted && (
            <div className="max-w-lg mx-auto text-left flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-400">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div className="space-y-1">
                {syncResult.errors.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors mx-auto"
          >
            <RefreshCw size={16} />
            {syncResult.quotaExhausted ? "Run Another Sync" : "Start New Sync"}
          </button>
        </div>
      )}

      {/* Diagnostics — always visible */}
      <DiagnosticsPanel />
    </div>
  );
}
