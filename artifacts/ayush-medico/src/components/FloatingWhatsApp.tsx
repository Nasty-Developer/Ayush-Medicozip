import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export default function FloatingWhatsApp() {
  return (
    /**
     * Outer element: handles entrance (scale + opacity spring) and
     * whileHover / whileTap interaction.
     * Positioned with env(safe-area-inset-bottom) so it never overlaps
     * the Android nav bar or iPhone home indicator.
     */
    <motion.a
      href="https://wa.me/919833273838"
      target="_blank"
      rel="noopener noreferrer"
      data-testid="floating-whatsapp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2, type: "spring", stiffness: 220, damping: 18 }}
      whileHover={{ scale: 1.07 }}
      whileTap={{ scale: 0.93 }}
      className="fixed z-50 right-4 sm:right-6"
      style={{
        // Sit above the device's home indicator / Android nav bar
        bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        WebkitTapHighlightColor: "transparent",
      }}
      aria-label="Chat on WhatsApp"
    >
      {/**
       * Inner element: continuous gentle floating animation.
       * Separated from the outer so hover/tap scale doesn't fight the float.
       */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{
          duration: 2.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2.8,
        }}
        className="relative flex items-center gap-2 px-4 py-3 bg-[#25D366] text-white rounded-2xl shadow-2xl shadow-green-500/30 hover:bg-[#22c35e] transition-colors duration-200"
      >
        <MessageCircle size={21} className="flex-shrink-0" />

        <motion.span
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "auto", opacity: 1 }}
          transition={{ delay: 2.35, duration: 0.3, ease: "easeOut" }}
          className="text-sm font-semibold whitespace-nowrap overflow-hidden"
        >
          Chat on WhatsApp
        </motion.span>

        {/* Pulsing ring — only on first appearance */}
        <motion.span
          initial={{ opacity: 0.25 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 2, duration: 3, ease: "easeOut" }}
          className="absolute inset-0 rounded-2xl bg-[#25D366] animate-ping pointer-events-none"
          aria-hidden="true"
        />
      </motion.div>
    </motion.a>
  );
}
