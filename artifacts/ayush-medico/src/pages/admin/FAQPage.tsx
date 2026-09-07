import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Loader2, GripVertical, HelpCircle } from "lucide-react";
import { authFetchJson } from "@/lib/apiAuth";
import { useToast } from "@/hooks/use-toast";

type FAQ = { id: string; question: string; answer: string; order: number; enabled: boolean };

function FAQDialog({ faq, onClose, onSave }: { faq: FAQ | null; onClose: () => void; onSave: (data: Omit<FAQ, "id">) => Promise<void> }) {
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [enabled, setEnabled] = useState(faq?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      await onSave({ question: question.trim(), answer: answer.trim(), enabled, order: faq?.order ?? Date.now() });
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
          <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>{faq ? "Edit FAQ" : "Add FAQ"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Question *</label>
            <input
              value={question} onChange={(e) => setQuestion(e.target.value)} required
              placeholder="e.g. Do you provide genuine medicines?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Answer *</label>
            <textarea
              value={answer} onChange={(e) => setAnswer(e.target.value)} required rows={4}
              placeholder="Write a clear, helpful answer..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Published</p>
              <p className="text-xs text-muted-foreground">Show this FAQ on the website</p>
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
              {faq ? "Save Changes" : "Add FAQ"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; faq: FAQ | null }>({ open: false, faq: null });
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const rows = await authFetchJson<Array<FAQ & { id: number }>>("/api/faqs/all");
      setFaqs(rows.map((r) => ({ ...r, id: String(r.id) })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data: Omit<FAQ, "id">) => {
    try {
      if (dialog.faq) {
        await authFetchJson(`/api/faqs/${dialog.faq.id}`, { method: "PUT", body: JSON.stringify(data) });
        toast({ title: "FAQ updated" });
      } else {
        await authFetchJson("/api/faqs", { method: "POST", body: JSON.stringify(data) });
        toast({ title: "FAQ added" });
      }
      await load();
    } catch {
      toast({ variant: "destructive", title: "Failed to save" });
      throw new Error("save failed");
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await authFetchJson(`/api/faqs/${id}`, { method: "DELETE" });
      toast({ title: "FAQ removed" });
      setFaqs((p) => p.filter((f) => f.id !== id));
    } catch {
      toast({ variant: "destructive", title: "Failed to delete" });
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (faq: FAQ) => {
    await authFetchJson(`/api/faqs/${faq.id}`, { method: "PUT", body: JSON.stringify({ enabled: !faq.enabled }) });
    setFaqs((p) => p.map((f) => f.id === faq.id ? { ...f, enabled: !f.enabled } : f));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>FAQs</h1>
          <p className="text-muted-foreground text-sm mt-1">{faqs.length} frequently asked questions</p>
        </div>
        <button
          onClick={() => setDialog({ open: true, faq: null })}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-md shadow-primary/25 hover:bg-primary/90 transition-all flex-shrink-0"
        >
          <Plus size={16} /> Add FAQ
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : faqs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 bg-card border border-border rounded-2xl text-muted-foreground">
          <HelpCircle size={28} className="mb-2" />
          <p className="text-sm font-medium">No FAQs yet</p>
          <p className="text-xs mt-1">Add your first question above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div key={faq.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <GripVertical size={16} className="text-muted-foreground mt-1 flex-shrink-0 cursor-grab" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground mb-1">{faq.question}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{faq.answer}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(faq)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${faq.enabled ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}
                  >
                    {faq.enabled ? "Published" : "Hidden"}
                  </button>
                  <button onClick={() => setDialog({ open: true, faq })}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(faq.id)} disabled={deleting === faq.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40">
                    {deleting === faq.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {dialog.open && (
          <FAQDialog faq={dialog.faq} onClose={() => setDialog({ open: false, faq: null })} onSave={handleSave} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
