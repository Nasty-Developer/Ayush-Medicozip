import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, Phone, MapPin, Clock, MessageCircle, ShieldCheck, FileText } from "lucide-react";
import { authFetch } from "@/lib/apiAuth";
import { useToast } from "@/hooks/use-toast";

type StoreSettings = {
  storeName: string;
  phone: string;
  whatsapp: string;
  address: string;
  mapLink: string;
  hoursWeekday: string;
  hoursWeekend: string;
  email: string;
  tagline: string;
  drugLicenseNumber: string;
  gstNumber: string;
  shopEstablishmentReg: string;
  registeredPharmacist: string;
};

const DEFAULTS: StoreSettings = {
  storeName: "Ayush Medico & General Stores",
  phone: "+91 98332 73838",
  whatsapp: "919833273838",
  address: "Shop No.1, Hut No.67 1/1, Ground Floor, Gangaram Makad Wala Chawl, Halav Pool, Near Rolex Hotel, CTS No.451, Kurla West, Mumbai – 400070",
  mapLink: "https://maps.google.com/?q=Ayush+Medico+Kurla+West+Mumbai",
  hoursWeekday: "Monday – Sunday: 8:00 AM – 10:00 PM",
  hoursWeekend: "",
  email: "aqsakhan7654@gmail.com",
  tagline: "Your Trusted Health Partner in Kurla West",
  drugLicenseNumber: "",
  gstNumber: "",
  shopEstablishmentReg: "",
  registeredPharmacist: "Khan Aqsa Tasadduk Hussain (D.Pharm, Reg. No. 492012, Maharashtra State Pharmacy Council)",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/settings/store")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && typeof data === "object") {
          setSettings({ ...DEFAULTS, ...(data as Partial<StoreSettings>) });
        }
      })
      .catch(() => {/* use defaults on error */})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch("/api/settings/store", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Settings saved!", description: "Your store information has been updated." });
    } catch {
      toast({ variant: "destructive", title: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof StoreSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setSettings((s) => ({ ...s, [key]: e.target.value }));

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
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Store Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your store's contact, hours, and legal compliance information</p>
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
        <Section title="Store Identity" icon={MapPin}>
          <Field label="Store Name" value={settings.storeName} onChange={update("storeName")} placeholder="Ayush Medico" />
          <Field label="Tagline" value={settings.tagline} onChange={update("tagline")} placeholder="Your Trusted Health Partner" />
        </Section>

        <Section title="Contact Information" icon={Phone}>
          <Field label="Phone Number" value={settings.phone} onChange={update("phone")} placeholder="+91 98332 73838" />
          <Field label="WhatsApp (digits only, with country code)" value={settings.whatsapp} onChange={update("whatsapp")} placeholder="919833273838" />
          <Field label="Email Address" value={settings.email} onChange={update("email")} placeholder="aqsakhan7654@gmail.com" type="email" />
        </Section>

        <Section title="Location" icon={MapPin}>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Business Address</label>
            <textarea
              value={settings.address} onChange={update("address")}
              rows={2} placeholder="Full store address..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
            />
          </div>
          <Field label="Google Maps Link" value={settings.mapLink} onChange={update("mapLink")} placeholder="https://maps.google.com/..." />
        </Section>

        <Section title="Working Hours" icon={Clock}>
          <Field label="Weekday Hours" value={settings.hoursWeekday} onChange={update("hoursWeekday")} placeholder="Mon – Sun: 8:00 AM – 10:00 PM" />
          <Field label="Weekend / Additional Hours (optional)" value={settings.hoursWeekend} onChange={update("hoursWeekend")} placeholder="Sunday: 9:00 AM – 9:00 PM" />
          <p className="text-xs text-muted-foreground">Tip: Use format like "Monday – Saturday: 8:00 AM – 10:00 PM" — the Contact section uses these to show Open/Closed status.</p>
        </Section>

        {/* ── Legal & Compliance ─────────────────────────────────────────────── */}
        <Section title="Legal & Compliance" icon={ShieldCheck}>
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 mb-2">
            <p className="text-xs text-primary font-medium">
              These details appear in the public Trust &amp; Compliance section and footer. Never enter PAN, Aadhaar, bank account numbers, or other sensitive financial details here.
            </p>
          </div>
          <Field
            label="Drug License Number"
            value={settings.drugLicenseNumber}
            onChange={update("drugLicenseNumber")}
            placeholder="e.g. MH-MU-123456"
          />
          <Field
            label="GST Number (GSTIN)"
            value={settings.gstNumber}
            onChange={update("gstNumber")}
            placeholder="e.g. 27AAAAA0000A1Z5"
          />
          <Field
            label="Shop & Establishment Registration Number"
            value={settings.shopEstablishmentReg}
            onChange={update("shopEstablishmentReg")}
            placeholder="e.g. MH/MUM/12345"
          />
          <Field
            label="Registered Pharmacist Name"
            value={settings.registeredPharmacist}
            onChange={update("registeredPharmacist")}
            placeholder="e.g. Mr. Ramesh Sharma (Reg. No. PH-12345)"
          />
        </Section>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
          <p className="text-xs font-semibold text-foreground mb-2">Preview — Contact Card</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone size={11} className="text-primary" />{settings.phone}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><MessageCircle size={11} className="text-[#25D366]" />wa.me/{settings.whatsapp}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin size={11} className="text-secondary" />{settings.address}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock size={11} className="text-accent" />{settings.hoursWeekday}</div>
          </div>
          {(settings.drugLicenseNumber || settings.gstNumber) && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><FileText size={9} />Legal</p>
              {settings.drugLicenseNumber && <p className="text-[11px] text-muted-foreground">DL: {settings.drugLicenseNumber}</p>}
              {settings.gstNumber && <p className="text-[11px] text-muted-foreground">GST: {settings.gstNumber}</p>}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
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

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
      />
    </div>
  );
}
