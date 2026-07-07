import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Truck, MapPin, Pill, ShieldCheck, Clock, ArrowRight } from "lucide-react";
import { useRequestMedicine } from "@/context/RequestMedicineContext";

const features = [
  {
    icon: Truck,
    title: "Same Day Delivery",
    description: "Order before 6 PM and get your medicines delivered the same day.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  {
    icon: MapPin,
    title: "Kurla West & Nearby",
    description: "Delivering within ~4 km of our store — Kurla, Nehru Nagar, Tilak Nagar & more.",
    color: "text-secondary",
    bg: "bg-secondary/10",
    border: "border-secondary/20",
  },
  {
    icon: Pill,
    title: "Genuine Medicines",
    description: "Every medicine is sourced directly from authorised distributors. 100% authentic.",
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
  },
  {
    icon: ShieldCheck,
    title: "Verified Pharmacy",
    description: "Licensed pharmacy with 10+ years of trust in Kurla West.",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    icon: Clock,
    title: "Fast Verification",
    description: "Our pharmacist verifies your prescription and confirms availability quickly.",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
];

export default function DeliveryFeatures() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { triggerRequest } = useRequestMedicine();

  return (
    <section ref={ref} id="delivery-features" className="py-16 lg:py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold border border-secondary/20 mb-4">
            <Truck size={14} />
            Home Delivery Available
          </div>
          <h2
            className="text-3xl sm:text-4xl font-bold text-foreground mb-3"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Medicine{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Delivered to Your Door
            </span>
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Can't visit the pharmacy? We bring genuine medicines right to you — fast, verified, and hassle-free.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className={`relative flex flex-col gap-3 p-5 rounded-2xl border ${f.border} bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
            >
              <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center`}>
                <f.icon size={20} className={f.color} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={() => triggerRequest()}
            className="flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all duration-200 text-sm"
          >
            Request Medicine Delivery <ArrowRight size={16} />
          </button>
          <a
            href="tel:+919833273838"
            className="flex items-center gap-2 px-7 py-3.5 bg-card border border-border text-foreground font-semibold rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 text-sm"
          >
            Call Us: +91 98332 73838
          </a>
        </motion.div>
      </div>
    </section>
  );
}
