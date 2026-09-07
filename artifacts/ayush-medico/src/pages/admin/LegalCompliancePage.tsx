/**
 * Admin – Legal & Compliance
 *
 * Tab 1: Business Info — all individual store/legal fields that
 *         auto-populate legal pages via {{template}} variables.
 *
 * Tabs 2-8: Per-page section editors for each legal page.
 *           Each section has an editable heading + body textarea.
 *           Body supports:
 *             - Paragraph break: blank line between paragraphs
 *             - Bullet list:     lines starting with "- "
 *             - Bold:            **text**
 *             - Template vars:   {{storeName}}, {{phone}}, {{pharmacistName}}, etc.
 */

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Save, Loader2, Plus, Trash2, ChevronUp, ChevronDown,
  Building2, ShieldCheck, FileText, Truck, RefreshCw,
  FileCheck, AlertTriangle, Info, HelpCircle, ChevronRight,
  ExternalLink, Phone, FlaskConical, Hash, Clock,
} from "lucide-react";
import { authFetch } from "@/lib/apiAuth";
import { useToast } from "@/hooks/use-toast";
import {
  getDefault, interpolate,
  type LegalPageKey, type PageSection, type LegalContent,
} from "@/hooks/useLegalContent";
import { STORE_SETTINGS_DEFAULTS, type StoreSettings } from "@/hooks/useStoreSettings";

/* ─────────────────────────────────────────────────────────────────────────────
   Tabs
──────────────────────────────────────────────────────────────────────────── */

type TabId = "business" | LegalPageKey;

type TabDef = {
  id:      TabId;
  label:   string;
  short:   string;
  icon:    React.ElementType;
  pageKey?: LegalPageKey;
};

const TABS: TabDef[] = [
  { id: "business",     label: "Business Info",       short: "Business",    icon: Building2 },
  { id: "privacy",      label: "Privacy Policy",       short: "Privacy",     icon: ShieldCheck,   pageKey: "privacy"      },
  { id: "terms",        label: "Terms & Conditions",   short: "Terms",       icon: FileText,      pageKey: "terms"        },
  { id: "shipping",     label: "Shipping Policy",      short: "Shipping",    icon: Truck,         pageKey: "shipping"     },
  { id: "refund",       label: "Refund Policy",        short: "Refund",      icon: RefreshCw,     pageKey: "refund"       },
  { id: "prescription", label: "Prescription Policy",  short: "Rx Policy",   icon: FileCheck,     pageKey: "prescription" },
  { id: "disclaimer",   label: "Disclaimer",           short: "Disclaimer",  icon: AlertTriangle, pageKey: "disclaimer"   },
  { id: "about",        label: "About Us",             short: "About",       icon: Info,          pageKey: "about"        },
];

const TEMPLATE_VARS = [
  "{{storeName}}","{{proprietorName}}","{{phone}}","{{phone2}}","{{email}}",
  "{{address}}","{{deliveryRadius}}","{{hoursWeekday}}","{{hoursWeekend}}",
  "{{pharmacistName}}","{{pharmacistRegNumber}}","{{pharmacistQualification}}",
  "{{pharmacistCouncil}}","{{pharmacistValidUpto}}",
  "{{drugLicenseForm20}}","{{drugLicenseForm21}}","{{licenceValidity}}",
  "{{fdaFileNumber}}","{{licensingAuthority}}",
];

/* ─────────────────────────────────────────────────────────────────────────────
   Shared UI helpers
──────────────────────────────────────────────────────────────────────────── */

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><Icon size={14} /></div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      {hint && <p className="text-xs text-muted-foreground mb-1.5">{hint}</p>}
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
      />
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder, rows = 3, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      {hint && <p className="text-xs text-muted-foreground mb-1.5">{hint}</p>}
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)}
        rows={rows} placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-y"
      />
    </div>
  );
}

