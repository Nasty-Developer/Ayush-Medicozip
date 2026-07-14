import { useRef, useState, useMemo } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, X } from "lucide-react";

const faqs = [
  {
    q: "Do you provide genuine medicines?",
    a: "Absolutely. Ayush Medico sources all medicines directly from licensed distributors and authorized manufacturers. We maintain strict quality controls to ensure every product you receive is 100% genuine, properly stored, and within its expiry date.",
  },
  {
    q: "Can I call before visiting to check medicine availability?",
    a: "Yes, you can! Call us at +91 98332 73838 before your visit and we'll check availability immediately. If we don't have a specific medicine in stock, we can usually arrange it within 24 hours from our network.",
  },
  {
    q: "Do you stock daily-use medicines and healthcare products?",
    a: "Yes, we maintain a comprehensive inventory of over 5,000 medicines and healthcare products. This includes prescription drugs, OTC medicines, baby care, personal hygiene, supplements, surgical supplies, and much more for everyday needs.",
  },
  {
    q: "Where are you located?",
    a: "We are located at Shop No 67, Halav Pool Rd, Makad Wala Chawl, Kurla West, Mumbai, Maharashtra 400070. We are easily accessible from Kurla Station and surrounding areas. You can also get directions via Google Maps.",
  },
  {
    q: "What are your working hours?",
    a: "Ayush Medico is open 7 days a week from 8:00 AM to 10:00 PM — including Sundays and public holidays. We understand that healthcare needs don't follow a schedule, so we strive to be available when you need us.",
  },
  {
    q: "Do you accept prescriptions?",
    a: "Yes, we accept valid prescriptions from registered medical practitioners. Our pharmacists review prescriptions carefully before dispensing any prescription medicine. We can also advise on proper dosage and usage as per your doctor's instructions.",
  },
  {
    q: "Do you offer home delivery?",
    a: "Yes! We offer same-day home delivery within Kurla West and nearby areas (approximately 4 km from our store). Order before 6 PM for same-day delivery. We cover Kurla, Nehru Nagar, Tilak Nagar, and more.",
  },
  {
    q: "How do I order medicines online?",
    a: "You can browse our medicine catalog on this website and add items to your cart. For prescription medicines, you'll need to upload a valid prescription during checkout. You can also call or WhatsApp us at +91 98332 73838 to place an order directly.",
  },
];

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ y: 16 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
        open ? "border-primary/30 shadow-md shadow-primary/5 bg-card" : "border-border bg-card hover:border-primary/20"
      }`}
    >
      <button
        data-testid={`faq-toggle-${index}`}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left"
      >
        <span className="font-semibold text-foreground text-sm sm:text-base pr-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
          {faq.q}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={`flex-shrink-0 p-1 rounded-lg ${open ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
        >
          <ChevronDown size={18} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="px-6 pb-5">
              <div className="h-px bg-border mb-4" />
              <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQ() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px" });
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }, [query]);

  return (
    <section id="faq" ref={ref} className="py-20 lg:py-28 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ y: 24 }}
          animate={inView ? { y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold border border-secondary/20 mb-4">
            FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Everything you need to know about Ayush Medico — answered honestly.
          </p>

          {/* Search bar */}
          <div className="relative max-w-lg mx-auto">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search questions…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </motion.div>

        <div className="space-y-3">
          {filtered.length > 0 && filtered.map((faq, i) => (
            <FAQItem key={faq.q} faq={faq} index={i} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No questions found for "{query}". Try different keywords.</p>
              <button onClick={() => setQuery("")} className="mt-3 text-primary text-sm font-medium hover:underline">
                Clear search
              </button>
            </div>
          )}
        </div>

        <motion.div
          initial={{ y: 16 }}
          animate={inView ? { y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="mt-10 text-center"
        >
          <p className="text-muted-foreground text-sm mb-4">Have more questions? We're happy to help.</p>
          <a
            href="tel:+919833273838"
            data-testid="faq-call-btn"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/90 hover:-translate-y-0.5 transition-all duration-200"
          >
            Call Us: +91 98332 73838
          </a>
        </motion.div>
      </div>
    </section>
  );
}
