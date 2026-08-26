// AddressForm — Add or edit a customer delivery address.
// Used inside the Checkout page and the My Addresses section.

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Briefcase, MapPin, X, Loader2, Check } from "lucide-react";
import { addAddress, updateAddress, type CustomerAddress, type CreateAddressInput, type AddressType } from "@/lib/addressService";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

// ─── Delivery-eligible pincodes (matches RequestMedicine.tsx allowlist) ───────
const ALLOWED_PINCODES = ["400070", "400071", "400072", "400074", "400075", "400076", "400078", "400079"];

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  /** If provided, the form is in edit mode. */
  existing?: CustomerAddress;
  onSuccess: (addressId: string) => void;
  onCancel: () => void;
};

const ADDRESS_TYPES: { type: AddressType; label: string; icon: typeof Home }[] = [
  { type: "home",  label: "Home",   icon: Home },
  { type: "work",  label: "Work",   icon: Briefcase },
  { type: "other", label: "Other",  icon: MapPin },
];

const EMPTY_FORM: Omit<CreateAddressInput, "isDefault"> = {
  fullName: "",
  mobileNumber: "",
  alternateNumber: "",
  houseNumber: "",
  buildingName: "",
  street: "",
  area: "",
  landmark: "",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "",
  addressType: "home",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddressForm({ existing, onSuccess, onCancel }: Props) {
  const { user } = useCustomerAuth();
  const [form, setForm] = useState<Omit<CreateAddressInput, "isDefault">>(() =>
    existing
      ? {
          fullName: existing.fullName,
          mobileNumber: existing.mobileNumber,
          alternateNumber: existing.alternateNumber ?? "",
          houseNumber: existing.houseNumber,
          buildingName: existing.buildingName ?? "",
          street: existing.street,
          area: existing.area ?? "",
          landmark: existing.landmark ?? "",
          city: existing.city,
          state: existing.state,
          pincode: existing.pincode,
          addressType: existing.addressType,
        }
      : EMPTY_FORM
  );
  const [isDefault, setIsDefault] = useState(existing?.isDefault ?? false);
  const [pincodeError, setPincodeError] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  const set = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    if (field === "pincode") setPincodeError("");
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof typeof form, string>> = {};
    if (!form.fullName.trim()) e.fullName = "Name is required";
    if (!/^[6-9]\d{9}$/.test(form.mobileNumber)) e.mobileNumber = "Enter a valid 10-digit mobile number";
    if (!form.houseNumber.trim()) e.houseNumber = "House / flat number is required";
    if (!form.street.trim()) e.street = "Street / locality is required";
    if (!form.pincode.trim()) e.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(form.pincode)) e.pincode = "Enter a valid 6-digit pincode";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!validate()) return;

    if (!ALLOWED_PINCODES.includes(form.pincode)) {
      setPincodeError(
        "Sorry, we don't deliver to this pincode yet. We serve select areas in Kurla West."
      );
      return;
    }

    setSaving(true);
    try {
      const input: CreateAddressInput = { ...form, isDefault };
      if (existing) {
        await updateAddress(user.uid, existing.id, input);
        onSuccess(existing.id);
      } else {
        const id = await addAddress(user.uid, input);
        onSuccess(id);
      }
    } catch (err) {
      console.error("AddressForm error:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Field helper ──
  const field = (
    id: keyof typeof form,
    label: string,
    placeholder: string,
    opts?: { type?: string; required?: boolean; half?: boolean }
  ) => (
    <div className={opts?.half ? "col-span-1" : "col-span-2"}>
      <label htmlFor={id} className="block text-xs font-medium text-muted-foreground mb-1">
        {label} {opts?.required !== false && <span className="text-destructive">*</span>}
      </label>
      <input
        id={id}
        type={opts?.type ?? "text"}
        value={form[id] as string}
        onChange={(e) => set(id, e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-background text-foreground
                    placeholder:text-muted-foreground/50 outline-none transition-all
                    focus:ring-2 focus:ring-primary/20 focus:border-primary
                    ${errors[id] ? "border-destructive" : "border-border"}`}
      />
      {errors[id] && <p className="text-xs text-destructive mt-1">{errors[id]}</p>}
    </div>
  );

  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {/* Address type selector */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Address Type</p>
        <div className="flex gap-2">
          {ADDRESS_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => set("addressType", type)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium
                          transition-all ${
                form.addressType === type
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-2 gap-3">
        {field("fullName",      "Full Name",         "e.g. Rahul Sharma", { required: true })}
        {field("mobileNumber",  "Mobile Number",     "10-digit number",   { type: "tel", required: true, half: true })}
        {field("alternateNumber", "Alternate Number (optional)", "10-digit", { type: "tel", required: false, half: true })}
        {field("houseNumber",   "House / Flat No.",  "e.g. 4B",           { required: true, half: true })}
        {field("buildingName",  "Building / Society","e.g. Sunrise Apts",  { required: false, half: true })}
        {field("street",        "Street / Locality", "e.g. LBS Marg",     { required: true })}
        {field("area",          "Area / Colony",     "e.g. Kurla West",   { required: false, half: true })}
        {field("landmark",      "Landmark (optional)","e.g. Near SBI ATM",{ required: false, half: true })}
        {field("city",          "City",              "Mumbai",            { required: true, half: true })}
        {field("state",         "State",             "Maharashtra",       { required: true, half: true })}

        {/* Pincode — extra validation */}
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="pincode" className="block text-xs font-medium text-muted-foreground mb-1">
            Pincode <span className="text-destructive">*</span>
          </label>
          <input
            id="pincode"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={form.pincode}
            onChange={(e) => set("pincode", e.target.value.replace(/\D/, ""))}
            placeholder="6-digit pincode"
            className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-background
                        text-foreground placeholder:text-muted-foreground/50 outline-none
                        transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary
                        ${errors.pincode || pincodeError ? "border-destructive" : "border-border"}`}
          />
          {(errors.pincode || pincodeError) && (
            <p className="text-xs text-destructive mt-1">{errors.pincode || pincodeError}</p>
          )}
        </div>
      </div>

      {/* Default toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <button
          type="button"
          onClick={() => setIsDefault((v) => !v)}
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors
                      ${isDefault ? "border-primary bg-primary" : "border-border"}`}
        >
          {isDefault && <Check size={12} className="text-white" />}
        </button>
        <span className="text-sm text-foreground">Set as default address</span>
      </label>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm
                     font-medium text-foreground hover:bg-muted/40 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                     bg-primary text-white text-sm font-semibold hover:bg-primary/90
                     disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          {existing ? "Save Changes" : "Add Address"}
        </button>
      </div>
    </motion.form>
  );
}
