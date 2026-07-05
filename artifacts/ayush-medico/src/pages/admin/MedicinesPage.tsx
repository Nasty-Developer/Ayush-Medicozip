import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Pencil, Trash2, X, PackageCheck, PackageX, Clock, Loader2, Upload, Sparkles, Award } from "lucide-react";
import { subscribeToCollection, addDocument, updateDocument, deleteDocument, orderBy } from "@/lib/firestoreHelpers";
import { uploadMedicineImage } from "@/lib/storageHelpers";
import { useToast } from "@/hooks/use-toast";

type StockStatus = "in_stock" | "out_of_stock" | "coming_soon";

type Medicine = {
  id: string;
  name: string;
  brand: string;
  description: string;
  imageUrl: string;
  category: string;
  stockStatus: StockStatus;
  available?: boolean;
  sellingPrice: number | "";
  mrp: number | "";
  discount: number | "";
  showInNewArrivals: boolean;
  showInSpecialMedicines: boolean;
  order?: number;
};

const CATEGORIES = [
  "Fever & Pain Relief", "Antibiotic", "Allergy", "Antacid", "Diabetic Care",
  "Health Supplements", "Protein & Fitness", "Baby Care", "First Aid",
  "Medical Devices", "Personal Care", "Daily Essentials", "Wellness Products", "OTC Medicines", "Other"
];

const STOCK_OPTIONS: { value: StockStatus; label: string; icon: React.ReactNode }[] = [
  { value: "in_stock", label: "In Stock", icon: <PackageCheck size={13} /> },
  { value: "out_of_stock", label: "Out of Stock", icon: <PackageX size={13} /> },
  { value: "coming_soon", label: "Coming Soon", icon: <Clock size={13} /> },
];

function MedicineDialog({ medicine, onClose, onSave }: {
  medicine: Medicine | null;
  onClose: () => void;
  onSave: (data: Omit<Medicine, "id">) => Promise<void>;
}) {
  const [name, setName] = useState(medicine?.name ?? "");
  const [brand, setBrand] = useState(medicine?.brand ?? "");
  const [description, setDescription] = useState(medicine?.description ?? "");
  const [imageUrl, setImageUrl] = useState(medicine?.imageUrl ?? "");
  const [category, setCategory] = useState(medicine?.category ?? CATEGORIES[0]);
  const [stockStatus, setStockStatus] = useState<StockStatus>(
    medicine?.stockStatus ?? (medicine?.available === false ? "out_of_stock" : "in_stock")
  );
  const [sellingPrice, setSellingPrice] = useState<number | "">(medicine?.sellingPrice ?? "");
  const [mrp, setMrp] = useState<number | "">(medicine?.mrp ?? "");
  const [discount, setDiscount] = useState<number | "">(medicine?.discount ?? "");
  const [showInNewArrivals, setShowInNewArrivals] = useState(medicine?.showInNewArrivals ?? false);
  const [showInSpecialMedicines, setShowInSpecialMedicines] = useState(medicine?.showInSpecialMedicines ?? false);
  const [saving, setSaving] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(), brand: brand.trim(), description: description.trim(),
        imageUrl, category, stockStatus,
        sellingPrice: sellingPrice === "" ? "" : Number(sellingPrice),
        mrp: mrp === "" ? "" : Number(mrp),
        discount: discount === "" ? "" : Number(discount),
        showInNewArrivals, showInSpecialMedicines,
        order: medicine?.order ?? Date.now(),
      });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {medicine ? "Edit Medicine" : "Add Medicine"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Medicine Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              placeholder="e.g. Paracetamol 500mg"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
          </div>

          {/* Brand + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Brand</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Cipla"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="Brief description of the medicine..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none" />
          </div>

          {/* Image */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Medicine Image</label>
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
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Pricing (₹)</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Selling Price", val: sellingPrice, set: setSellingPrice },
                { label: "MRP (optional)", val: mrp, set: setMrp },
                { label: "Discount %", val: discount, set: setDiscount },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="block text-[10px] text-muted-foreground mb-1">{label}</label>
                  <div className="relative">
                    {label !== "Discount %" && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>}
                    <input type="number" min="0" max={label === "Discount %" ? 100 : undefined}
                      value={val} onChange={(e) => set(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="0"
                      className={`w-full ${label !== "Discount %" ? "pl-6" : "pl-3"} pr-2 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Status */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Stock Status</label>
            <div className="grid grid-cols-3 gap-2">
              {STOCK_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setStockStatus(opt.value)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                    stockStatus === opt.value
                      ? opt.value === "in_stock" ? "border-secondary text-secondary bg-secondary/5"
                        : opt.value === "out_of_stock" ? "border-muted-foreground text-muted-foreground bg-muted/30"
                        : "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/20"
                      : "border-border text-muted-foreground hover:bg-muted/30"
                  }`}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Homepage Sections — the two checkboxes */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Show on Homepage</label>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                showInNewArrivals ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
              }`}>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  showInNewArrivals ? "bg-primary border-primary" : "border-border"
                }`}>
                  {showInNewArrivals && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <input type="checkbox" checked={showInNewArrivals}
                  onChange={(e) => setShowInNewArrivals(e.target.checked)} className="sr-only" />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Sparkles size={13} className="text-primary" /> New Medicine Arrivals
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Appears in the "New Arrivals" slider on homepage</p>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                showInSpecialMedicines ? "border-secondary bg-secondary/5" : "border-border hover:bg-muted/30"
              }`}>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  showInSpecialMedicines ? "bg-secondary border-secondary" : "border-border"
                }`}>
                  {showInSpecialMedicines && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <input type="checkbox" checked={showInSpecialMedicines}
                  onChange={(e) => setShowInSpecialMedicines(e.target.checked)} className="sr-only" />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Award size={13} className="text-secondary" /> Special Medicines
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Appears in the "Exclusive" section on homepage</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
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
      </motion.div>
    </div>
  );
}

