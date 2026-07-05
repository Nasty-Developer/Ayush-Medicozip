import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { getDocById, setDocument } from "@/lib/firestoreHelpers";
import { useToast } from "@/hooks/use-toast";
import { announcementConfig } from "@/config/announcement";

type AnnouncementData = {
  enabled: boolean;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  icon: string;
  colorScheme: string;
};

const ICONS = ["megaphone", "heart-pulse", "syringe", "activity", "calendar-check", "sparkles"];
const COLORS = ["primary", "secondary", "accent", "amber"];

export default function AnnouncementPage() {
  const [data, setData] = useState<AnnouncementData>({
    enabled: announcementConfig.enabled,
    title: announcementConfig.title,
    description: announcementConfig.description,
    buttonText: announcementConfig.buttonText,
    buttonLink: announcementConfig.buttonLink,
    icon: announcementConfig.icon,
    colorScheme: announcementConfig.colorScheme,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getDocById("settings", "announcement").then((doc) => {
      if (doc) setData(doc as unknown as AnnouncementData);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDocument("settings", "announcement", data);
      toast({ title: "Announcement updated!", description: "Changes will appear on the website immediately." });
    } catch {
      toast({ variant: "destructive", title: "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Announcement Banner</h1>
          <p className="text-muted-foreground text-sm mt-1">Control the top banner shown on your website</p>
        </div>
        <button
          onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-md shadow-primary/25 hover:bg-primary/90 disabled:opacity-60 transition-all flex-shrink-0"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save Changes
        </button>
      </div>

      <div className="grid gap-4 max-w-2xl">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Banner Status</p>
              <p className="text-xs text-muted-foreground">Show or hide the announcement banner</p>
            </div>
            <button
              onClick={() => setData((d) => ({ ...d, enabled: !d.enabled }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                data.enabled
                  ? "bg-secondary/10 text-secondary hover:bg-secondary/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {data.enabled ? <Eye size={15} /> : <EyeOff size={15} />}
              {data.enabled ? "Enabled" : "Disabled"}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Banner Title</label>
              <input
                value={data.title}
                onChange={(e) => setData((d) => ({ ...d, title: e.target.value }))}
                placeholder="e.g. Free Blood Pressure Checkup Camp"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
              <textarea
                value={data.description}
                onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))}
                rows={3}
                placeholder="Short description of the announcement..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Button Text</label>
                <input
                  value={data.buttonText}
                  onChange={(e) => setData((d) => ({ ...d, buttonText: e.target.value }))}
                  placeholder="e.g. Call to Know More"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Button Link</label>
                <input
                  value={data.buttonLink}
                  onChange={(e) => setData((d) => ({ ...d, buttonLink: e.target.value }))}
                  placeholder="e.g. tel:+919833273838"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Icon</label>
                <select
                  value={data.icon}
                  onChange={(e) => setData((d) => ({ ...d, icon: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                >
                  {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Color Scheme</label>
                <select
                  value={data.colorScheme}
                  onChange={(e) => setData((d) => ({ ...d, colorScheme: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                >
                  {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl border text-sm ${
          data.enabled ? "bg-secondary/5 border-secondary/20 text-secondary" : "bg-muted border-border text-muted-foreground"
        }`}>
          <div className="flex items-center gap-2 font-semibold mb-1">
            <Megaphone size={14} />
            Preview: {data.enabled ? "Banner is ON" : "Banner is OFF"}
          </div>
          {data.enabled && <p className="text-xs opacity-80">{data.title} — {data.description}</p>}
        </div>
      </div>
    </motion.div>
  );
}
