// Payment-architecture placeholder. When an order's status is
// "payment-pending", the customer sees this panel with the amount due and a
// "Pay Now" button.
//
// FUTURE RAZORPAY: this component is the single integration point for
// Razorpay Checkout. When ready, `handlePayNow` below is where a Razorpay
// order would be created (via a backend call) and `Razorpay.open()` invoked;
// on success, the backend would update Firestore (`paymentStatus:
// "paid"`, `status: "payment-received"`), which both Track Order and My
// Orders already pick up automatically via their existing subscriptions —
// no other UI changes would be needed.

import { CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PaymentRequiredPanel({ amount }: { amount: number | null }) {
  const { toast } = useToast();

  const handlePayNow = () => {
    toast({
      title: "Online payment coming soon",
      description: "Razorpay checkout isn't connected yet. Please pay via cash or UPI on delivery, or contact us on WhatsApp.",
    });
  };

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm mb-1">
        <CreditCard size={16} /> Payment Required
      </div>
      <p className="text-2xl font-extrabold text-foreground mb-3">
        {amount != null ? `₹${amount}` : "Amount to be confirmed"}
      </p>
      <button
        onClick={handlePayNow}
        data-testid="button-pay-now"
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all"
      >
        <CreditCard size={15} /> Pay Now
      </button>
      <p className="text-[11px] text-muted-foreground text-center mt-2">
        Secure online payment via Razorpay — coming soon
      </p>
    </div>
  );
}
