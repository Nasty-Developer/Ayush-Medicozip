import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Award, Users, Package, Heart } from "lucide-react";

const stats = [
  { icon: Award, value: 10, suffix: "+", label: "Years of Trust", color: "text-primary", bg: "bg-primary/10" },
  { icon: Users, value: 50000, suffix: "+", label: "Happy Customers", color: "text-secondary", bg: "bg-secondary/10" },
  { icon: Package, value: 5000, suffix: "+", label: "Medicines Available", color: "text-accent", bg: "bg-accent/10" },
  { icon: Heart, value: 99, suffix: "%", label: "Customer Satisfaction", color: "text-primary", bg: "bg-primary/10" },
];

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {target >= 1000 ? (count >= 1000 ? `${Math.floor(count / 1000)}K` : count.toString()) : count.toString()}
      {suffix}
    </span>
  );
}

export default function About() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px" });

  return (
    <section id="about" ref={ref} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Visual */}
          <motion.div
            initial={{ y: 24 }}
            animate={inView ? { y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative rounded-3xl bg-gradient-to-br from-primary/10 via-card to-secondary/10 border border-border p-8 lg:p-12 shadow-xl shadow-primary/5 overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-gradient-to-bl from-primary/10 to-transparent blur-2xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-gradient-to-tr from-secondary/10 to-transparent blur-2xl" />

              {/* Pharmacy cross SVG illustration */}
              <div className="relative flex justify-center mb-8">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl shadow-primary/30">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <rect x="22" y="6" width="20" height="52" rx="6" fill="white" />
                    <rect x="6" y="22" width="52" height="20" rx="6" fill="white" />
                  </svg>
                </div>
              </div>

              <div className="relative text-center">
                <h3 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>Ayush Medico</h3>
                <p className="text-muted-foreground text-sm font-medium mb-1">Gangaram Makad Wala Chawl, Halav Pool</p>
                <p className="text-muted-foreground text-sm">Near Rolex Hotel, Kurla West, Mumbai – 400070</p>

                <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary rounded-full text-sm font-semibold border border-secondary/20">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  Open Mon – Sun, 8am – 10pm
                </div>
              </div>
            </div>

            {/* Stat grid below */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 20 }}
                  animate={inView ? { y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.07 }}
                  className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className={`inline-flex p-2 rounded-xl ${stat.bg} mb-3`}>
                    <stat.icon size={20} className={stat.color} />
                  </div>
                  <p className={`text-2xl font-bold ${stat.color}`} style={{ fontFamily: "'Poppins', sans-serif" }}>
                    <CountUp target={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ y: 24 }}
            animate={inView ? { y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.08 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-6">
              About Us
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Your Neighborhood{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Healthcare Partner
              </span>
            </h2>

            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Ayush Medico is a trusted pharmacy serving Kurla West with genuine medicines, healthcare essentials, OTC products, wellness products and quality customer care. We have been a cornerstone of healthcare in the community for over a decade.
            </p>

            <p className="text-muted-foreground leading-relaxed mb-8">
              We believe that access to genuine, affordable medicines should be effortless. Our knowledgeable and friendly team is always ready to assist you — whether it's a prescription refill, health advice, or finding the right wellness product for your family.
            </p>

            <div className="space-y-4">
              {[
                "Stocking 5,000+ medicines and healthcare products",
                "Certified and experienced pharmacy professionals",
                "Quick availability with personalized customer service",
                "Serving Kurla West and surrounding areas with trust",
              ].map((point, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 12 }}
                  animate={inView ? { y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
                  </div>
                  <p className="text-foreground text-sm leading-relaxed">{point}</p>
                </motion.div>
              ))}
            </div>

            {/* Pharmacist credential */}
            <div className="mt-6 p-4 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
              <p className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider mb-1">Registered Pharmacist</p>
              <p className="text-sm font-semibold text-foreground">Khan Aqsa Tasadduk Hussain</p>
              <p className="text-xs text-muted-foreground">D.Pharm · Reg. No. 492012</p>
              <p className="text-xs text-muted-foreground">Maharashtra State Pharmacy Council</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="tel:+919833273838"
                data-testid="about-call-btn"
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/90 hover:-translate-y-0.5 transition-all duration-200"
              >
                +91 98332 73838
              </a>
              <a
                href="tel:+919702165965"
                className="flex items-center gap-2 px-6 py-3 bg-secondary/10 text-secondary font-semibold rounded-xl border border-secondary/20 hover:bg-secondary/20 hover:-translate-y-0.5 transition-all duration-200"
              >
                +91 97021 65965
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
