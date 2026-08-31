import { CheckCircle2, Copy, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UPI_ID } from "@/lib/paymentService";

export default function PaymentRequiredPanel({ amount }: { amount: number | null }) {
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      toast({ title: "UPI ID copied", description: "Use it in your preferred UPI app." });
    } catch {
      toast({ variant: "destructive", title: "Could not copy", description: "Please copy the UPI ID manually." });
    }
  };

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm mb-1">
        <IndianRupee size={16} /> Payment Required
      </div>
      <p className="text-2xl font-extrabold text-foreground mb-3">
        {amount != null ? `₹${amount}` : "Amount to be confirmed"}
      </p>
       <div className="flex items-center gap-2 rounded-lg bg-background border border-border px-3 py-2">
         <code className="flex-1 text-xs font-bold text-foreground break-all">{UPI_ID}</code>
         <button type="button" onClick={handleCopy} aria-label="Copy UPI ID" className="p-1.5 text-primary hover:bg-primary/10 rounded-md">
           <Copy size={14} />
         </button>
       </div>
       <p className="text-[11px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
         <CheckCircle2 size={11} className="text-primary" /> Please confirm the payable amount with our pharmacist before paying.
       </p>
    </div>
  );
}
