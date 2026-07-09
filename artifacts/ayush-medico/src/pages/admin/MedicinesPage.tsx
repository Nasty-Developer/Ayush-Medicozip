/**
 * MedicinesPage — Admin
 *
 * Medicine catalog with full inventory fields designed to support future
 * MediVision Gold sync without schema changes.
 *
 * Features:
 *   • Dynamic category + brand dropdowns from Firestore (real-time).
 *   • "Other / New" option for both: auto-creates in Firestore + refreshes dropdown instantly.
 *   • All fields: name, brand, category, manufacturer, salt/composition,
 *     prescription required, SKU, barcode, pack size, batch number, expiry date,
 *     HSN code, GST, pricing (selling/MRP/discount/offer), stock qty,
 *     low stock alert, status, featured flags, description, meta title/description.
 *   • Stores categoryId + categoryName + brandId + brandName (backwards-compatible).
 *   • Filter dropdown populated from Firestore — no hardcoded arrays.
 */

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Pencil, Trash2, X,
  PackageCheck, PackageX, Clock, Loader2, Upload, Sparkles, Award, ChevronDown,
  FlaskConical, Pill, ClipboardList, Barcode, Tag, Calendar, Star,
} from "lucide-react";
import { subscribeToCollection, addDocument, updateDocument, deleteDocument, orderBy } from "@/lib/firestoreHelpers";
import { uploadMedicineImage } from "@/lib/storageHelpers";
import { useCategories } from "@/hooks/useCategories";
import { useBrands } from "@/hooks/useBrands";
import { useToast } from "@/hooks/use-toast";

/* ── Types ────────────────────────────────────────────────────────────────── */
type StockStatus = "in_stock" | "out_of_stock" | "coming_soon";
type MedStatus   = "active" | "inactive";

type Medicine = {
  id: string;
  name: string;
  // Brand — plain string (backwards-compat) + ID-based
  brand: string;
  brandId?: string;
  brandName?: string;
  // Category — plain string (backwards-compat) + ID-based
  category: string;
  categoryId?: string;
  categoryName?: string;
  // Product details
  manufacturer?: string;
  saltComposition?: string;
  prescriptionRequired?: boolean;
  // Inventory / SKU (supports MediVision Gold sync)
  sku?: string;
  barcode?: string;
  packSize?: string;
  batchNumber?: string;
  expiryDate?: string;           // ISO date string "YYYY-MM-DD"
  stockQty?: number | "";
  lowStockAlert?: number | "";
  // Regulatory
  hsnCode?: string;
  gst?: number | "";
  // Pricing
  sellingPrice: number | "";
  mrp: number | "";
  discount: number | "";
  offerPrice?: number | "";
  // Display & status
  stockStatus: StockStatus;
  available?: boolean;           // legacy
  status?: MedStatus;
  featured?: boolean;
  showInNewArrivals: boolean;
  showInSpecialMedicines: boolean;
  // Content
  description: string;
  imageUrl: string;
  metaTitle?: string;
  metaDescription?: string;
  order?: number;
};

