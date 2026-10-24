// Shown while an order hasn't been reviewed by the pharmacy yet. Escalates
// to a WhatsApp-assistance prompt once it's been waiting too long.

import { Clock3, MessageCircle } from "lucide-react";
import { isWaitingForReview, needsUrgentAssistance, buildOrderWhatsAppUrl, type WaitingOrderInfo } from "@/lib/orderWaiting";

export default function WaitingBanner({ order, orderId }: { order: WaitingOrderInfo; orderId?: string }) {
  if (!isWaitingForReview(order)) return null;
  const urgent = needsUrgentAssistance(order);

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-4">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
        <Clock3 size={15} /> ⏳ Waiting for Pharmacy Review
      </div>
      {urgent && (
        <>
          <p className="text-xs text-muted-foreground mt-2 mb-2">
            Need urgent assistance?
          </p>
          <a
            href={buildOrderWhatsAppUrl(orderId)}
            target="_blank" rel="noopener noreferrer"
            data-testid="button-urgent-whatsapp"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#1ebe57] transition-all"
          >
            <MessageCircle size={13} /> Chat on WhatsApp
          </a>
        </>
      )}
    </div>
  );
}