function SaveBar({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end pt-2">
      <button
        onClick={onSave} disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-md shadow-primary/25 hover:bg-primary/90 disabled:opacity-60 transition-all"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        Save Changes
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Business Info tab
──────────────────────────────────────────────────────────────────────────── */

function BusinessInfoTab() {
  const [s, setS] = useState<StoreSettings>(STORE_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/settings/store")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && typeof data === "object") {
          setS({ ...STORE_SETTINGS_DEFAULTS, ...(data as Partial<StoreSettings>) });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof StoreSettings) => (v: string) =>
    setS(prev => ({ ...prev, [key]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch("/api/settings/store", {
        method: "PUT",
        body: JSON.stringify(s),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Business info saved!", description: "All legal pages will now reflect the updated details." });
    } catch {
      toast({ variant: "destructive", title: "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Info banner */}
      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15">
        <p className="text-xs text-primary font-medium">
          Changes here automatically update all legal pages, footer, contact section, about page, and trust badges — no code editing needed.
          Use <code className="bg-primary/10 px-1 rounded">{"{{phone}}"}</code>, <code className="bg-primary/10 px-1 rounded">{"{{storeName}}"}</code>, etc. in legal page text to reference these values.
        </p>
      </div>

      <SectionCard title="Store Identity" icon={Building2}>
        <Field label="Store Name" value={s.storeName} onChange={set("storeName")} placeholder="Ayush Medico & General Stores" />
        <Field label="Tagline" value={s.tagline} onChange={set("tagline")} placeholder="Your Trusted Health Partner" />
        <Field label="Proprietor / Owner Name" value={s.proprietorName} onChange={set("proprietorName")} placeholder="Govind Ram Chitara" />
      </SectionCard>

      <SectionCard title="Contact Details" icon={Phone}>
        <Field label="Primary Phone" value={s.phone} onChange={set("phone")} placeholder="+91 98332 73838" />
        <Field label="Secondary Phone" value={s.phone2} onChange={set("phone2")} placeholder="+91 97021 65965" />
        <Field label="WhatsApp Number (digits only, with country code)" value={s.whatsapp} onChange={set("whatsapp")} placeholder="919833273838" />
        <Field label="Email Address" value={s.email} onChange={set("email")} type="email" placeholder="aqsakhan7654@gmail.com" />
      </SectionCard>

      <SectionCard title="Location & Delivery" icon={Building2}>
        <TextareaField label="Business Address" value={s.address} onChange={set("address")} rows={2} placeholder="Full business address..." />
        <Field label="Google Maps Link" value={s.mapLink} onChange={set("mapLink")} placeholder="https://maps.google.com/..." />
        <Field label="Delivery Radius / Coverage Area" value={s.deliveryRadius} onChange={set("deliveryRadius")} placeholder="Kurla West and surrounding areas, Mumbai" />
      </SectionCard>

      <SectionCard title="Business Hours" icon={Clock}>
        <Field label="Weekday Hours" value={s.hoursWeekday} onChange={set("hoursWeekday")} placeholder="Monday – Sunday: 8:00 AM – 10:00 PM" />
        <Field label="Weekend Hours (leave blank if same as weekday)" value={s.hoursWeekend} onChange={set("hoursWeekend")} placeholder="Sunday: 9:00 AM – 9:00 PM" />
      </SectionCard>

      <SectionCard title="Registered Pharmacist" icon={FlaskConical}>
        <Field label="Pharmacist Full Name" value={s.pharmacistName} onChange={set("pharmacistName")} placeholder="Khan Aqsa Tasadduk Hussain" />
        <Field label="Qualification" value={s.pharmacistQualification} onChange={set("pharmacistQualification")} placeholder="D.Pharm" />
        <Field label="Registration Number" value={s.pharmacistRegNumber} onChange={set("pharmacistRegNumber")} placeholder="492012" />
        <Field label="Pharmacy Council" value={s.pharmacistCouncil} onChange={set("pharmacistCouncil")} placeholder="Maharashtra State Pharmacy Council" />
        <Field label="Registration Valid Upto" value={s.pharmacistValidUpto} onChange={set("pharmacistValidUpto")} placeholder="31/12/2057" />
      </SectionCard>

      <SectionCard title="Drug Licences" icon={Hash}>
        <Field label="Form 20 Licence Number" value={s.drugLicenseForm20} onChange={set("drugLicenseForm20")} placeholder="MH-MZ4-518856" />
        <Field label="Form 21 Licence Number" value={s.drugLicenseForm21} onChange={set("drugLicenseForm21")} placeholder="MH-MZ4-518857" />
        <Field label="Licence Validity Date" value={s.licenceValidity} onChange={set("licenceValidity")} placeholder="02/05/2028" />
        <Field label="FDA File Number" value={s.fdaFileNumber} onChange={set("fdaFileNumber")} placeholder="244432" />
        <Field label="Licensing Authority" value={s.licensingAuthority} onChange={set("licensingAuthority")} placeholder="Ashok Tukaram Rathod, Asst. Commissioner, FDA Mumbai-Zone4" />
      </SectionCard>

      <SectionCard title="Additional Licences (optional)" icon={ShieldCheck}>
        <Field
          label="GST Number (GSTIN)"
          value={s.gstNumber}
          onChange={set("gstNumber")}
          placeholder="Leave blank to hide from website"
          hint="This field is hidden from all public pages until you enter a value."
        />
        <Field
          label="Shop & Establishment Registration"
          value={s.shopEstablishmentReg}
          onChange={set("shopEstablishmentReg")}
          placeholder="Leave blank to hide from website"
          hint="This field is hidden from all public pages until you enter a value."
        />
      </SectionCard>

      <SectionCard title="Footer" icon={FileText}>
        <Field
          label="Footer Copyright Line"
          value={s.footerCopyright}
          onChange={set("footerCopyright")}
          placeholder="© 2026 Ayush Medico & General Stores. All rights reserved."
          hint="This appears at the very bottom of every page."
        />
      </SectionCard>

      <SaveBar saving={saving} onSave={handleSave} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Legal page section editor
──────────────────────────────────────────────────────────────────────────── */

function LegalPageTab({ pageKey, title }: { pageKey: LegalPageKey; title: string }) {
  const [sections, setSections] = useState<PageSection[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [showVars, setShowVars] = useState(false);
  const [preview,  setPreview]  = useState<StoreSettings>(STORE_SETTINGS_DEFAULTS);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    // Load legal page content
    fetch(`/api/settings/legal_${pageKey}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: LegalContent | null) => {
        if (cancelled) return;
        if (data && Array.isArray(data.sections) && data.sections.length > 0) {
          setSections(data.sections);
        } else {
          setSections(getDefault(pageKey).sections);
        }
      })
      .catch(() => { if (!cancelled) setSections(getDefault(pageKey).sections); })
      .finally(() => { if (!cancelled) setLoading(false); });
    // Also load store settings for preview interpolation
    fetch("/api/settings/store")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !cancelled) setPreview({ ...STORE_SETTINGS_DEFAULTS, ...(data as Partial<StoreSettings>) }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pageKey]);

  const updateSection = useCallback((idx: number, field: keyof PageSection, value: string) =>
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s)),
  []);

  const addSection = () =>
    setSections(prev => [...prev, { heading: "New Section", body: "" }]);

  const removeSection = (idx: number) =>
    setSections(prev => prev.filter((_, i) => i !== idx));

  const moveSection = (idx: number, dir: "up" | "down") =>
    setSections(prev => {
      const next = [...prev];
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap]!, next[idx]!];
      return next;
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: LegalContent = { sections };
      const res = await authFetch(`/api/settings/legal_${pageKey}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast({ title: `${title} saved!`, description: "Changes are live on the website." });
    } catch {
      toast({ variant: "destructive", title: "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm(`Reset "${title}" to the original pre-filled content? Your changes will be lost.`)) return;
    setSections(getDefault(pageKey).sections);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each section appears as a heading + body block on the public page. Use template variables to auto-fill business details.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/${pageKey === "terms" ? "terms-conditions" : pageKey === "refund" ? "refund-policy" : pageKey === "shipping" ? "shipping-policy" : pageKey === "prescription" ? "prescription-policy" : pageKey}-policy`.replace(/-policy-policy/, "-policy")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink size={12} /> Preview
          </a>
          <button
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Reset to default
          </button>
        </div>
      </div>

      {/* Template variables reference */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setShowVars(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <HelpCircle size={14} className="text-primary" />
            Template Variables — auto-fill business info
          </div>
          <ChevronRight size={14} className={`text-muted-foreground transition-transform ${showVars ? "rotate-90" : ""}`} />
        </button>
        {showVars && (
          <div className="px-4 pb-4 pt-3">
            <p className="text-xs text-muted-foreground mb-3">
              Copy and paste these into any section body. They are automatically replaced with values from the Business Info tab.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARS.map(v => (
                <button
                  key={v}
                  onClick={() => navigator.clipboard.writeText(v).catch(() => {})}
                  className="font-mono text-[11px] px-2 py-0.5 rounded bg-primary/8 border border-primary/20 text-primary hover:bg-primary/15 transition-colors"
                  title="Click to copy"
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Click any variable to copy it to clipboard.</p>
          </div>
        )}
      </div>

      {/* Section cards */}
      {sections.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No sections yet. Click "+ Add Section" below to start.
        </div>
      )}
      {sections.map((section, idx) => (
        <div key={idx} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <input
                value={section.heading}
                onChange={e => updateSection(idx, "heading", e.target.value)}
                placeholder="Section heading…"
                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => moveSection(idx, "up")}
                disabled={idx === 0}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                title="Move up"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => moveSection(idx, "down")}
                disabled={idx === sections.length - 1}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                title="Move down"
              >
                <ChevronDown size={14} />
              </button>
              <button
                onClick={() => removeSection(idx)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Delete section"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <textarea
            value={section.body}
            onChange={e => updateSection(idx, "body", e.target.value)}
            rows={5}
            placeholder={"Section content…\n\nTip: Start lines with '- ' for bullet lists, use **text** for bold, and {{phone}} for business details."}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-y font-mono text-[13px] leading-relaxed"
          />

          {/* Mini live preview of first 120 chars after interpolation */}
          {section.body.includes("{{") && (
            <p className="mt-1.5 text-[11px] text-muted-foreground truncate">
              Preview: {interpolate(section.body, preview).slice(0, 120)}…
            </p>
          )}
        </div>
      ))}

      {/* Add section */}
      <button
        onClick={addSection}
        className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 px-4 py-2.5 rounded-xl border border-dashed border-primary/40 hover:border-primary/70 hover:bg-primary/5 transition-all w-full justify-center"
      >
        <Plus size={15} /> Add Section
      </button>

      <SaveBar saving={saving} onSave={handleSave} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Root page component
──────────────────────────────────────────────────────────────────────────── */

export default function LegalCompliancePage() {
  const [activeTab, setActiveTab] = useState<TabId>("business");

  const activeTabDef = TABS.find(t => t.id === activeTab)!;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Legal & Compliance
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Edit business details and all legal page content — changes go live instantly across the entire website.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex overflow-x-auto gap-1 pb-1 mb-6 scrollbar-thin">
        {TABS.map(tab => {
          const Icon  = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{tab.short}</span>
              <span className="sm:hidden">{tab.short}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "business" && <BusinessInfoTab />}
      {activeTabDef.pageKey && (
        <LegalPageTab
          key={activeTab}
          pageKey={activeTabDef.pageKey}
          title={activeTabDef.label}
        />
      )}

    </motion.div>
  );
}
