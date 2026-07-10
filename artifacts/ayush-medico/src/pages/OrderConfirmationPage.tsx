// OrderConfirmationPage — Shown immediately after a successful order placement.
// Route: /order-confirmation/:docId

import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, Package, Phone, ArrowRight } from "lucide-react";

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrderConfirmationPage() {
  const [matched, params] = useRoute("/order-confirmation/:docId");
  const [, navigate] = useLocation();

  const docId = params?.docId ?? "";

  // Confetti-free celebration: just a clean green success state
  // (Lottie or canvas confetti can be added later without changing this page's structure)

  if (!matched || !docId) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        {/* Success animation */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="flex justify-center mb-6"
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 size={52} className="text-green-600 dark:text-green-400" />
            </div>
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-green-400 dark:border-green-600"
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">Order Placed!</h1>
          <p className="text-muted-foreground">
            Thank you for your order. We've received it and will start processing shortly.
          </p>
        </motion.div>

        {/* What happens next */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-5 rounded-2xl border border-border bg-card text-left space-y-4"
        >
          <p className="text-sm font-bold text-foreground">What happens next?</p>

          {[
            {
              icon: "📋",
              title: "Order confirmed",
              desc: "Our pharmacist will review your order and confirm availability.",
            },
            {
              icon: "💊",
              title: "Preparing",
              desc: "Your medicines will be picked and packed carefully.",
            },
            {
              icon: "🚴",
              title: "Out for delivery",
              desc: "Our delivery partner will bring it to your door.",
            },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">{step.icon}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex flex-col gap-3"
        >
          <button
            onClick={() => navigate(`/order/${docId}`)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
                       bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            <Package size={16} /> Track My Order <ArrowRight size={14} />
          </button>

          <a
            href="tel:+919833273838"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border
                       border-border text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
          >
            <Phone size={14} /> Call +91 98332 73838
          </a>

          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Return to Home
          </button>
        </motion.div>

      </div>
    </div>
  );
}
