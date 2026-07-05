import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Loader2, Star } from "lucide-react";
import { getCollection, addDocument, updateDocument, deleteDocument, orderBy } from "@/lib/firestoreHelpers";
import { useToast } from "@/hooks/use-toast";

type Testimonial = {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
  enabled: boolean;
  order: number;
};

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" onClick={() => onChange(s)}
          className={`transition-colors ${s <= value ? "text-yellow-400" : "text-muted-foreground/30 hover:text-yellow-300"}`}>
          <Star size={20} fill={s <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

function TestimonialDialog({ testimonial, onClose, onSave }: { testimonial: Testimonial | null; onClose: () => void; onSave: (data: Omit<Testimonial, "id">) => Promise<void> }) {
  const [name, setName] = useState(testimonial?.name ?? "");
  const [role, setRole] = useState(testimonial?.role ?? "");
  const [content, setContent] = useState(testimonial?.content ?? "");
  const [rating, setRating] = useState(testimonial?.rating ?? 5);
  const [enabled, setEnabled] = useState(testimonial?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), role: role.trim(), content: content.trim(), rating, enabled, order: testimonial?.order ?? Date.now() });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {testimonial ? "Edit Testimonial" : "Add Testimonial"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Customer Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Priya Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Role / Location</label>
              <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Regular Customer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Review *</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={4} placeholder="Customer review..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Rating</label>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Published</p>
              <p className="text-xs text-muted-foreground">Show on website</p>
            </div>
            <button type="button" onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-secondary" : "bg-muted-foreground/30"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-70 transition-all">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {testimonial ? "Save Changes" : "Add Review"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; testimonial: Testimonial | null }>({ open: false, testimonial: null });
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const docs = await getCollection("testimonials", [orderBy("order")], "testimonials");
      setTestimonials(docs as Testimonial[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data: Omit<Testimonial, "id">) => {
    try {
      if (dialog.testimonial) {
        await updateDocument("testimonials", dialog.testimonial.id, data, "testimonials");
        toast({ title: "Testimonial updated" });
      } else {
        await addDocument("testimonials", data, "testimonials");
        toast({ title: "Testimonial added" });
      }
      await load();
    } catch {
      toast({ variant: "destructive", title: "Failed to save" });
      throw new Error("failed");
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteDocument("testimonials", id, "testimonials");
      toast({ title: "Testimonial removed" });
      setTestimonials((p) => p.filter((t) => t.id !== id));
    } catch {
      toast({ variant: "destructive", title: "Failed to delete" });
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (t: Testimonial) => {
    await updateDocument("testimonials", t.id, { enabled: !t.enabled }, "testimonials");
    setTestimonials((p) => p.map((item) => item.id === t.id ? { ...item, enabled: !item.enabled } : item));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Testimonials</h1>
          <p className="text-muted-foreground text-sm mt-1">{testimonials.length} customer reviews</p>
        </div>
        <button
          onClick={() => setDialog({ open: true, testimonial: null })}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-md shadow-primary/25 hover:bg-primary/90 transition-all flex-shrink-0"
        >
          <Plus size={16} /> Add Review
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : testimonials.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 bg-card border border-border rounded-2xl text-muted-foreground">
          <Star size={28} className="mb-2" />
          <p className="text-sm font-medium">No testimonials yet</p>
          <p className="text-xs mt-1">Add your first customer review above</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {testimonials.map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {t.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleToggle(t)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${t.enabled ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
                    {t.enabled ? "Published" : "Hidden"}
                  </button>
                  <button onClick={() => setDialog({ open: true, testimonial: t })}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40">
                    {deleting === t.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-0.5 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={12} className={s <= t.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20"} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3">{t.content}</p>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {dialog.open && (
          <TestimonialDialog testimonial={dialog.testimonial} onClose={() => setDialog({ open: false, testimonial: null })} onSave={handleSave} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
