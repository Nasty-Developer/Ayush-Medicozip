import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ShieldCheck, Building2, BadgeDollarSign, Users, Zap, ThumbsUp } from "lucide-react";

const reasons = [
  {
    icon: ShieldCheck,
    title: "100% Genuine Medicines",
    desc: "Every medicine we stock is sourced directly from licensed distributors and manufacturers — no compromises on authenticity.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    highlight: "from-primary/10 to-primary/5",
  },
  {
    icon: Building2,
    title: "Trusted Pharmacy",
    desc: "Over a decade of serving Kurla West with integrity, care, and a commitment to your health and wellbeing.",
    color: "text-secondary",
    bg: "bg-secondary/10",
    border: "border-secondary/20",
    highlight: "from-secondary/10 to-secondary/5",
  },
  {
    icon: BadgeDollarSign,
    title: "Affordable Prices",
    desc: "We offer competitive prices on all medicines and health products without ever sacrificing quality.",
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
    highlight: "from-accent/10 to-accent/5",
  },
  {
    icon: Users,
    title: "Friendly Staff",
    desc: "Our warm and knowledgeable team is always ready to help — from reading prescriptions to suggesting alternatives.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    highlight: "from-primary/10 to-primary/5",
  },
  {
    icon: Zap,
    title: "Fast Service",
    desc: "We understand urgency. Walk in or call ahead — we'll have your medicines ready quickly so you can focus on recovery.",
    color: "text-secondary",
    bg: "bg-secondary/10",
    border: "border-secondary/20",
    highlight: "from-secondary/10 to-secondary/5",
  },
  {
    icon: ThumbsUp,
    title: "Customer Satisfaction",
    desc: "With a 99% satisfaction rate, our customers keep coming back — and they send their families and friends too.",
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
    highlight: "from-accent/10 to-accent/5",
  },
];

export default function WhyChooseUs() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px" });

  return (
    <section id="why-us" ref={ref} className="py-20 lg:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ y: 24 }}
          animate={inView ? { y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold border border-accent/20 mb-4">
            Why Choose Us
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Why Families in Kurla Trust{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Ayush Medico
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Six reasons why thousands of families in Kurla West choose us as their go-to pharmacy — every time.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((r, i) => (
            <motion.div
              key={i}
              data-testid={`why-card-${i}`}
              initial={{ y: 24 }}
              animate={inView ? { y: 0 } : {}}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              whileHover={{ y: -6 }}
              className={`group relative bg-card border ${r.border} rounded-2xl p-7 shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 overflow-hidden`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${r.highlight} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

              <div className="relative">
                <div className={`inline-flex p-3 rounded-xl ${r.bg} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <r.icon size={24} className={r.color} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {r.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {r.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
