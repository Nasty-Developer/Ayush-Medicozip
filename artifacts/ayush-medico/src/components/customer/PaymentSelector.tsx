// PaymentSelector — Choose between UPI, COD, (and future Razorpay/Wallet).
// Shows the UPI ID QR-placeholder when UPI is selected.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, CheckCheck } from "lucide-react";
import {
  PAYMENT_METHODS,
  STORE_UPI_ID,
  STORE_UPI_NAME,
  type PaymentMethodConfig,
} from "@/lib/paymentService";
import type { PaymentMethod } from "@/lib/orderService";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  selected: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  /** Only shown when UPI is selected and awaiting manual confirmation. */
  upiTransactionId?: string;
  onUpiTransactionIdChange?: (v: string) => void;
  grandTotal: number;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentSelector({
  selected,
  onChange,
  upiTransactionId = "",
  onUpiTransactionIdChange,
  grandTotal,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(STORE_UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  return (
    <div className="space-y-3">
      {PAYMENT_METHODS.map((method) => (
        <PaymentMethodCard
          key={method.method}
          config={method}
          selected={selected === method.method}
          onSelect={() => method.available && onChange(method.method)}
        />
      ))}

      {/* UPI instructions */}
      <AnimatePresence>
        {selected === "upi" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Pay via UPI</p>

              {/* UPI ID copy */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-background border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground mb-0.5">UPI ID</p>
                  <p className="text-sm font-mono font-semibold text-foreground">{STORE_UPI_ID}</p>
                  <p className="text-[10px] text-muted-foreground">{STORE_UPI_NAME}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors flex-shrink-0"
                >
                  {copied ? <CheckCheck size={15} /> : <Copy size={15} />}
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                1. Open any UPI app (Google Pay, PhonePe, Paytm, etc.)<br />
                2. Send <strong className="text-foreground">₹{grandTotal.toLocaleString("en-IN")}</strong> to the UPI ID above<br />
                3. Enter the transaction ID / UTR below to confirm
              </p>

              {/* Transaction ID input */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  UPI Transaction ID / UTR <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={upiTransactionId}
                  onChange={(e) => onUpiTransactionIdChange?.(e.target.value)}
                  placeholder="e.g. 312456789012"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background
                             text-sm text-foreground placeholder:text-muted-foreground/50
                             outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Your order will be confirmed once our team verifies the payment (usually within 30 minutes).
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COD note */}
      <AnimatePresence>
        {selected === "cod" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                💵 Keep <strong>₹{grandTotal.toLocaleString("en-IN")}</strong> ready in cash when your order arrives.
                Our delivery partner will collect the payment at your door.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PaymentMethodCard ────────────────────────────────────────────────────────

function PaymentMethodCard({
  config,
  selected,
  onSelect,
}: {
  config: PaymentMethodConfig;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!config.available}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left
                  transition-all duration-200
                  ${
                    config.available
                      ? selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                      : "border-border opacity-50 cursor-not-allowed"
                  }`}
    >
      {/* Radio */}
      <div
        className={`flex-shrink-0 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center
                    ${selected ? "border-primary bg-primary" : "border-muted-foreground/40"}`}
        style={{ width: 18, height: 18 }}
      >
        {selected && <Check size={10} className="text-white" />}
      </div>

      {/* Icon */}
      <span className="text-xl flex-shrink-0">{config.icon}</span>

      {/* Label + description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{config.label}</p>
        <p className="text-xs text-muted-foreground">
          {config.available ? config.description : config.unavailableReason}
        </p>
      </div>

      {/* Coming soon badge */}
      {!config.available && config.unavailableReason && (
        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
          Soon
        </span>
      )}
    </button>
  );
}
