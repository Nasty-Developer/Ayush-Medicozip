import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Pill, ShoppingBag, Baby, Sparkles, Dumbbell, Activity, HeartPulse, Stethoscope, ShoppingCart, Leaf } from "lucide-react";

const services = [
  { icon: Pill, title: "Prescription Medicines", desc: "Genuine branded and generic prescription drugs dispensed safely.", color: "from-primary/20 to-primary/5", iconColor: "text-primary", border: "border-primary/20" },
  { icon: ShoppingBag, title: "OTC Medicines", desc: "Over-the-counter medicines for everyday health needs.", color: "from-secondary/20 to-secondary/5", iconColor: "text-secondary", border: "border-secondary/20" },
  { icon: Baby, title: "Baby Care", desc: "Complete baby care essentials — nutrition, diapers, skincare and more.", color: "from-accent/20 to-accent/5", iconColor: "text-accent", border: "border-accent/20" },
  { icon: Sparkles, title: "Personal Care", desc: "Premium personal hygiene and grooming products for the whole family.", color: "from-primary/15 to-accent/10", iconColor: "text-primary", border: "border-primary/20" },
  { icon: Dumbbell, title: "Health Supplements", desc: "Vitamins, proteins and nutritional supplements from trusted brands.", color: "from-secondary/15 to-primary/5", iconColor: "text-secondary", border: "border-secondary/20" },
  { icon: Activity, title: "Diabetic Care", desc: "Glucometers, test strips, insulin and diabetic-friendly products.", color: "from-accent/15 to-secondary/5", iconColor: "text-accent", border: "border-accent/20" },
  { icon: HeartPulse, title: "First Aid", desc: "First aid kits, bandages, antiseptics and emergency supplies.", color: "from-primary/20 to-secondary/5", iconColor: "text-primary", border: "border-primary/20" },
  { icon: Stethoscope, title: "Medical Devices", desc: "BP monitors, thermometers, nebulizers and healthcare devices.", color: "from-secondary/20 to-accent/5", iconColor: "text-secondary", border: "border-secondary/20" },
  { icon: ShoppingCart, title: "Daily Essentials", desc: "Household health essentials and everyday wellness products.", color: "from-accent/20 to-primary/5", iconColor: "text-accent", border: "border-accent/20" },
  { icon: Leaf, title: "Wellness Products", desc: "Ayurvedic, herbal and natural wellness products for holistic health.", color: "from-secondary/15 to-primary/10", iconColor: "text-secondary", border: "border-secondary/20" },
];

export default function Services() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px" });

  return (
    <section id="services" ref={ref} className="py-20 lg:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ y: 24 }}
          animate={inView ? { y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-4">
            Our Services
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Everything Your Health{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Needs
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From prescription medicines to wellness products — Ayush Medico is your one-stop healthcare destination in Kurla West.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {services.map((s, i) => (
            <motion.div
              key={i}
              data-testid={`service-card-${i}`}
              initial={{ y: 20 }}
              animate={inView ? { y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className={`group relative bg-card border ${s.border} rounded-2xl p-5 shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 cursor-pointer overflow-hidden`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${s.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <s.icon size={22} className={s.iconColor} />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-2 leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {s.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
