import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Truck, MapPin, Pill, ShieldCheck, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import { useRequestMedicine } from "@/context/RequestMedicineContext";

const features = [
  {
    icon: Truck,
    title: "Same Day Delivery",
    description: "Order before 6 PM and get your medicines delivered the same day.",
    gradient: "from-primary to-blue-600",
    light: "bg-primary/10",
  },
  {
    icon: MapPin,
    title: "Kurla West & Nearby",
    description: "Delivering within ~4 km — Kurla, Nehru Nagar, Tilak Nagar & more.",
    gradient: "from-secondary to-emerald-600",
    light: "bg-secondary/10",
  },
  {
    icon: Pill,
    title: "Genuine Medicines",
    description: "Every medicine sourced directly from authorised distributors.",
    gradient: "from-violet-500 to-purple-600",
    light: "bg-violet-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Verified Pharmacy",
    description: "Licensed pharmacy with 10+ years of trust in Kurla West.",
    gradient: "from-emerald-500 to-teal-600",
    light: "bg-emerald-500/10",
  },
  {
    icon: Clock,
    title: "Fast Verification",
    description: "Our pharmacist verifies your prescription and confirms availability quickly.",
    gradient: "from-amber-500 to-orange-500",
    light: "bg-amber-500/10",
  },
];

const highlights = [
  "Call ahead to confirm stock",
  "WhatsApp your prescription",
  "Same-day dispatch guaranteed",
  "Free delivery on select orders",
];

export default function DeliveryFeatures() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { triggerRequest } = useRequestMedicine();

  return (
    <section ref={ref} id="delivery-features" className="relative py-20 lg:py-28 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-secondary/8 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-start">

          {/* Left — heading + highlights + CTAs */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold border border-secondary/20 mb-5">
              <Truck size={14} />
              Home Delivery Available
            </div>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-5 leading-tight"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Medicines{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Delivered to Your Door
              </span>
            </h2>
            <p className="text-muted-foreground text-base lg:text-lg leading-relaxed mb-8 max-w-lg">
              Can't visit the pharmacy? We bring genuine medicines right to you — fast, verified, and completely hassle-free.
            </p>

            {/* Bullet highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {highlights.map((h, i) => (
                <motion.div
                  key={h}
                  initial={{ opacity: 0, x: -10 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                >
                  <CheckCircle2 size={16} className="text-secondary flex-shrink-0" />
                  <span className="text-sm text-foreground font-medium">{h}</span>
                </motion.div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => triggerRequest()}
                className="flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all duration-200 text-sm"
              >
                Request Medicine Delivery
                <ArrowRight size={16} />
              </button>
              <a
                href="tel:+919833273838"
                className="flex items-center justify-center gap-2 px-7 py-3.5 bg-card border border-border text-foreground font-semibold rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 text-sm"
              >
                📞 +91 98332 73838
              </a>
            </div>
          </motion.div>

          {/* Right — feature cards */}
          <div className="mt-12 lg:mt-0 grid grid-cols-1 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: 30 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className="group flex items-start gap-4 p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-lg hover:shadow-primary/8 hover:-translate-y-0.5 hover:border-primary/25 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
                  <f.icon size={22} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1 text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
