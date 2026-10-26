/**
 * GeneralProductsPage — Admin
 * CRUD for general healthcare products stored in PostgreSQL via /api/general-products
 */

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Pencil, Trash2, X,
  PackageCheck, PackageX, Loader2, Upload, Sparkles, Star,
  ChevronDown, Tag, RefreshCw, ShoppingBag,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { uploadMedicineImage } from "@/lib/storageHelpers";
import { useCategories } from "@/hooks/useCategories";
import { useToast } from "@/hooks/use-toast";

/* ── Types ─────────────────────────────────────────────────────────────── */
type StockStatus = "in_stock" | "out_of_stock";
type ItemStatus  = "active" | "deleted";

type GeneralProduct = {
  id: number;
  name: string;
  brand: string | null;
  description: string | null;
  subCategory: string | null;
  packing: string | null;
  mrp: string | null;
  sellingPrice: string | null;
  discount: string | null;
  stockStatus: StockStatus;
  stockQty: number;
  imageUrl: string | null;
  featured: boolean;
  newArrival: boolean;
  status: ItemStatus;
  categoryId: number | null;
  categoryName: string | null;
};

type PageData = { data: GeneralProduct[]; total: number; page: number; limit: number };

const SUB_CATEGORIES = [
  "Chocolates","Energy Drinks","Biscuits","Adult Diapers","Baby Diapers",
  "Baby Care","Personal Care","Hygiene","First Aid","Medical Devices",
  "Protein & Nutrition","Vitamins","Health Drinks","Sanitizers","Masks",
  "Thermometers","Glucometers","Nebulizers","Orthopedic Supports",
  "Ayurvedic Products","Daily Essentials",
];

const STOCK_LABEL: Record<StockStatus, { label: string; cls: string }> = {
  in_stock:     { label: "In Stock",    cls: "bg-secondary/10 text-secondary" },
  out_of_stock: { label: "Out of Stock",cls: "bg-muted text-muted-foreground" },
};

