// Shared order-status timeline — used by both the customer-facing Track
// Order page and the My Orders detail view, so a signed-in customer and an
// anonymous customer tracking by mobile number see the exact same visual
// language for order progress.

import {
  PackageSearch, ShieldCheck, CheckCircle2, IndianRupee, ChefHat, Truck,
  PackageCheck, Ban, XCircle, ShoppingCart,
} from "lucide-react";
import { STATUS_PIPELINE, STATUS_LABELS, isNegativeStatus, getPipelineIndex, type RequestStatus } from "@/lib/orderStatus";

const STAGE_ICONS: Record<RequestStatus, React.ElementType> = {
  new: PackageSearch,
  "pending-verification": ShieldCheck,
  accepted: CheckCircle2,
  "medicine-reserved": ShoppingCart,
  "payment-pending": IndianRupee,
  "payment-received": IndianRupee,
  preparing: ChefHat,
  "out-for-delivery": Truck,
  delivered: PackageCheck,
  rejected: XCircle,
  "medicine-unavailable": XCircle,
  cancelled: Ban,
};

const STAGES = STATUS_PIPELINE.map((key) => ({
  key,
  label: STATUS_LABELS[key],
  icon: STAGE_ICONS[key],
}));

export function NegativeStatusBanner({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
    cancelled: { label: "This order was cancelled.", cls: "bg-destructive/10 text-destructive", icon: Ban },
    rejected: { label: "This order was not accepted.", cls: "bg-destructive/10 text-destructive", icon: XCircle },
    "medicine-unavailable": { label: "Sorry, this medicine is currently unavailable.", cls: "bg-amber-500/10 text-amber-600", icon: XCircle },
  };
  const c = cfg[status];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold mb-4 ${c.cls}`}>
      <Icon size={16} /> {c.label}
    </div>
  );
}

export default function OrderStatusTimeline({ status }: { status: string }) {
  if (isNegativeStatus(status)) return null;
  const activeIndex = getPipelineIndex(status);

  return (
    <div className="space-y-0">
      {STAGES.map((stage, i) => {
        const Icon = stage.icon;
        const done = activeIndex >= 0 && i <= activeIndex;
        const isCurrent = i === activeIndex;
        return (
          <div key={stage.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  done ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
              >
                <Icon size={14} />
              </div>
              {i < STAGES.length - 1 && (
                <div className={`w-0.5 flex-1 min-h-[24px] ${i < activeIndex ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
            <div className="pb-6">
              <p className={`text-sm font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>
                {done ? "✅" : isCurrent ? "🟡" : "⚪"} {stage.label}
              </p>
              {isCurrent && <p className="text-xs text-primary mt-0.5">Current status</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
