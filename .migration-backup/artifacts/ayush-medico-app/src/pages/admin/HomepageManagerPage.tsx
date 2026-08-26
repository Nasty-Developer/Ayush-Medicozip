import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, Sparkles, Award, LayoutDashboard, Eye, EyeOff } from "lucide-react";
import { authFetch } from "@/lib/apiAuth";
import { useToast } from "@/hooks/use-toast";

type HomepageSettings = {
  newArrivalsEnabled: boolean;
  newArrivalsTitle: string;
  newArrivalsDescription: string;
  specialMedicinesEnabled: boolean;
  specialMedicinesTitle: string;
  specialMedicinesDescription: string;
};

const DEFAULTS: HomepageSettings = {
  newArrivalsEnabled: true,
  newArrivalsTitle: "New Medicine Arrivals",
  newArrivalsDescription: "Fresh stock just landed — be the first to know about our latest medicines and health products.",
  specialMedicinesEnabled: true,
  specialMedicinesTitle: "Special Medicines – Only Available Here",
  specialMedicinesDescription: "Hard-to-find medicines and exclusive healthcare products stocked specially for you at Ayush Medico.",
};

export default function HomepageManagerPage() {
  const [settings, setSettings] = useState<HomepageSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/settings/homepage")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && typeof data === "object" && Object.keys(data).length > 0) {
          setSettings({ ...DEFAULTS, ...(data as Partial<HomepageSettings>) });
        }
      })
      .catch(() => {/* use defaults */})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch("/api/settings/homepage", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Homepage settings saved!", description: "Changes will appear on the website immediately." });
    } catch {
      toast({ variant: "destructive", title: "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const upd = (key: keyof HomepageSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setSettings((s) => ({ ...s, [key]: e.target.value }));

  const toggle = (key: keyof HomepageSettings) =>
    setSettings((s) => ({ ...s, [key]: !s[key] }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Homepage Manager</h1>
          <p className="text-muted-foreground text-sm mt-1">Control what appears on your homepage without touching any code</p>
        </div>
        <button
          onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-md shadow-primary/25 hover:bg-primary/90 disabled:opacity-60 transition-all flex-shrink-0"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save Changes
        </button>
      </div>

      <div className="space-y-5 max-w-2xl">
        {/* Overview card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <LayoutDashboard size={15} className="text-primary" />
            <p className="text-sm font-bold text-foreground">How it works</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Changes here take effect on the live website immediately. Enable/disable sections, update titles and descriptions.
            The medicines that appear in each section are managed in <strong>New Arrivals</strong> and <strong>Special Medicines</strong> pages.
          </p>
        </div>

        {/* New Arrivals Section */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><Sparkles size={14} /></div>
              <h3 className="text-sm font-bold text-foreground">New Medicine Arrivals Section</h3>
            </div>
            <button
              onClick={() => toggle("newArrivalsEnabled")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                settings.newArrivalsEnabled
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {settings.newArrivalsEnabled ? <Eye size={12} /> : <EyeOff size={12} />}
              {settings.newArrivalsEnabled ? "Visible" : "Hidden"}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Section Title</label>
              <input
                value={settings.newArrivalsTitle} onChange={upd("newArrivalsTitle")}
                placeholder="New Medicine Arrivals"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Section Description</label>
              <textarea
                value={settings.newArrivalsDescription} onChange={upd("newArrivalsDescription")}
                rows={2} placeholder="Description shown below the section title..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Special Medicines Section */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-secondary/10 text-secondary"><Award size={14} /></div>
              <h3 className="text-sm font-bold text-foreground">Special Medicines Section</h3>
            </div>
            <button
              onClick={() => toggle("specialMedicinesEnabled")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                settings.specialMedicinesEnabled
                  ? "bg-secondary/10 text-secondary hover:bg-secondary/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {settings.specialMedicinesEnabled ? <Eye size={12} /> : <EyeOff size={12} />}
              {settings.specialMedicinesEnabled ? "Visible" : "Hidden"}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Section Title</label>
              <input
                value={settings.specialMedicinesTitle} onChange={upd("specialMedicinesTitle")}
                placeholder="Special Medicines – Only Available Here"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Section Description</label>
              <textarea
                value={settings.specialMedicinesDescription} onChange={upd("specialMedicinesDescription")}
                rows={2} placeholder="Description shown below the section title..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Live Preview Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-4 rounded-2xl border text-center ${
            settings.newArrivalsEnabled ? "bg-primary/5 border-primary/15" : "bg-muted border-border"
          }`}>
            <Sparkles size={20} className={`mx-auto mb-1.5 ${settings.newArrivalsEnabled ? "text-primary" : "text-muted-foreground"}`} />
            <p className={`text-xs font-bold ${settings.newArrivalsEnabled ? "text-primary" : "text-muted-foreground"}`}>
              New Arrivals
            </p>
            <p className={`text-[10px] mt-0.5 ${settings.newArrivalsEnabled ? "text-primary/70" : "text-muted-foreground"}`}>
              {settings.newArrivalsEnabled ? "✓ Showing on homepage" : "Hidden"}
            </p>
          </div>
          <div className={`p-4 rounded-2xl border text-center ${
            settings.specialMedicinesEnabled ? "bg-secondary/5 border-secondary/15" : "bg-muted border-border"
          }`}>
            <Award size={20} className={`mx-auto mb-1.5 ${settings.specialMedicinesEnabled ? "text-secondary" : "text-muted-foreground"}`} />
            <p className={`text-xs font-bold ${settings.specialMedicinesEnabled ? "text-secondary" : "text-muted-foreground"}`}>
              Special Medicines
            </p>
            <p className={`text-[10px] mt-0.5 ${settings.specialMedicinesEnabled ? "text-secondary/70" : "text-muted-foreground"}`}>
              {settings.specialMedicinesEnabled ? "✓ Showing on homepage" : "Hidden"}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
