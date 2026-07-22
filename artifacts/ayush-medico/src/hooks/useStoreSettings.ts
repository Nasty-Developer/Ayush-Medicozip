import { useEffect, useState } from "react";

/**
 * Public, read-only view of the "store" settings document (GET /api/settings/store
 * requires no auth). Used by public-facing sections that need to display
 * admin-editable business/legal info (e.g. Trust & Compliance, Footer).
 *
 * Mirrors the shape maintained by src/pages/admin/SettingsPage.tsx — keep the
 * two in sync if new editable fields are added there.
 */
export type StoreSettings = {
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

export const STORE_SETTINGS_DEFAULTS: StoreSettings = {
  storeName: "Ayush Medico & General Stores",
  phone: "+91 98332 73838",
  whatsapp: "919833273838",
  address: "Shop No.1, Hut No.67 1/1, Ground Floor, Gangaram Makad Wala Chawl, Halav Pool, Near Rolex Hotel, CTS No.451, Kurla West, Mumbai – 400070",
  mapLink: "https://maps.google.com/?q=Ayush+Medico+Kurla+West+Mumbai",
  hoursWeekday: "Monday – Sunday: 8:00 AM – 10:00 PM",
  hoursWeekend: "",
  email: "aqsakhan7654@gmail.com",
  tagline: "Your Trusted Health Partner in Kurla West",
  drugLicenseNumber: "Form 20: MH-MZ4-518856 · Form 21: MH-MZ4-518857 (Valid to 02/05/2028 · FDA Mumbai-Zone4)",
  gstNumber: "",
  shopEstablishmentReg: "",
  registeredPharmacist: "Khan Aqsa Tasadduk Hussain (D.Pharm, Reg. No. 492012, Maharashtra State Pharmacy Council)",
};

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(STORE_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/store")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data === "object") {
          setSettings({ ...STORE_SETTINGS_DEFAULTS, ...(data as Partial<StoreSettings>) });
        }
      })
      .catch(() => {
        /* use defaults on error */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { settings, loading };
}
