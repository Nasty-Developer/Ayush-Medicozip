import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote, BadgeCheck } from "lucide-react";

const testimonials = [
  {
    name: "Priya Sharma",
    location: "Kurla West",
    rating: 5,
    text: "Ayush Medico has been my family's pharmacy for over 5 years. They always have the medicines we need and the staff is incredibly helpful. I trust them completely.",
    initials: "PS",
    gradient: "from-primary to-blue-700",
    role: "Regular Customer",
  },
  {
    name: "Rajesh Kumar",
    location: "Ghatkopar",
    rating: 5,
    text: "Excellent service! I called ahead to check medicine availability and they had everything ready when I arrived. Genuine medicines and very fair prices. Highly recommended.",
    initials: "RK",
    gradient: "from-secondary to-green-700",
    role: "Since 2018",
  },
  {
    name: "Anjali Mehta",
    location: "Kurla East",
    rating: 5,
    text: "The pharmacist here is very knowledgeable. He helped me understand my prescription and even suggested a more affordable alternative. Such genuine and caring service.",
    initials: "AM",
    gradient: "from-purple-500 to-violet-700",
    role: "Loyal Customer",
  },
  {
    name: "Mohammed Ali",
    location: "Sion",
    rating: 5,
    text: "Best medical store in the area. They stock a wide range of products — from daily medicines to specialty items. Fast service and the staff is always friendly and professional.",
    initials: "MA",
    gradient: "from-orange-500 to-red-600",
    role: "Since 2020",
  },
  {
    name: "Sunita Rao",
    location: "Kurla West",
    rating: 5,
    text: "I have been buying my diabetic supplies here for years. They always have the right test strips and the pricing is the best in the area. Very dependable pharmacy.",
    initials: "SR",
    gradient: "from-pink-500 to-rose-700",
    role: "Diabetes Care Patient",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={14} className={i < rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"} />
      ))}
    </div>
  );
}

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDirection(1);
      setCurrent(prev => (prev + 1) % testimonials.length);
    }, 5000);
  };

  const next = () => { setDirection(1); setCurrent(prev => (prev + 1) % testimonials.length); resetTimer(); };
  const prev = () => { setDirection(-1); setCurrent(prev => (prev - 1 + testimonials.length) % testimonials.length); resetTimer(); };
  const goTo = (i: number) => { setDirection(i > current ? 1 : -1); setCurrent(i); resetTimer(); };

  useEffect(() => { resetTimer(); return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  const t = testimonials[current];
  const prev1 = testimonials[(current - 1 + testimonials.length) % testimonials.length];
  const next1 = testimonials[(current + 1) % testimonials.length];

  return (
    <section id="testimonials" className="relative py-20 lg:py-28 overflow-hidden bg-gradient-to-br from-background via-primary/3 to-secondary/3">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-4">
            <BadgeCheck size={14} />
            Verified Reviews
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
            What Our{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Customers Say
            </span>
          </h2>
          <p className="text-muted-foreground text-base lg:text-lg max-w-lg mx-auto">
            Real stories from families who trust Ayush Medico every day.
          </p>
        </div>

        {/* Three-card view on desktop */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-5 mb-8">
          {/* Prev card — dimmed */}
          <motion.div
            key={`prev-${current}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 rounded-2xl bg-card border border-border opacity-50 scale-95 origin-right transition-all duration-500"
          >
            <SmallCard t={prev1} />
          </motion.div>

          {/* Featured card */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="relative p-8 rounded-3xl bg-card border-2 border-primary/30 shadow-2xl shadow-primary/10 z-10"
            >
              <div className="absolute -top-px left-8 right-8 h-1 rounded-b-full bg-gradient-to-r from-primary to-secondary" />
              <Quote size={32} className="text-primary/20 mb-4" />
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md`}>
                  {t.initials}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>{t.name}</p>
                    <BadgeCheck size={13} className="text-primary" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{t.location} · {t.role}</p>
                  <StarRating rating={t.rating} />
                </div>
              </div>
              <p className="text-foreground text-sm leading-relaxed italic">"{t.text}"</p>
            </motion.div>
          </AnimatePresence>

          {/* Next card — dimmed */}
          <motion.div
            key={`next-${current}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 rounded-2xl bg-card border border-border opacity-50 scale-95 origin-left transition-all duration-500"
          >
            <SmallCard t={next1} />
          </motion.div>
        </div>

        {/* Mobile single card */}
        <div className="lg:hidden relative bg-card border border-border rounded-2xl shadow-xl shadow-primary/5 overflow-hidden p-7 mb-6">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary" />
          <Quote size={36} className="text-primary/15 mb-3" />
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              initial={{ opacity: 0, x: direction * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -30 }}
              transition={{ duration: 0.35 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>{t.initials}</div>
                <div>
                  <p className="text-sm font-bold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.location}</p>
                  <StarRating rating={t.rating} />
                </div>
              </div>
              <p className="text-foreground text-sm leading-relaxed italic">"{t.text}"</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`transition-all duration-300 rounded-full ${i === current ? "w-8 h-2.5 bg-primary" : "w-2.5 h-2.5 bg-border hover:bg-muted-foreground"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SmallCard({ t }: { t: typeof testimonials[0] }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>{t.initials}</div>
        <div>
          <p className="text-sm font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>{t.name}</p>
          <p className="text-[11px] text-muted-foreground">{t.location}</p>
          <div className="flex items-center gap-0.5 mt-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={10} className="text-yellow-400 fill-yellow-400" />
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed italic line-clamp-4">"{t.text}"</p>
    </>
  );
}
