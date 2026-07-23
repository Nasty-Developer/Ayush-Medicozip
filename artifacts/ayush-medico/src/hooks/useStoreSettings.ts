import { useEffect, useState } from "react";

/**
 * Public, read-only view of the "store" settings document.
 * Extended to include all individual business/legal fields required by legal pages.
 */
export type StoreSettings = {
  // ── Basic identity ────────────────────────────────────────────────────────
  storeName:              string;
  tagline:               string;
  proprietorName:        string;
  // ── Contact ───────────────────────────────────────────────────────────────
  phone:                 string;
  phone2:                string;
  whatsapp:              string;
  email:                 string;
  // ── Location ──────────────────────────────────────────────────────────────
  address:               string;
  mapLink:               string;
  deliveryRadius:        string;
  // ── Hours ─────────────────────────────────────────────────────────────────
  hoursWeekday:          string;
  hoursWeekend:          string;
  // ── Pharmacist (individual fields) ────────────────────────────────────────
  pharmacistName:        string;
  pharmacistRegNumber:   string;
  pharmacistQualification: string;
  pharmacistCouncil:     string;
  pharmacistValidUpto:   string;
  // ── Drug licences (individual fields) ─────────────────────────────────────
  drugLicenseForm20:     string;
  drugLicenseForm21:     string;
  licenceValidity:       string;
  fdaFileNumber:         string;
  licensingAuthority:    string;
  // ── Footer ────────────────────────────────────────────────────────────────
  footerCopyright:       string;
  // ── Legacy combined fields (keep for backward compat) ─────────────────────
  drugLicenseNumber:     string;
  gstNumber:             string;
  shopEstablishmentReg:  string;
  registeredPharmacist:  string;
};

export const STORE_SETTINGS_DEFAULTS: StoreSettings = {
  storeName:              "Ayush Medico & General Stores",
  tagline:               "Your Trusted Health Partner in Kurla West",
  proprietorName:        "Govind Ram Chitara",
  phone:                 "+91 98332 73838",
  phone2:                "+91 97021 65965",
  whatsapp:              "919833273838",
  email:                 "aqsakhan7654@gmail.com",
  address:               "Shop No.1, Hut No.67 1/1, Ground Floor, Gangaram Makad Wala Chawl, Halav Pool, Near Rolex Hotel, CTS No.451, Kurla West, Mumbai – 400070",
  mapLink:               "https://maps.google.com/?q=Ayush+Medico+Gangaram+Makad+Wala+Chawl+Halav+Pool+Kurla+West+Mumbai",
  deliveryRadius:        "Kurla West and surrounding areas, Mumbai",
  hoursWeekday:          "Monday – Sunday: 8:00 AM – 10:00 PM",
  hoursWeekend:          "",
  // Pharmacist
  pharmacistName:        "Khan Aqsa Tasadduk Hussain",
  pharmacistRegNumber:   "492012",
  pharmacistQualification: "D.Pharm",
  pharmacistCouncil:     "Maharashtra State Pharmacy Council",
  pharmacistValidUpto:   "31/12/2057",
  // Drug licences
  drugLicenseForm20:     "MH-MZ4-518856",
  drugLicenseForm21:     "MH-MZ4-518857",
  licenceValidity:       "02/05/2028",
  fdaFileNumber:         "244432",
  licensingAuthority:    "Ashok Tukaram Rathod, Assistant Commissioner, Food & Drugs Administration, Mumbai-Zone4",
  // Footer
  footerCopyright:       "© 2026 Ayush Medico & General Stores. All rights reserved. | Proprietor: Govind Ram Chitara",
  // Legacy combined (derived / backward compat)
  drugLicenseNumber:     "Form 20: MH-MZ4-518856 · Form 21: MH-MZ4-518857 (Valid to 02/05/2028 · FDA Mumbai-Zone4)",
  gstNumber:             "",
  shopEstablishmentReg:  "",
  registeredPharmacist:  "Khan Aqsa Tasadduk Hussain (D.Pharm, Reg. No. 492012, Maharashtra State Pharmacy Council)",
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
      .catch(() => { /* use defaults on error */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { settings, loading };
}
