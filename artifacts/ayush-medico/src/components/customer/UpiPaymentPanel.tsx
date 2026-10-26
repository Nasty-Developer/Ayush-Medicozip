import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, Copy, IndianRupee, Loader2, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { submitUpiPayment, UPI_ID } from "@/lib/paymentService";

type Props = {
  orderDbId: string;
  orderId: string;
  amount: number;
  paymentStatus: string;
  onSubmitted?: () => void;
};

function formatAmount(amount: number) {
  return amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function UpiPaymentPanel({
  orderDbId,
  orderId,
  amount,
  paymentStatus,
  onSubmitted,
}: Props) {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copyLabel, setCopyLabel] = useState("");

  const amountText = formatAmount(amount);
  const upiUri = useMemo(
    () =>
      `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent("Ayush Medico")}&am=${encodeURIComponent(amountText)}&cu=INR&tn=${encodeURIComponent(`Order ${orderId}`)}`,
    [amountText, orderId],
  );
  const awaitingVerification = paymentStatus === "verification-pending";

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(upiUri, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#12372a", light: "#ffffff" },
    }).then((url) => {
      if (active) setQrDataUrl(url);
    }).catch(() => {
      if (active) setQrDataUrl("");
    });
    return () => { active = false; };
  }, [upiUri]);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyLabel(label);
      window.setTimeout(() => setCopyLabel(""), 1800);
    } catch {
      toast({ variant: "destructive", title: "Could not copy", description: "Please select and copy the value manually." });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || awaitingVerification) return;
    setSubmitting(true);
    try {
      await submitUpiPayment({ orderDbId });
      toast({ title: "Payment confirmation received", description: "We’ll verify your payment and update your order status." });
      onSubmitted?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not submit payment",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] overflow-hidden">
      <div className="px-5 py-4 border-b border-primary/10">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">UPI payment</p>
        <h2 className="text-lg font-bold text-foreground mt-1 flex items-center gap-2">
          <IndianRupee size={18} className="text-primary" /> Pay ₹{amountText}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Scan the QR or pay to the UPI ID below. The amount is already filled in the QR.
        </p>
      </div>

      {awaitingVerification ? (
        <div className="p-5">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4">
            <CheckCircle2 size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-foreground">Payment verification pending</p>
              <p className="text-xs text-muted-foreground mt-1">
                 We received your confirmation. Our pharmacy team will verify the payment before preparing the order.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5">
          <div className="grid sm:grid-cols-[auto,1fr] gap-5 items-center">
            <div className="flex justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`UPI QR code for ₹${amountText}`} className="w-56 h-56 rounded-xl border border-border bg-white p-2" />
              ) : (
                <div className="w-56 h-56 rounded-xl border border-border bg-white flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Pay to UPI ID</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-bold text-foreground break-all">{UPI_ID}</code>
                  <button type="button" aria-label="Copy UPI ID" onClick={() => copy(UPI_ID, "UPI ID")} className="p-2 rounded-lg text-primary hover:bg-primary/10 flex-shrink-0">
                    <Copy size={15} />
                  </button>
                </div>
                {copyLabel === "UPI ID" && <p className="text-[11px] text-green-600 mt-1">Copied</p>}
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Smartphone size={15} className="text-primary flex-shrink-0 mt-0.5" />
                <span>Use Google Pay, PhonePe, Paytm, BHIM, or any UPI app.</span>
              </div>
              <a href={upiUri} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors sm:hidden">
                <Smartphone size={15} /> Open UPI app
              </a>
            </div>
          </div>

           <div className="mt-5 pt-4 border-t border-primary/10">
             <form onSubmit={handleSubmit} className="space-y-2.5">
               <div>
                 <p className="text-xs font-bold text-foreground">After paying, confirm your payment</p>
                 <p className="text-[11px] text-muted-foreground mt-1">
                   You do not need to enter a transaction ID. This confirmation sends the order to our team for payment verification.
                 </p>
               </div>
                <button type="submit" disabled={submitting || awaitingVerification} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-white text-sm font-bold hover:bg-secondary/90 disabled:opacity-60 transition-colors">
                 {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                 {submitting ? "Saving confirmation…" : "I Have Completed the Payment"}
               </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}