/**
 * CategoriesPage — Admin
 *
 * Changes from original:
 *   • Real-time listener via subscribeToCollection (live updates everywhere).
 *   • Drag-and-drop ordering — saves order field to Firestore.
 *   • Duplicate name validation (case-insensitive, trimmed).
 *   • Slug auto-generated on create.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Loader2, GripVertical, Tag, AlertCircle } from "lucide-react";
import { addDocument, updateDocument, deleteDocument } from "@/lib/firestoreHelpers";
import { useCategories, type Category } from "@/hooks/useCategories";
import { useToast } from "@/hooks/use-toast";

const PRESET_ICONS  = ["💊","🩺","🩹","💉","🧬","🫀","🫁","🧠","👶","🌿","💪","🔬","❤️‍🩹","🏥","⚕️","🍀","🌡️","🧪","🦷","👁️"];
const PRESET_COLORS = ["primary","secondary","accent","purple","orange","pink","red","yellow"];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/* ── Dialog ───────────────────────────────────────────────────────────────── */
function CategoryDialog({ category, allCategories, onClose, onSave }: {
  category: Category | null;
  allCategories: Category[];
  onClose: () => void;
  onSave: (data: Omit<Category, "id">) => Promise<void>;
}) {
  const [name,        setName]        = useState(category?.name        ?? "");
  const [icon,        setIcon]        = useState(category?.icon        ?? "💊");
  const [description, setDescription] = useState(category?.description ?? "");
  const [color,       setColor]       = useState(category?.color       ?? "primary");
  const [enabled,     setEnabled]     = useState(category?.enabled     ?? true);
  const [saving,      setSaving]      = useState(false);
  const [nameError,   setNameError]   = useState("");

  const validateName = (val: string) => {
    const trimmed = val.trim();
    const dup = allCategories.some(
      (c) => c.id !== category?.id && c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    setNameError(dup ? "A category with this name already exists." : "");
    return !dup && trimmed.length > 0;
  };

  const handleNameChange = (val: string) => {
    setName(val);
    validateName(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateName(name)) return;
    setSaving(true);
    try {
      await onSave({
        name:        name.trim(),
        icon,
        description: description.trim(),
        color,
        enabled,
        slug:        slugify(name),
        order:       category?.order ?? Date.now(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {category ? "Edit Category" : "Add Category"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Category Name *</label>
            <input
              value={name} onChange={(e) => handleNameChange(e.target.value)} required
              placeholder="e.g. Fever & Pain Relief"
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

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Icon (emoji)</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {PRESET_ICONS.map((i) => (
                <button key={i} type="button" onClick={() => setIcon(i)}
                  className={`w-9 h-9 rounded-xl text-lg transition-all ${icon === i ? "bg-primary/20 ring-2 ring-primary" : "bg-muted hover:bg-muted/70"}`}>
                  {i}
                </button>
              ))}
            </div>
            <input
              value={icon} onChange={(e) => setIcon(e.target.value)}
              placeholder="Or type any emoji / symbol"
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <input
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of this category"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Color Theme</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                    color === c ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Published toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Published</p>
              <p className="text-xs text-muted-foreground">Show this category on the website</p>
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
            <button type="submit" disabled={saving || !!nameError}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-70 transition-all">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {category ? "Save Changes" : "Add Category"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function CategoriesPage() {
  const { categories, loading } = useCategories();   // real-time, all (not just enabled)
  const [dialog, setDialog]     = useState<{ open: boolean; category: Category | null }>({ open: false, category: null });
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  /* ── Drag-and-drop ──────────────────────────────────────────────────────── */
  const dragFrom   = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handleDragStart = (idx: number) => { dragFrom.current = idx; };
  const handleDragOver  = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOver(idx); };
  const handleDragEnd   = () => { dragFrom.current = null; setDragOver(null); };

  const handleDrop = async (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    setDragOver(null);
    const fromIdx = dragFrom.current;
    dragFrom.current = null;
    if (fromIdx === null || fromIdx === dropIdx) return;

    // Re-order array
    const reordered = [...categories];
    const [item] = reordered.splice(fromIdx, 1);
    reordered.splice(dropIdx, 0, item);

    // Persist new order to Firestore (sequential integers × 10 leaves room for inserts)
    await Promise.all(
      reordered.map((cat, i) => updateDocument("categories", cat.id, { order: (i + 1) * 10 }))
    );
  };

  /* ── CRUD ───────────────────────────────────────────────────────────────── */
  const handleSave = async (data: Omit<Category, "id">) => {
    try {
      if (dialog.category) {
        await updateDocument("categories", dialog.category.id, data);
        toast({ title: "Category updated ✓" });
      } else {
        await addDocument("categories", data);
        toast({ title: "Category added ✓" });
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to save category" });
      throw new Error("save failed");
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteDocument("categories", id);
      toast({ title: "Category removed" });
    } catch {
      toast({ variant: "destructive", title: "Failed to delete category" });
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (cat: Category) => {
    try {
      await updateDocument("categories", cat.id, { enabled: !cat.enabled });
    } catch {
      toast({ variant: "destructive", title: "Failed to update" });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Categories</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {categories.length} categories · <span className="text-primary font-medium">live sync</span>
          </p>
        </div>
        <button onClick={() => setDialog({ open: true, category: null })}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-md shadow-primary/25 hover:bg-primary/90 transition-all flex-shrink-0">
          <Plus size={16} /> Add Category
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 bg-card border border-border rounded-2xl text-muted-foreground">
          <Tag size={28} className="mb-2" />
          <p className="text-sm font-medium">No categories yet</p>
          <p className="text-xs mt-1">Add your first category above</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
            <GripVertical size={12} /> Drag rows to reorder — order is saved automatically
          </p>
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={`bg-card border rounded-2xl p-4 shadow-sm flex items-center gap-3 transition-all duration-150 ${
                dragOver === idx ? "border-primary/50 bg-primary/5 scale-[1.01]" : "border-border"
              }`}
            >
              <GripVertical size={16} className="text-muted-foreground flex-shrink-0 cursor-grab active:cursor-grabbing" />
              <span className="text-2xl flex-shrink-0 select-none">{cat.icon || "💊"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                {cat.description && <p className="text-xs text-muted-foreground truncate">{cat.description}</p>}
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">slug: {cat.slug || slugify(cat.name)}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => handleToggle(cat)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                    cat.enabled ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"
                  }`}>
                  {cat.enabled ? "Published" : "Hidden"}
                </button>
                <button onClick={() => setDialog({ open: true, category: cat })}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(cat.id)} disabled={deleting === cat.id}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40">
                  {deleting === cat.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {dialog.open && (
          <CategoryDialog
            category={dialog.category}
            allCategories={categories}
            onClose={() => setDialog({ open: false, category: null })}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
