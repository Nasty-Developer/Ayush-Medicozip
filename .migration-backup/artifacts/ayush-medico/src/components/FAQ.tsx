import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

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
];

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
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
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="faq" ref={ref} className="py-20 lg:py-28 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
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
          <p className="text-muted-foreground text-lg">
            Everything you need to know about Ayush Medico — answered honestly.
          </p>
        </motion.div>

        <div className="space-y-3">
          {inView && faqs.map((faq, i) => (
            <FAQItem key={i} faq={faq} index={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.7 }}
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
