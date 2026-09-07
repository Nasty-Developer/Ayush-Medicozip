/**
 * FloatingWhatsApp
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixed-position WhatsApp FAB.
 *
 * Animation architecture (two nested elements):
 *   Outer motion.a  — spring entrance + whileHover/whileTap scale.
 *   Inner motion.div — continuous gentle vertical float (y keyframes).
 * Keeping scale and y on separate elements prevents Framer Motion from
 * compositing them into a single conflicting transform string.
 *
 * Rendering-glitch mitigations:
 *   • No CSS `animate-ping` — its transform:scale(2) keyframe creates a
 *     separate GPU compositor layer inside a fixed/transformed element, which
 *     produces green horizontal scanlines on Android Chrome (Mali/Adreno GPUs).
 *   • No backdrop-filter inside a transformed container.
 *   • Safe-area bottom offset via env() so the button never overlaps the
 *     Android nav bar or iOS home indicator.
 */

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export default function FloatingWhatsApp() {
  return (
    <motion.a
      href="https://wa.me/919833273838"
      target="_blank"
      rel="noopener noreferrer"
      data-testid="floating-whatsapp"
      aria-label="Chat on WhatsApp"
      // Entrance: spring pop-in after page load
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2, type: "spring", stiffness: 220, damping: 18 }}
      // Interaction
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className="fixed z-40 right-4 sm:right-6"
      style={{
        // Sit above Android nav bar / iOS home indicator
        bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        WebkitTapHighlightColor: "transparent",
        // Explicit GPU layer so the entrance animation is isolated
        // and doesn't tear through page content on low-end devices
        willChange: "transform",
      }}
    >
      {/*
       * Inner element owns the continuous float (y keyframes).
       * Separated from the outer so hover/tap scale doesn't compound with y
       * and produce a jittery combined transform on 60fps-limited devices.
       */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          // Start floating only after the entrance animation finishes
          delay: 3,
        }}
        className="flex items-center gap-2 px-4 py-3
                   bg-[#25D366] text-white rounded-2xl
                   shadow-xl shadow-green-500/25"
      >
        <MessageCircle size={21} className="flex-shrink-0" />
        <span className="text-sm font-semibold whitespace-nowrap">
          Chat on WhatsApp
        </span>
      </motion.div>
    </motion.a>
  );
}
