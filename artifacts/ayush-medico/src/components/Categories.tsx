import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Pill, Beaker, Dumbbell, Baby, Sparkles, Droplets, Stethoscope, Scissors } from "lucide-react";

const categories = [
  { icon: Pill, title: "Medicine", desc: "Prescription & OTC", gradient: "from-blue-500 to-blue-700", light: "from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20" },
  { icon: Beaker, title: "Vitamins", desc: "Health supplements", gradient: "from-yellow-500 to-orange-600", light: "from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-900/20" },
  { icon: Dumbbell, title: "Protein", desc: "Nutrition & fitness", gradient: "from-green-500 to-emerald-700", light: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-900/20" },
  { icon: Baby, title: "Baby Products", desc: "Care & essentials", gradient: "from-pink-400 to-rose-600", light: "from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-900/20" },
  { icon: Sparkles, title: "Skin Care", desc: "Beauty & skin health", gradient: "from-purple-500 to-violet-700", light: "from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-900/20" },
  { icon: Droplets, title: "Personal Hygiene", desc: "Daily care products", gradient: "from-cyan-500 to-sky-700", light: "from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-900/20" },
  { icon: Stethoscope, title: "Healthcare Devices", desc: "BP, glucose & more", gradient: "from-primary to-blue-700", light: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-900/20" },
  { icon: Scissors, title: "Surgical Products", desc: "Medical supplies", gradient: "from-red-500 to-rose-700", light: "from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-900/20" },
];

export default function Categories() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="categories" ref={ref} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold border border-secondary/20 mb-4">
            Product Categories
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Shop by{" "}
            <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              Category
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Browse our comprehensive range of healthcare products organized for easy discovery.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6">
          {categories.map((cat, i) => (
            <motion.div
              key={i}
              data-testid={`category-card-${i}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className={`group relative rounded-2xl bg-gradient-to-br ${cat.light} border border-border p-6 shadow-sm hover:shadow-xl hover:shadow-black/10 transition-all duration-300 cursor-pointer overflow-hidden text-center`}
            >
              {/* Hover gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-8 transition-opacity duration-300 rounded-2xl`} />

              <div className="relative">
                <motion.div
                  whileHover={{ rotate: 10 }}
                  className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${cat.gradient} shadow-lg mb-4 group-hover:shadow-xl transition-shadow duration-300`}
                >
                  <cat.icon size={26} className="text-white" />
                </motion.div>
                <h3 className="font-bold text-foreground mb-1 text-sm sm:text-base" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {cat.title}
                </h3>
                <p className="text-xs text-muted-foreground">{cat.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
