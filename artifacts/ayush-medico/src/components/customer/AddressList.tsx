// AddressList — Shows saved addresses with a "use this" selector.
// Used inside CheckoutPage and a customer settings view.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Briefcase, MapPin, Plus, Edit2, Trash2, Star, Check, Loader2 } from "lucide-react";
import {
  deleteAddress,
  setDefaultAddress,
  type CustomerAddress,
} from "@/lib/addressService";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import AddressForm from "./AddressForm";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  addresses: CustomerAddress[];
  selectedId?: string | null;
  onSelect?: (address: CustomerAddress) => void;
  /** Whether to show the delete / edit / default controls. */
  showControls?: boolean;
};

const TYPE_ICONS: Record<CustomerAddress["addressType"], typeof Home> = {
  home: Home,
  work: Briefcase,
  other: MapPin,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddressList({
  addresses,
  selectedId,
  onSelect,
  showControls = true,
}: Props) {
  const { user } = useCustomerAuth();
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const handleDelete = async (address: CustomerAddress) => {
    if (!user) return;
    if (!confirm(`Delete address at ${address.street}?`)) return;
    setDeletingId(address.id);
    try {
      await deleteAddress(user.uid, address.id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (address: CustomerAddress) => {
    if (!user) return;
    setSettingDefaultId(address.id);
    try {
      await setDefaultAddress(user.uid, address.id);
    } finally {
      setSettingDefaultId(null);
    }
  };

  if (adding) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Add New Address</h3>
        <AddressForm
          onSuccess={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Edit Address</h3>
        <AddressForm
          existing={editing}
          onSuccess={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {addresses.map((addr) => {
          const Icon = TYPE_ICONS[addr.addressType];
          const isSelected = selectedId === addr.id;
          const isDeleting = deletingId === addr.id;
          const isSettingDefault = settingDefaultId === addr.id;

          return (
            <motion.div
              key={addr.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative rounded-2xl border p-4 transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                  : "border-border hover:border-primary/30"
              } ${onSelect ? "cursor-pointer" : ""}`}
              onClick={() => onSelect?.(addr)}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check size={11} className="text-white" />
                </div>
              )}

              {/* Default badge */}
              {addr.isDefault && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 mb-2">
                  <Star size={9} /> Default
                </span>
              )}

              {/* Address type icon + name */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10">
                  <Icon size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-sm font-semibold text-foreground">{addr.fullName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {[
                      addr.houseNumber,
                      addr.buildingName,
                      addr.street,
                      addr.area,
                      addr.city,
                      addr.state,
                      addr.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{addr.mobileNumber}</p>
                </div>
              </div>

              {/* Controls */}
              {showControls && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60">
                  {!addr.isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetDefault(addr);
                      }}
                      disabled={isSettingDefault}
                      className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground
                                 hover:text-amber-600 transition-colors disabled:opacity-50"
                    >
                      {isSettingDefault ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Star size={11} />
                      )}
                      Set default
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(addr);
                    }}
                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground
                               hover:text-primary transition-colors ml-auto"
                  >
                    <Edit2 size={11} /> Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(addr);
                    }}
                    disabled={isDeleting}
                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground
                               hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Trash2 size={11} />
                    )}
                    Delete
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Add new address button */}
      <motion.button
        layout
        onClick={() => setAdding(true)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border-2
                   border-dashed border-border hover:border-primary/40 hover:bg-primary/5
                   py-3.5 text-sm font-medium text-muted-foreground hover:text-primary
                   transition-all duration-200"
      >
        <Plus size={15} /> Add New Address
      </motion.button>
    </div>
  );
}