const STOCK_OPTIONS: { value: StockStatus; label: string; icon: React.ReactNode }[] = [
  { value: "in_stock",     label: "In Stock",     icon: <PackageCheck size={13} /> },
  { value: "out_of_stock", label: "Out of Stock", icon: <PackageX     size={13} /> },
  { value: "coming_soon",  label: "Coming Soon",  icon: <Clock        size={13} /> },
];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/* ── Section header helper ────────────────────────────────────────────────── */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/* ── Medicine dialog ──────────────────────────────────────────────────────── */
function MedicineDialog({ medicine, onClose, onSave }: {
  medicine: Medicine | null;
  onClose: () => void;
  onSave: (data: Omit<Medicine, "id">) => Promise<void>;
}) {
  const { categories, loading: catsLoading } = useCategories();
  const { brands,     loading: brandsLoading } = useBrands();

  /* ── Core fields ── */
  const [name,             setName]             = useState(medicine?.name             ?? "");
  const [description,      setDescription]      = useState(medicine?.description      ?? "");
  const [imageUrl,         setImageUrl]          = useState(medicine?.imageUrl         ?? "");
  const [manufacturer,     setManufacturer]      = useState(medicine?.manufacturer     ?? "");
  const [saltComposition,  setSaltComposition]   = useState(medicine?.saltComposition  ?? "");
  const [prescriptionRequired, setPrescriptionRequired] = useState(medicine?.prescriptionRequired ?? false);

  /* ── Pricing ── */
  const [sellingPrice, setSellingPrice] = useState<number | "">(medicine?.sellingPrice ?? "");
  const [mrp,          setMrp]          = useState<number | "">(medicine?.mrp          ?? "");
  const [discount,     setDiscount]     = useState<number | "">(medicine?.discount     ?? "");
  const [offerPrice,   setOfferPrice]   = useState<number | "">(medicine?.offerPrice   ?? "");

  /* ── Inventory / SKU ── */
  const [sku,           setSku]           = useState(medicine?.sku           ?? "");
  const [barcode,       setBarcode]       = useState(medicine?.barcode       ?? "");
  const [packSize,      setPackSize]      = useState(medicine?.packSize      ?? "");
  const [batchNumber,   setBatchNumber]   = useState(medicine?.batchNumber   ?? "");
  const [expiryDate,    setExpiryDate]    = useState(medicine?.expiryDate    ?? "");
  const [stockQty,      setStockQty]      = useState<number | "">(medicine?.stockQty      ?? "");
  const [lowStockAlert, setLowStockAlert] = useState<number | "">(medicine?.lowStockAlert ?? "");

  /* ── Regulatory ── */
  const [hsnCode, setHsnCode] = useState(medicine?.hsnCode ?? "");
  const [gst,     setGst]     = useState<number | "">(medicine?.gst ?? "");

  /* ── Status & display ── */
  const [stockStatus,            setStockStatus]            = useState<StockStatus>(
    medicine?.stockStatus ?? (medicine?.available === false ? "out_of_stock" : "in_stock")
  );
  const [status,                 setStatus]                 = useState<MedStatus>(medicine?.status ?? "active");
  const [featured,               setFeatured]               = useState(medicine?.featured               ?? false);
  const [showInNewArrivals,      setShowInNewArrivals]      = useState(medicine?.showInNewArrivals      ?? false);
  const [showInSpecialMedicines, setShowInSpecialMedicines] = useState(medicine?.showInSpecialMedicines ?? false);

  /* ── SEO ── */
  const [metaTitle,       setMetaTitle]       = useState(medicine?.metaTitle       ?? "");
  const [metaDescription, setMetaDescription] = useState(medicine?.metaDescription ?? "");

  /* ── Category picker ── */
  const [catMode,   setCatMode]   = useState<"select" | "other">("select");
  const [catId,     setCatId]     = useState("");
  const [customCat, setCustomCat] = useState("");

  /* ── Brand picker ── */
  const [brandMode,   setBrandMode]   = useState<"select" | "other">("select");
  const [brandId,     setBrandId]     = useState("");
  const [customBrand, setCustomBrand] = useState("");

  /* ── One-time init when Firestore data arrives ── */
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (initialized || catsLoading || brandsLoading) return;

    if (medicine) {
      // Category — check ID first, then both stored name fields for backwards-compat
      const catNameFallback = (medicine.categoryName ?? medicine.category ?? "").toLowerCase();
      const catMatch = categories.find(
        (c) => c.id === medicine.categoryId ||
               (catNameFallback && c.name.toLowerCase() === catNameFallback)
      );
      if (catMatch) { setCatId(catMatch.id); setCatMode("select"); }
      else if (catNameFallback) { setCustomCat(medicine.categoryName || medicine.category || ""); setCatMode("other"); }
      else if (categories[0]) { setCatId(categories[0].id); setCatMode("select"); }

      // Brand — same pattern
      const brandNameFallback = (medicine.brandName ?? medicine.brand ?? "").toLowerCase();
      const brandMatch = brands.find(
        (b) => b.id === medicine.brandId ||
               (brandNameFallback && b.name.toLowerCase() === brandNameFallback)
      );
      if (brandMatch) { setBrandId(brandMatch.id); setBrandMode("select"); }
      else if (brandNameFallback) { setCustomBrand(medicine.brandName || medicine.brand || ""); setBrandMode("other"); }
    } else {
      if (categories[0]) { setCatId(categories[0].id); setCatMode("select"); }
    }
    setInitialized(true);
  }, [catsLoading, brandsLoading, initialized]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Image upload ── */
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadPct(0);
    try {
      const url = await uploadMedicineImage(file, medicine?.id ?? `med_${Date.now()}`, setUploadPct);
      setImageUrl(url);
    } catch { } finally { setUploading(false); }
  };

  /* ── Resolve / auto-create category ── */
  const resolveCategory = async (): Promise<{ category: string; categoryId: string; categoryName: string }> => {
    if (catMode === "select" && catId) {
      const cat = categories.find((c) => c.id === catId);
      return { category: cat?.name ?? "", categoryId: catId, categoryName: cat?.name ?? "" };
    }
    const nm = customCat.trim();
    if (!nm) return { category: "", categoryId: "", categoryName: "" };
    const existing = categories.find((c) => c.name.trim().toLowerCase() === nm.toLowerCase());
    if (existing) return { category: existing.name, categoryId: existing.id, categoryName: existing.name };
    const newId = await addDocument("categories", {
      name: nm, icon: "💊", description: "", color: "primary",
      enabled: true, slug: slugify(nm), order: Date.now(),
    });
    return { category: nm, categoryId: newId, categoryName: nm };
  };

  /* ── Resolve / auto-create brand ── */
  const resolveBrand = async (): Promise<{ brand: string; brandId: string; brandName: string }> => {
    if (brandMode === "select" && brandId) {
      const br = brands.find((b) => b.id === brandId);
      return { brand: br?.name ?? "", brandId, brandName: br?.name ?? "" };
    }
    const nm = customBrand.trim();
    if (!nm) return { brand: "", brandId: "", brandName: "" };
    const existing = brands.find((b) => b.name.trim().toLowerCase() === nm.toLowerCase());
    if (existing) return { brand: existing.name, brandId: existing.id, brandName: existing.name };
    const newId = await addDocument("brands", {
      name: nm, logoUrl: "", description: "", website: "", enabled: true, order: Date.now(),
    });
    return { brand: nm, brandId: newId, brandName: nm };
  };

  /* ── Submit ── */
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const [catResolved, brandResolved] = await Promise.all([resolveCategory(), resolveBrand()]);
      await onSave({
        name: name.trim(),
        description: description.trim(),
        imageUrl,
        manufacturer: manufacturer.trim(),
        saltComposition: saltComposition.trim(),
        prescriptionRequired,
        sku: sku.trim(),
        barcode: barcode.trim(),
        packSize: packSize.trim(),
        batchNumber: batchNumber.trim(),
        expiryDate,
        stockQty:      stockQty      === "" ? "" : Number(stockQty),
        lowStockAlert: lowStockAlert === "" ? "" : Number(lowStockAlert),
        hsnCode: hsnCode.trim(),
        gst: gst === "" ? "" : Number(gst),
        sellingPrice: sellingPrice === "" ? "" : Number(sellingPrice),
        mrp:          mrp          === "" ? "" : Number(mrp),
        discount:     discount     === "" ? "" : Number(discount),
        offerPrice:   offerPrice   === "" ? "" : Number(offerPrice),
        stockStatus,
        status,
        featured,
        showInNewArrivals,
        showInSpecialMedicines,
        metaTitle: metaTitle.trim(),
        metaDescription: metaDescription.trim(),
        order: medicine?.order ?? Date.now(),
        ...catResolved,
        ...brandResolved,
      });
      onClose();
    } finally { setSaving(false); }
  };

  const handleCatChange = (val: string) => {
    if (val === "__other__") { setCatMode("other"); setCatId(""); }
    else                     { setCatMode("select"); setCatId(val); }
  };
  const handleBrandChange = (val: string) => {
    if (val === "__other__") { setBrandMode("other"); setBrandId(""); }
    else                     { setBrandMode("select"); setBrandId(val); }
  };

  const catSelectValue   = catMode   === "other" ? "__other__" : catId;
  const brandSelectValue = brandMode === "other" ? "__other__" : brandId;
  const formLoading      = catsLoading || brandsLoading || !initialized;

  /* ── Number field helper ── */
  const numField = (
    label: string, val: number | "", set: (v: number | "") => void,
    opts?: { prefix?: string; suffix?: string; min?: number; max?: number; placeholder?: string }
  ) => (
    <div>
      <label className="block text-[10px] text-muted-foreground mb-1">{label}</label>
      <div className="relative">
        {opts?.prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">{opts.prefix}</span>}
        <input type="number" min={opts?.min ?? 0} max={opts?.max}
          value={val}
          onChange={(e) => set(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder={opts?.placeholder ?? "0"}
          className={`w-full ${opts?.prefix ? "pl-6" : "pl-3"} ${opts?.suffix ? "pr-6" : "pr-2"} py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all`}
        />
        {opts?.suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">{opts.suffix}</span>}
      </div>
    </div>
  );

  /* ── Toggle helper — explicit classes only (Tailwind purge-safe) ── */
  type ToggleColor = "primary" | "secondary" | "amber";
  const TOGGLE_CLS: Record<ToggleColor, { wrapper: string; dot: string }> = {
    primary:   { wrapper: "border-primary bg-primary/5",                                     dot: "bg-primary border-primary"   },
    secondary: { wrapper: "border-secondary bg-secondary/5",                                 dot: "bg-secondary border-secondary" },
    amber:     { wrapper: "border-amber-500 bg-amber-50 dark:bg-amber-950/20",               dot: "bg-amber-500 border-amber-500" },
  };

  const toggleRow = (
    checked: boolean, onToggle: () => void,
    icon: React.ReactNode, label: string, sub: string,
    color: ToggleColor = "primary"
  ) => {
    const cls = TOGGLE_CLS[color];
    return (
      <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
        checked ? cls.wrapper : "border-border hover:bg-muted/30"
      }`}>
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          checked ? cls.dot : "border-border"
        }`}>
          {checked && <span className="text-white text-xs font-bold">✓</span>}
        </div>
        <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
        <div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">{icon} {label}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
        </div>
      </label>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {medicine ? "Edit Medicine" : "Add Medicine"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        {formLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── PRODUCT IDENTITY ── */}
            <SectionHeader>Product Identity</SectionHeader>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Medicine Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="e.g. Paracetamol 500mg Tablet"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
            </div>

            {/* Brand + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Brand</label>
                <div className="relative">
                  <select value={brandSelectValue} onChange={(e) => handleBrandChange(e.target.value)}
                    className="w-full px-3 py-2.5 pr-8 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all appearance-none">
                    <option value="">— No brand —</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    <option value="__other__">✏️ Other / New Brand</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Category</label>
                <div className="relative">
                  <select value={catSelectValue} onChange={(e) => handleCatChange(e.target.value)}
                    className="w-full px-3 py-2.5 pr-8 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all appearance-none">
                    <option value="">— No category —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    <option value="__other__">✏️ Other / New Category</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Custom brand */}
            {brandMode === "other" && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Custom Brand Name</label>
                <input value={customBrand} onChange={(e) => setCustomBrand(e.target.value)}
                  placeholder="Enter brand name (auto-created if new)" required autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-primary/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                <p className="text-[10px] text-muted-foreground mt-1">New brands are created automatically in the Brands catalog.</p>
              </div>
            )}

            {/* Custom category */}
            {catMode === "other" && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Custom Category Name</label>
                <input value={customCat} onChange={(e) => setCustomCat(e.target.value)}
                  placeholder="Enter category name (auto-created if new)" required autoFocus={brandMode !== "other"}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-primary/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                <p className="text-[10px] text-muted-foreground mt-1">New categories are created automatically in the Categories catalog.</p>
              </div>
            )}

            {/* Manufacturer + Salt */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Manufacturer</label>
                <input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="e.g. Sun Pharma"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><FlaskConical size={10} /> Salt / Composition</label>
                <input value={saltComposition} onChange={(e) => setSaltComposition(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>
            </div>

            {/* Prescription required */}
            <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
              prescriptionRequired ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-border hover:bg-muted/30"
            }`}>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                prescriptionRequired ? "bg-amber-500 border-amber-500" : "border-border"
              }`}>
                {prescriptionRequired && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <input type="checkbox" checked={prescriptionRequired} onChange={(e) => setPrescriptionRequired(e.target.checked)} className="sr-only" />
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Pill size={13} className="text-amber-500" /> Prescription Required (Rx)
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Customer must upload a valid prescription to order</p>
              </div>
            </label>

            {/* ── INVENTORY ── */}
            <SectionHeader>Inventory & Stock</SectionHeader>

            <div className="grid grid-cols-2 gap-3">
              {numField("Stock Quantity", stockQty, setStockQty, { placeholder: "e.g. 100" })}
              {numField("Low Stock Alert", lowStockAlert, setLowStockAlert, { placeholder: "e.g. 10" })}
            </div>

            {/* Stock status */}
            <div>
              <label className="block text-[10px] text-muted-foreground mb-2">Stock Status</label>
              <div className="grid grid-cols-3 gap-2">
                {STOCK_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setStockStatus(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                      stockStatus === opt.value
                        ? opt.value === "in_stock"      ? "border-secondary text-secondary bg-secondary/5"
                          : opt.value === "out_of_stock" ? "border-muted-foreground text-muted-foreground bg-muted/30"
                          : "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/20"
                        : "border-border text-muted-foreground hover:bg-muted/30"
                    }`}>
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── IMAGE ── */}
            <SectionHeader>Product Image</SectionHeader>

            <div className="flex gap-3 items-start">
              {imageUrl && (
                <div className="w-14 h-14 rounded-xl border border-border bg-muted flex-shrink-0 overflow-hidden">
                  <img src={imageUrl} alt={name} className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... or upload below"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all w-full justify-center disabled:opacity-60">
                  {uploading ? <><Loader2 size={12} className="animate-spin" /> {uploadPct}%</> : <><Upload size={12} /> Upload image</>}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
              </div>
            </div>

            {/* ── PRICING ── */}
            <SectionHeader>Pricing (₹)</SectionHeader>

            <div className="grid grid-cols-2 gap-3">
              {numField("Selling Price *", sellingPrice, setSellingPrice, { prefix: "₹" })}
              {numField("MRP", mrp, setMrp, { prefix: "₹" })}
              {numField("Discount %", discount, setDiscount, { max: 100, placeholder: "0" })}
              {numField("Offer Price", offerPrice, setOfferPrice, { prefix: "₹", placeholder: "Optional" })}
            </div>
            <p className="text-[10px] text-muted-foreground -mt-2">
              Offer Price overrides Selling Price when set (use for limited-time promotions).
            </p>

            {/* ── PRODUCT DETAILS ── */}
            <SectionHeader>Product Details</SectionHeader>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Tag size={10} /> SKU</label>
                <input value={sku} onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. MED-PCM-500"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Barcode size={10} /> Barcode</label>
                <input value={barcode} onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g. 8901234567890"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><ClipboardList size={10} /> Pack Size</label>
                <input value={packSize} onChange={(e) => setPackSize(e.target.value)}
                  placeholder="e.g. 10 tablets, 100ml"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Batch Number</label>
                <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. BT2024001"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Calendar size={10} /> Expiry Date</label>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">HSN Code</label>
                <input value={hsnCode} onChange={(e) => setHsnCode(e.target.value)}
                  placeholder="e.g. 30049099"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>
              {numField("GST %", gst, setGst, { max: 100, placeholder: "e.g. 12" })}
            </div>

            {/* ── DISPLAY SETTINGS ── */}
            <SectionHeader>Display & Status</SectionHeader>

            {/* Active / Inactive */}
            <div className="grid grid-cols-2 gap-2">
              {(["active", "inactive"] as MedStatus[]).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all capitalize ${
                    status === s
                      ? s === "active" ? "border-secondary text-secondary bg-secondary/5"
                        : "border-muted-foreground text-muted-foreground bg-muted/30"
                      : "border-border text-muted-foreground hover:bg-muted/30"
                  }`}>
                  {s === "active" ? <PackageCheck size={13} /> : <PackageX size={13} />}
                  {s === "active" ? "Active — Listed" : "Inactive — Hidden"}
                </button>
              ))}
            </div>

            {/* Homepage toggles */}
            <div className="space-y-2">
              {toggleRow(featured, () => setFeatured(!featured),
                <Star size={13} className="text-amber-500" />,
                "Featured Medicine", "Highlighted with a Featured badge", "amber-500"
              )}
              {toggleRow(showInNewArrivals, () => setShowInNewArrivals(!showInNewArrivals),
                <Sparkles size={13} className="text-primary" />,
                "New Arrivals", `Appears in the "New Arrivals" section on homepage`, "primary"
              )}
              {toggleRow(showInSpecialMedicines, () => setShowInSpecialMedicines(!showInSpecialMedicines),
                <Award size={13} className="text-secondary" />,
                "Special Medicines", `Appears in the "Exclusive" section on homepage`, "secondary"
              )}
            </div>

            {/* ── DESCRIPTION ── */}
            <SectionHeader>Description</SectionHeader>

            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="Brief description of the medicine, its uses and benefits..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none" />

            {/* ── SEO ── */}
            <SectionHeader>SEO (optional)</SectionHeader>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Meta Title</label>
                <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="e.g. Buy Paracetamol 500mg — Ayush Medico Kurla West"
                  maxLength={70}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{metaTitle.length}/70</p>
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Meta Description</label>
                <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)}
                  rows={2} placeholder="Short description for search engines..." maxLength={160}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none" />
                <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{metaDescription.length}/160</p>
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                Cancel
              </button>
              <button type="submit" disabled={saving || uploading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-70 transition-all">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {medicine ? "Save Changes" : "Add Medicine"}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

/* ── Stock label map ──────────────────────────────────────────────────────── */
const STOCK_LABEL: Record<StockStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  in_stock:    { label: "In Stock",     cls: "bg-secondary/10 text-secondary",                                               icon: <PackageCheck size={11} /> },
  out_of_stock:{ label: "Out of Stock", cls: "bg-muted text-muted-foreground",                                               icon: <PackageX     size={11} /> },
  coming_soon: { label: "Coming Soon",  cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",         icon: <Clock        size={11} /> },
};

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [dialog,    setDialog]    = useState<{ open: boolean; medicine: Medicine | null }>({ open: false, medicine: null });
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const { toast } = useToast();

  // Live categories for the filter dropdown (all, not just enabled)
  const { categories } = useCategories();

  useEffect(() => {
    const unsub = subscribeToCollection(
      "medicines", [orderBy("name")],
      (docs) => { setMedicines(docs as unknown as Medicine[]); setLoading(false); },
      () => { toast({ variant: "destructive", title: "Failed to load medicines" }); setLoading(false); }
    );
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    return medicines.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || m.name.toLowerCase().includes(q)
        || (m.brand         || "").toLowerCase().includes(q)
        || (m.category      || "").toLowerCase().includes(q)
        || (m.brandName     || "").toLowerCase().includes(q)
        || (m.categoryName  || "").toLowerCase().includes(q)
        || (m.manufacturer  || "").toLowerCase().includes(q)
        || (m.sku           || "").toLowerCase().includes(q)
        || (m.barcode       || "").toLowerCase().includes(q);
      const matchCat = catFilter === "All" || m.category === catFilter || m.categoryName === catFilter;
      return matchSearch && matchCat;
    });
  }, [medicines, search, catFilter]);

  // Filter options: Firestore categories + any extra category names still on old medicines
  const catFilterOptions = useMemo(() => {
    const fromFirestore = categories.map((c) => c.name);
    const fromMedicines = medicines.map((m) => m.categoryName || m.category || "").filter(Boolean);
    const merged = Array.from(new Set([...fromFirestore, ...fromMedicines])).sort();
    return ["All", ...merged];
  }, [categories, medicines]);

  const handleSave = async (data: Omit<Medicine, "id">) => {
    try {
      if (dialog.medicine) {
        await updateDocument("medicines", dialog.medicine.id, data);
        toast({ title: "Medicine updated ✓" });
      } else {
        await addDocument("medicines", data);
        toast({ title: "Medicine added ✓" });
      }
    } catch (error) {
      const msg  = error instanceof Error ? error.message : JSON.stringify(error);
      const code = (error as any)?.code ?? "unknown";
      toast({ variant: "destructive", title: `Save Failed [${code}]`, description: msg });
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteDocument("medicines", id);
      toast({ title: "Medicine removed" });
    } catch (error) {
      const msg  = error instanceof Error ? error.message : JSON.stringify(error);
      const code = (error as any)?.code ?? "unknown";
      toast({ variant: "destructive", title: `Delete Failed [${code}]`, description: msg });
    } finally { setDeleting(null); }
  };

  const handleCycleStock = async (med: Medicine) => {
    const cycle: StockStatus[] = ["in_stock", "out_of_stock", "coming_soon"];
    const current: StockStatus = med.stockStatus ?? (med.available ? "in_stock" : "out_of_stock");
    const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
    await updateDocument("medicines", med.id, { stockStatus: next });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Medicines</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {medicines.length} in catalog · <span className="text-primary font-medium">live sync</span>
          </p>
        </div>
        <button onClick={() => setDialog({ open: true, medicine: null })}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-md shadow-primary/25 hover:bg-primary/90 transition-all flex-shrink-0">
          <Plus size={16} /> Add Medicine
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, category, SKU, barcode..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all">
          {catFilterOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <PackageX size={28} className="mb-2" />
            <p className="text-sm font-medium">
              {search || catFilter !== "All" ? "No medicines found" : "No medicines yet — add your first!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Medicine</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">SKU / Stock</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Flags</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((med) => {
                  const stockSt: StockStatus = med.stockStatus ?? (med.available ? "in_stock" : "out_of_stock");
                  const { label, cls, icon } = STOCK_LABEL[stockSt];
                  const displayCategory = med.categoryName || med.category || "—";
                  const displayBrand    = med.brandName    || med.brand    || "";
                  const isInactive      = med.status === "inactive";
                  return (
                    <tr key={med.id} className={`hover:bg-muted/20 transition-colors ${isInactive ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {med.imageUrl ? (
                            <img src={med.imageUrl} alt={med.name}
                              className="w-9 h-9 rounded-lg object-cover border border-border flex-shrink-0"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-primary font-bold text-xs">{med.name.charAt(0)}</span>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-foreground leading-tight">{med.name}</p>
                              {med.prescriptionRequired && (
                                <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950/40 px-1 py-0.5 rounded">Rx</span>
                              )}
                              {med.featured && (
                                <Star size={10} className="text-amber-500 fill-amber-500" />
                              )}
                              {isInactive && (
                                <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1 py-0.5 rounded">Inactive</span>
                              )}
                            </div>
                            {displayBrand && <p className="text-xs text-muted-foreground">{displayBrand}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{displayCategory}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {med.sellingPrice ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {med.offerPrice ? (
                              <>
                                <span className="font-bold text-secondary text-xs">₹{med.offerPrice}</span>
                                <span className="text-[10px] text-muted-foreground line-through">₹{med.sellingPrice}</span>
                              </>
                            ) : (
                              <span className="font-bold text-foreground text-xs">₹{med.sellingPrice}</span>
                            )}
                            {med.mrp && Number(med.mrp) > Number(med.sellingPrice) && (
                              <span className="text-[10px] text-muted-foreground line-through">MRP ₹{med.mrp}</span>
                            )}
                            {med.discount ? (
                              <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1 py-0.5 rounded-full">{med.discount}% OFF</span>
                            ) : null}
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="space-y-0.5">
                          {med.sku && <p className="text-[10px] text-muted-foreground font-mono">{med.sku}</p>}
                          {med.stockQty !== undefined && med.stockQty !== "" && (
                            <p className={`text-[10px] font-semibold ${
                              med.lowStockAlert && Number(med.stockQty) <= Number(med.lowStockAlert)
                                ? "text-amber-600" : "text-muted-foreground"
                            }`}>
                              Qty: {med.stockQty}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleCycleStock(med)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${cls}`}>
                          {icon} {label}
                        </button>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {med.showInNewArrivals && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                              <Sparkles size={9} /> New
                            </span>
                          )}
                          {med.showInSpecialMedicines && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-semibold">
                              <Award size={9} /> Special
                            </span>
                          )}
                          {med.featured && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40 text-[10px] font-semibold">
                              <Star size={9} /> Featured
                            </span>
                          )}
                          {!med.showInNewArrivals && !med.showInSpecialMedicines && !med.featured && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setDialog({ open: true, medicine: med })}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(med.id)} disabled={deleting === med.id}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40">
                            {deleting === med.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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

      <AnimatePresence>
        {dialog.open && (
          <MedicineDialog
            medicine={dialog.medicine}
            onClose={() => setDialog({ open: false, medicine: null })}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
