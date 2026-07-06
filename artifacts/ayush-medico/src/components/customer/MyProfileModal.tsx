import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, User as UserIcon, ShieldCheck } from "lucide-react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

export default function MyProfileModal({ onClose }: { onClose: () => void }) {
  const { user } = useCustomerAuth();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6"
          data-testid="my-profile-modal"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
              My Profile
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <UserIcon size={28} />
            </div>
            <p className="text-sm font-bold text-foreground">{user?.displayName || "Ayush Medico Customer"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex gap-3">
              <span className="text-xs font-semibold text-muted-foreground w-24 flex-shrink-0 flex items-center gap-1"><Mail size={11} /> Email</span>
              <span className="text-foreground break-words min-w-0">{user?.email || "—"}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-xs font-semibold text-muted-foreground w-24 flex-shrink-0 flex items-center gap-1"><ShieldCheck size={11} /> Verified</span>
              <span className="text-foreground">{user?.emailVerified ? "Yes" : "Not verified"}</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center mt-5">
            Profile editing and phone number verification are coming soon.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