async function adminFetch(path: string, init: RequestInit = {}) {
  const token = await auth?.currentUser?.getIdToken();
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> ?? {}),
    },
  });
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/* ── Dialog ─────────────────────────────────────────────────────────────── */
function GeneralProductDialog({
  item, onClose, onSave,
}: {
  item: GeneralProduct | null;
  onClose: () => void;
  onSave: (data: Partial<GeneralProduct>) => Promise<void>;
}) {
  const { categories, loading: catsLoading } = useCategories();
  const { toast } = useToast();

  const [name,         setName]         = useState(item?.name         ?? "");
  const [brand,        setBrand]        = useState(item?.brand        ?? "");
  const [description,  setDescription]  = useState(item?.description  ?? "");
  const [subCategory,  setSubCategory]  = useState(item?.subCategory  ?? "");
  const [packing,      setPacking]      = useState(item?.packing      ?? "");
  const [imageUrl,     setImageUrl]     = useState(item?.imageUrl     ?? "");
  const [mrp,          setMrp]          = useState(item?.mrp          ?? "");
  const [sellingPrice, setSellingPrice] = useState(item?.sellingPrice ?? "");
  const [discount,     setDiscount]     = useState(item?.discount     ?? "");
  const [stockStatus,  setStockStatus]  = useState<StockStatus>(item?.stockStatus ?? "in_stock");
  const [stockQty,     setStockQty]     = useState(item?.stockQty ?? 0);
  const [featured,     setFeatured]     = useState(item?.featured     ?? false);
  const [newArrival,   setNewArrival]   = useState(item?.newArrival   ?? false);
  const [status,       setStatus]       = useState<ItemStatus>(item?.status ?? "active");
  const [categoryId,   setCategoryId]   = useState<string>(item?.categoryId ? String(item.categoryId) : "");
  const [uploading,    setUploading]    = useState(false);
  const [uploadPct,    setUploadPct]    = useState(0);
  const [saving,       setSaving]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadPct(0);
    try {
      const url = await uploadMedicineImage(file, item ? `gp_${item.id}` : `gp_${Date.now()}`, setUploadPct);
      setImageUrl(url);
     } catch (err) {
       toast({ variant: "destructive", title: "Image upload failed", description: err instanceof Error ? err.message : "Please try again." });
     } finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(), brand: brand.trim() || null,
        description: description.trim() || null, subCategory: subCategory || null,
        packing: packing.trim() || null, imageUrl: imageUrl.trim() || null,
        mrp: mrp.trim() || null, sellingPrice: sellingPrice.trim() || null,
        discount: discount.trim() || null, stockStatus, stockQty: Number(stockQty),
        featured, newArrival, status,
        categoryId: categoryId ? Number(categoryId) : null,
      });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "'Poppins',sans-serif" }}>
            <ShoppingBag size={18} className="text-purple-500" />
            {item ? "Edit General Product" : "Add General Product"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        {catsLoading ? (
          <div className="flex items-center justify-center h-32"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <SectionHeader>Product Identity</SectionHeader>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Product Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="e.g. Cadbury Bournvita, Glucon-D, Adult Diaper"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Brand</label>
                <input value={brand} onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Cadbury, Ensure, Pampers"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Sub-Category</label>
                <div className="relative">
                  <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)}
                    className="w-full px-3 py-2.5 pr-8 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all appearance-none">
                    <option value="">— Select sub-category —</option>
                    {SUB_CATEGORIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                placeholder="Short product description"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Category</label>
                <div className="relative">
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 pr-8 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all appearance-none">
                    <option value="">— None —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Tag size={10} /> Pack Info</label>
                <input value={packing} onChange={(e) => setPacking(e.target.value)}
                  placeholder="e.g. 500g, 1L, 10 pcs"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>
            </div>

            <SectionHeader>Pricing (₹)</SectionHeader>
            <div className="grid grid-cols-3 gap-3">
              {([["Selling Price", sellingPrice, setSellingPrice], ["MRP", mrp, setMrp], ["Discount %", discount, setDiscount]] as const).map(([lbl, val, setter]) => (
                <div key={lbl}>
                  <label className="block text-[10px] text-muted-foreground mb-1">{lbl}</label>
                  <input type="number" min="0" step="0.01" value={String(val)} onChange={(e) => (setter as (v:string)=>void)(e.target.value)} placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Stock Status</label>
                <div className="relative">
                  <select value={stockStatus} onChange={(e) => setStockStatus(e.target.value as StockStatus)}
                    className="w-full px-3 py-2.5 pr-8 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all appearance-none">
                    <option value="in_stock">In Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Stock Qty</label>
                <input type="number" min="0" value={stockQty} onChange={(e) => setStockQty(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>
            </div>

            <SectionHeader>Product Image</SectionHeader>
            <div className="flex gap-3 items-start">
              {imageUrl && (
                <div className="w-14 h-14 rounded-xl border border-border bg-muted flex-shrink-0 overflow-hidden">
                  <img src={imageUrl} alt={name} className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://… or upload below"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all w-full justify-center disabled:opacity-60">
                  {uploading ? <><Loader2 size={12} className="animate-spin" /> {uploadPct}%</> : <><Upload size={12} /> Upload image</>}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="sr-only" />
              </div>
            </div>

            <SectionHeader>Display & Status</SectionHeader>
            <div className="grid grid-cols-2 gap-2">
              {(["active","deleted"] as ItemStatus[]).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all capitalize ${
                    status === s
                      ? s === "active" ? "border-secondary text-secondary bg-secondary/5" : "border-muted-foreground text-muted-foreground bg-muted/30"
                      : "border-border text-muted-foreground hover:bg-muted/30"
                  }`}>
                  {s === "active" ? <PackageCheck size={13} /> : <PackageX size={13} />}
                  {s === "active" ? "Active — Listed" : "Deleted — Hidden"}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {([
                [featured, () => setFeatured(!featured), <Star size={13} className="text-amber-500" />, "Featured", "Highlighted with a Featured badge", "border-amber-500 bg-amber-50 dark:bg-amber-950/20", "bg-amber-500 border-amber-500"],
                [newArrival, () => setNewArrival(!newArrival), <Sparkles size={13} className="text-primary" />, "New Arrival", "Appears in New Arrivals on the website", "border-primary bg-primary/5", "bg-primary border-primary"],
              ] as const).map(([checked, onToggle, icon, label, sub, activeWrapper, activeDot], i) => (
                <label key={i} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? activeWrapper : "border-border hover:bg-muted/30"}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${checked ? activeDot : "border-border"}`}>
                    {checked && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">{icon} {label}</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">Cancel</button>
              <button type="submit" disabled={saving || uploading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-70 transition-all">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {item ? "Save Changes" : "Add Product"}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
const PAGE_SIZE = 50;

export default function GeneralProductsPage() {
  const [pageData,     setPageData]     = useState<PageData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(1);
  const [subCatFilter, setSubCatFilter] = useState("All");
  const [dialog,       setDialog]       = useState<{ open: boolean; item: GeneralProduct | null }>({ open: false, item: null });
  const [deleting,     setDeleting]     = useState<number | null>(null);
  const { toast } = useToast();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string, p: number, sub: string) => {
    setLoading(true);
    try {
      const token  = await auth?.currentUser?.getIdToken();
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (q.trim()) params.set("search", q.trim());
      if (sub !== "All") params.set("subCategory", sub);
      const res = await fetch(`/api/general-products/admin?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      setPageData(await res.json() as PageData);
    } catch {
      toast({ variant: "destructive", title: "Failed to load products" });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load("", 1, "All"); }, []); // eslint-disable-line

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); load(val, 1, subCatFilter); }, 300);
  };

  const handleSubCat = (val: string) => { setSubCatFilter(val); setPage(1); load(search, 1, val); };

  const handleSave = async (data: Partial<GeneralProduct>) => {
    const isEdit = !!dialog.item;
    const path   = isEdit ? `/api/general-products/${dialog.item!.id}` : "/api/general-products";
    const res = await adminFetch(path, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(data) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? "Save failed");
    }
    toast({ title: isEdit ? "Product updated ✓" : "Product added ✓" });
    load(search, page, subCatFilter);
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      const res = await adminFetch(`/api/general-products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Product removed" });
      load(search, page, subCatFilter);
    } catch {
      toast({ variant: "destructive", title: "Failed to delete" });
    } finally { setDeleting(null); }
  };

  const handleToggle = async (item: GeneralProduct, flag: "featured" | "newArrival") => {
    try {
      const res = await adminFetch(`/api/general-products/${item.id}`, {
        method: "PUT", body: JSON.stringify({ [flag]: !item[flag] }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      await load(search, page, subCatFilter);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to update product flag",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const totalPages = pageData ? Math.ceil(pageData.total / PAGE_SIZE) : 1;
  const displayed  = pageData?.data ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "'Poppins',sans-serif" }}>
            <ShoppingBag size={22} className="text-purple-500" /> General Products
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pageData ? <>{pageData.total.toLocaleString()} products · <span className="text-primary font-medium">PostgreSQL</span></> : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(search, page, subCatFilter)} disabled={loading}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setDialog({ open: true, item: null })}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-md shadow-primary/25 hover:bg-primary/90 transition-all flex-shrink-0">
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Search + sub-category filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Search by name or brand…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
        </div>
        <select value={subCatFilter} onChange={(e) => handleSubCat(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all">
          <option value="All">All Sub-Categories</option>
          {SUB_CATEGORIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <ShoppingBag size={28} className="mb-2 opacity-40" />
            <p className="text-sm font-medium">
              {search || subCatFilter !== "All" ? "No products match your filters" : "No products yet — click Add Product"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Sub-Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Price</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stock</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Flags</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayed.map((prod) => {
                  const { label, cls } = STOCK_LABEL[prod.stockStatus] ?? STOCK_LABEL.out_of_stock;
                  const isDeleted = prod.status === "deleted";
                  return (
                    <tr key={prod.id} className={`hover:bg-muted/20 transition-colors ${isDeleted ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.name} className="w-9 h-9 rounded-lg object-cover border border-border flex-shrink-0"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center flex-shrink-0">
                              <ShoppingBag size={16} className="text-purple-500" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-foreground leading-tight">{prod.name}</p>
                              {isDeleted && <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1 py-0.5 rounded">Deleted</span>}
                            </div>
                            {prod.brand && <p className="text-xs text-muted-foreground">{prod.brand}</p>}
                            {prod.packing && <p className="text-[10px] text-muted-foreground/70">{prod.packing}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {prod.subCategory ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-xs font-medium">
                            {prod.subCategory}
                          </span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {prod.sellingPrice ? (
                          <div>
                            <p className="font-semibold text-foreground">₹{parseFloat(prod.sellingPrice).toFixed(0)}</p>
                            {prod.mrp && parseFloat(prod.mrp) > parseFloat(prod.sellingPrice) && (
                              <p className="text-[10px] text-muted-foreground line-through">₹{parseFloat(prod.mrp).toFixed(0)}</p>
                            )}
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleToggle(prod, "featured")} title="Featured"
                            className={`p-1 rounded transition-colors ${prod.featured ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-400"}`}>
                            <Star size={14} fill={prod.featured ? "currentColor" : "none"} />
                          </button>
                          <button onClick={() => handleToggle(prod, "newArrival")} title="New Arrival"
                            className={`p-1 rounded transition-colors ${prod.newArrival ? "text-primary" : "text-muted-foreground/40 hover:text-primary/60"}`}>
                            <Sparkles size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setDialog({ open: true, item: prod })}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(prod.id)} disabled={deleting === prod.id}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50">
                            {deleting === prod.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">{pageData?.total ?? 0} items · Page {page} of {totalPages}</p>
          <div className="flex gap-1.5">
            <button onClick={() => { setPage(p => Math.max(1, p-1)); load(search, Math.max(1, page-1), subCatFilter); }} disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted disabled:opacity-40">← Prev</button>
            <button onClick={() => { setPage(p => Math.min(totalPages, p+1)); load(search, Math.min(totalPages, page+1), subCatFilter); }} disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {dialog.open && (
          <GeneralProductDialog item={dialog.item} onClose={() => setDialog({ open: false, item: null })} onSave={handleSave} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
