/**
 * BrandsPage (Companies) — Admin
 *
 * Displays pharmaceutical companies from the PostgreSQL database.
 * Companies are primarily populated via the Inventory Sync (MediVision Gold).
 * Admins can also add, rename, or delete companies manually.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, X, Loader2, Building2, Search, AlertCircle, RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { invalidateBrandsCache } from "@/hooks/useBrands";
import { adminFetch, adminJson, AdminApiError } from "@/lib/adminApi";

/* ── Types ───────────────────────────────────────────────────────────────── */
type Company = { id: number; name: string; createdAt: string };
type PageData = { data: Company[]; total: number; page: number; limit: number };

/* ── Dialog ──────────────────────────────────────────────────────────────── */
function CompanyDialog({
  company, allNames, onClose, onSave,
}: {
  company: Company | null;
  allNames: Set<string>;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name,      setName]      = useState(company?.name ?? "");
  const [saving,    setSaving]    = useState(false);
  const [nameError, setNameError] = useState("");

  const validate = (val: string) => {
    const trimmed = val.trim().toLowerCase();
    const isDup = [...allNames].some(
      (n) => n.toLowerCase() === trimmed && n.toLowerCase() !== (company?.name ?? "").toLowerCase()
    );
    setNameError(isDup ? "A company with this name already exists." : "");
    return !isDup && trimmed.length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(name)) return;
    setSaving(true);
    try { await onSave(name.trim()); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {company ? "Rename Company" : "Add Company"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Brand Name *</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); validate(e.target.value); }}
              required autoFocus
              placeholder="e.g. Sun Pharma, Cipla, Abbott"
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 transition-all ${
                nameError ? "border-destructive focus:ring-destructive/30" : "border-border focus:ring-primary/40"
              }`}
            />
            {nameError && (
              <p className="flex items-center gap-1.5 mt-1.5 text-xs text-destructive">
                <AlertCircle size={11} /> {nameError}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving || !!nameError}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-70 transition-all">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {company ? "Save" : "Add Brand"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
const PAGE_SIZE = 50;

export default function BrandsPage() {
  const [pageData,  setPageData]  = useState<PageData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(1);
  const [dialog,    setDialog]    = useState<{ open: boolean; company: Company | null }>({ open: false, company: null });
  const [deleting,  setDeleting]  = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast } = useToast();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (q.trim()) params.set("search", q.trim());
      const data = await adminJson<PageData>(`/api/admin/companies?${params}`);
      // Never trust the shape: an error body must not become the list payload.
      setPageData({
        data:  Array.isArray(data?.data) ? data.data : [],
        total: typeof data?.total === "number" ? data.total : 0,
        page:  typeof data?.page === "number" ? data.page : p,
        limit: typeof data?.limit === "number" ? data.limit : PAGE_SIZE,
      });
      setLoadError(null);
    } catch (err) {
      setPageData({ data: [], total: 0, page: p, limit: PAGE_SIZE });
      setLoadError(err instanceof AdminApiError ? err.message : "Could not load brands. Check your connection and try again.");
      toast({ variant: "destructive", title: "Failed to load brands" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(search, page); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); load(val, 1); }, 300);
  };

  const handlePage = (p: number) => { setPage(p); load(search, p); };

  /* ── CRUD ─────────────────────────────────────────────────────────────── */
  const handleSave = async (name: string) => {
    const isEdit = !!dialog.company;
    const res = isEdit
      ? await adminFetch(`/api/admin/companies/${dialog.company!.id}`, {
          method: "PUT", body: JSON.stringify({ name }),
        })
      : await adminFetch("/api/admin/companies", {
          method: "POST", body: JSON.stringify({ name }),
        });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? "Save failed");
    }
    toast({ title: isEdit ? "Brand renamed ✓" : "Brand added ✓" });
    invalidateBrandsCache();
    load(search, page);
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      const res = await adminFetch(`/api/admin/companies/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Brand removed" });
      invalidateBrandsCache();
      load(search, page);
    } catch {
      toast({ variant: "destructive", title: "Failed to delete brand" });
    } finally {
      setDeleting(null);
    }
  };

  const allNames = new Set((pageData?.data ?? []).map((c) => c.name));
  const totalPages = pageData ? Math.ceil(pageData.total / PAGE_SIZE) : 1;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Brands
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pageData ? (
              <>{pageData.total.toLocaleString()} brands · used in the medicine brand field</>
            ) : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(search, page)}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setDialog({ open: true, company: null })}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-md shadow-primary/25 hover:bg-primary/90 transition-all flex-shrink-0"
          >
            <Plus size={16} /> Add Brand
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search brands…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
      </div>

      {/* Info banner */}
      <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
        <span className="font-semibold text-primary">Companies are imported automatically</span> during Inventory Sync
        from MediVision Gold. Manually add or rename companies that aren't in the catalogue.
      </div>

      {loadError && !loading && (
        <div className="mb-4 flex items-start gap-3 p-4 rounded-2xl border border-destructive/30 bg-destructive/5">
          <AlertCircle size={18} className="text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Brands could not be loaded</p>
            <p className="text-xs text-muted-foreground mt-0.5 break-words">{loadError}</p>
          </div>
          <button
            onClick={() => load(search, page)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors flex-shrink-0"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm" aria-busy="true" aria-label="Loading brands">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            <div className="h-3 w-28 rounded bg-muted animate-pulse" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0">
              <div className="h-3 w-4 rounded bg-muted animate-pulse" />
              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
              <div className="h-3 flex-1 max-w-[220px] rounded bg-muted animate-pulse" />
              <div className="ml-auto h-3 w-14 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : !pageData || pageData.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 bg-card border border-border rounded-2xl text-muted-foreground">
          <Building2 size={28} className="mb-2" />
          <p className="text-sm font-medium">
            {search ? "No brands match your search" : "No brands yet — run an Inventory Sync or add one manually"}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Brand Name</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageData.data.map((co, idx) => (
                    <tr key={co.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                            <Building2 size={14} className="text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{co.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDialog({ open: true, company: co })}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(co.id)}
                            disabled={deleting === co.id}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                          >
                            {deleting === co.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pageData.total)} of {pageData.total.toLocaleString()}
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handlePage(page - 1)} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  ← Prev
                </button>
                <span className="px-3 py-1.5 text-xs text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => handlePage(page + 1)} disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {dialog.open && (
          <CompanyDialog
            company={dialog.company}
            allNames={allNames}
            onClose={() => setDialog({ open: false, company: null })}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
