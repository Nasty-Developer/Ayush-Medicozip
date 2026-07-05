import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export default function FloatingWhatsApp() {
  return (
    <motion.a
      href="https://wa.me/919833273838"
      target="_blank"
      rel="noopener noreferrer"
      data-testid="floating-whatsapp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[#25D366] text-white rounded-2xl shadow-2xl shadow-green-500/40 hover:bg-[#22c35e] transition-colors duration-200 group"
    >
      <MessageCircle size={22} className="flex-shrink-0" />
      <motion.span
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: "auto", opacity: 1 }}
        transition={{ delay: 2.3, duration: 0.3 }}
        className="text-sm font-semibold whitespace-nowrap overflow-hidden"
      >
        Chat on WhatsApp
      </motion.span>

      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-2xl bg-[#25D366] animate-ping opacity-20 pointer-events-none" />
    </motion.a>
  );
}
