/**
 * BrandsPage — Admin
 *
 * Changes from original:
 *   • Real-time listener via useBrands hook (live updates everywhere).
 *   • Duplicate name validation (case-insensitive, trimmed).
 */

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Loader2, Building2, Upload, AlertCircle } from "lucide-react";
import { addDocument, updateDocument, deleteDocument } from "@/lib/firestoreHelpers";
import { uploadBrandLogo } from "@/lib/storageHelpers";
import { useBrands, type Brand } from "@/hooks/useBrands";
import { useToast } from "@/hooks/use-toast";

/* ── Dialog ───────────────────────────────────────────────────────────────── */
function BrandDialog({ brand, allBrands, onClose, onSave }: {
  brand: Brand | null;
  allBrands: Brand[];
  onClose: () => void;
  onSave: (data: Omit<Brand, "id">) => Promise<void>;
}) {
  const [name,        setName]        = useState(brand?.name        ?? "");
  const [logoUrl,     setLogoUrl]     = useState(brand?.logoUrl     ?? "");
  const [description, setDescription] = useState(brand?.description ?? "");
  const [website,     setWebsite]     = useState(brand?.website     ?? "");
  const [enabled,     setEnabled]     = useState(brand?.enabled     ?? true);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadPct,   setUploadPct]   = useState(0);
  const [nameError,   setNameError]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const validateName = (val: string) => {
    const trimmed = val.trim();
    const dup = allBrands.some(
      (b) => b.id !== brand?.id && b.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    setNameError(dup ? "A brand with this name already exists." : "");
    return !dup && trimmed.length > 0;
  };

  const handleNameChange = (val: string) => { setName(val); validateName(val); };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadPct(0);
    try {
      const url = await uploadBrandLogo(file, brand?.id ?? `new_${Date.now()}`, setUploadPct);
      setLogoUrl(url);
    } catch { } finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateName(name)) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(), logoUrl, description: description.trim(),
        website: website.trim(), enabled, order: brand?.order ?? Date.now(),
      });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {brand ? "Edit Brand" : "Add Brand"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Brand Name *</label>
            <input
              value={name} onChange={(e) => handleNameChange(e.target.value)} required
              placeholder="e.g. Sun Pharma, Cipla, Abbott"
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                nameError ? "border-destructive focus:ring-destructive/30" : "border-border focus:ring-primary/40"
              }`}
            />
            {nameError && (
              <p className="flex items-center gap-1.5 mt-1.5 text-xs text-destructive">
                <AlertCircle size={11} /> {nameError}
              </p>
            )}
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Brand Logo</label>
            <div className="flex gap-3 items-start">
              {logoUrl && (
                <div className="w-14 h-14 rounded-xl border border-border bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img src={logoUrl} alt={name} className="w-full h-full object-contain p-1" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://... (paste logo URL)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all w-full justify-center disabled:opacity-60">
                  {uploading ? <><Loader2 size={12} className="animate-spin" /> Uploading {uploadPct}%</> : <><Upload size={12} /> Upload logo</>}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="sr-only" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of the brand"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Website (optional)</label>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} type="url"
              placeholder="https://www.brand.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
          </div>

          {/* Published toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Published</p>
              <p className="text-xs text-muted-foreground">Show this brand on the website</p>
            </div>
            <button type="button" onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-secondary" : "bg-muted-foreground/30"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving || uploading || !!nameError}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-70 transition-all">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {brand ? "Save Changes" : "Add Brand"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function BrandsPage() {
  const { brands, loading } = useBrands();   // real-time, all (not just enabled)
  const [dialog, setDialog]   = useState<{ open: boolean; brand: Brand | null }>({ open: false, brand: null });
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSave = async (data: Omit<Brand, "id">) => {
    try {
      if (dialog.brand) {
        await updateDocument("brands", dialog.brand.id, data);
        toast({ title: "Brand updated ✓" });
      } else {
        await addDocument("brands", data);
        toast({ title: "Brand added ✓" });
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to save brand" });
      throw new Error("save failed");
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteDocument("brands", id);
      toast({ title: "Brand removed" });
    } catch {
      toast({ variant: "destructive", title: "Failed to delete brand" });
    } finally { setDeleting(null); }
  };

  const handleToggle = async (brand: Brand) => {
    try {
      await updateDocument("brands", brand.id, { enabled: !brand.enabled });
    } catch {
      toast({ variant: "destructive", title: "Failed to update" });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Brands</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {brands.length} brands · <span className="text-primary font-medium">live sync</span>
          </p>
        </div>
        <button onClick={() => setDialog({ open: true, brand: null })}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-md shadow-primary/25 hover:bg-primary/90 transition-all flex-shrink-0">
          <Plus size={16} /> Add Brand
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 bg-card border border-border rounded-2xl text-muted-foreground">
          <Building2 size={28} className="mb-2" />
          <p className="text-sm font-medium">No brands yet</p>
          <p className="text-xs mt-1">Add your first brand above</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <div key={brand.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {brand.logoUrl ? (
                    <div className="w-10 h-10 rounded-xl border border-border bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-contain p-0.5" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                      <Building2 size={18} className="text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{brand.name}</p>
                    {brand.description && <p className="text-xs text-muted-foreground truncate">{brand.description}</p>}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button onClick={() => handleToggle(brand)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${brand.enabled ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
                  {brand.enabled ? "Published" : "Hidden"}
                </button>
                <div className="flex gap-1">
                  <button onClick={() => setDialog({ open: true, brand })}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(brand.id)} disabled={deleting === brand.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40">
                    {deleting === brand.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {dialog.open && (
          <BrandDialog
            brand={dialog.brand}
            allBrands={brands}
            onClose={() => setDialog({ open: false, brand: null })}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