const STOCK_LABEL: Record<StockStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  in_stock: { label: "In Stock", cls: "bg-secondary/10 text-secondary", icon: <PackageCheck size={11} /> },
  out_of_stock: { label: "Out of Stock", cls: "bg-muted text-muted-foreground", icon: <PackageX size={11} /> },
  coming_soon: { label: "Coming Soon", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", icon: <Clock size={11} /> },
};

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [dialog, setDialog] = useState<{ open: boolean; medicine: Medicine | null }>({ open: false, medicine: null });
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = subscribeToCollection(
      "medicines", [orderBy("name")],
      (docs) => { setMedicines(docs as unknown as Medicine[]); setLoading(false); },
      () => { toast({ variant: "destructive", title: "Failed to load medicines" }); setLoading(false); }
    );
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    return medicines.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch = !q || m.name.toLowerCase().includes(q) || (m.brand || "").toLowerCase().includes(q) || (m.category || "").toLowerCase().includes(q);
      const matchCat = catFilter === "All" || m.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [medicines, search, catFilter]);

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
      console.error("Firebase Save Error:", error);
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      const code = (error as any)?.code ?? "unknown";
      console.error("Firebase error code:", code);
      console.error("Stack:", error instanceof Error ? error.stack : "n/a");
      toast({
        variant: "destructive",
        title: `Save Failed [${code}]`,
        description: msg,
      });
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteDocument("medicines", id);
      toast({ title: "Medicine removed" });
    } catch (error) {
      console.error("Firebase Delete Error:", error);
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      const code = (error as any)?.code ?? "unknown";
      console.error("Firebase error code:", code);
      toast({
        variant: "destructive",
        title: `Delete Failed [${code}]`,
        description: msg,
      });
    } finally { setDeleting(null); }
  };

  const handleCycleStock = async (med: Medicine) => {
    const cycle: StockStatus[] = ["in_stock", "out_of_stock", "coming_soon"];
    const current: StockStatus = med.stockStatus ?? (med.available ? "in_stock" : "out_of_stock");
    const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
    await updateDocument("medicines", med.id, { stockStatus: next });
  };

  const uniqueCategories = ["All", ...Array.from(new Set(medicines.map((m) => m.category).filter(Boolean)))];

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

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, category..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all">
          {uniqueCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <PackageX size={28} className="mb-2" />
            <p className="text-sm font-medium">{search || catFilter !== "All" ? "No medicines found" : "No medicines yet — add your first!"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Medicine</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Price</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Homepage</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((med) => {
                  const stockStatus: StockStatus = med.stockStatus ?? (med.available ? "in_stock" : "out_of_stock");
                  const { label, cls, icon } = STOCK_LABEL[stockStatus];
                  return (
                    <tr key={med.id} className="hover:bg-muted/20 transition-colors">
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
                            <p className="font-medium text-foreground leading-tight">{med.name}</p>
                            {med.brand && <p className="text-xs text-muted-foreground">{med.brand}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{med.category}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {med.sellingPrice ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-foreground text-xs">₹{med.sellingPrice}</span>
                            {med.mrp && Number(med.mrp) > Number(med.sellingPrice) && (
                              <span className="text-[10px] text-muted-foreground line-through">₹{med.mrp}</span>
                            )}
                            {med.discount ? (
                              <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1 py-0.5 rounded-full">{med.discount}% OFF</span>
                            ) : null}
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleCycleStock(med)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${cls}`}>
                          {icon} {label}
                        </button>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-2">
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
                          {!med.showInNewArrivals && !med.showInSpecialMedicines && (
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
          <MedicineDialog medicine={dialog.medicine} onClose={() => setDialog({ open: false, medicine: null })} onSave={handleSave} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
