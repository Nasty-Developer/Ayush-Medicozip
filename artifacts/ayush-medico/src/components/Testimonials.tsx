import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Priya Sharma",
    location: "Kurla West",
    rating: 5,
    text: "Ayush Medico has been my family's pharmacy for over 5 years. They always have the medicines we need and the staff is incredibly helpful. I trust them completely.",
    initials: "PS",
    color: "from-primary to-blue-700",
  },
  {
    name: "Rajesh Kumar",
    location: "Ghatkopar",
    rating: 5,
    text: "Excellent service! I called ahead to check medicine availability and they had everything ready when I arrived. Genuine medicines and very fair prices. Highly recommended.",
    initials: "RK",
    color: "from-secondary to-green-700",
  },
  {
    name: "Anjali Mehta",
    location: "Kurla East",
    rating: 5,
    text: "The pharmacist here is very knowledgeable. He helped me understand my prescription and even suggested a more affordable alternative. Such genuine and caring service.",
    initials: "AM",
    color: "from-purple-500 to-violet-700",
  },
  {
    name: "Mohammed Ali",
    location: "Sion",
    rating: 5,
    text: "Best medical store in the area. They stock a wide range of products — from daily medicines to specialty items. Fast service and the staff is always friendly and professional.",
    initials: "MA",
    color: "from-orange-500 to-red-600",
  },
  {
    name: "Sunita Rao",
    location: "Kurla West",
    rating: 5,
    text: "I have been buying my diabetic supplies here for years. They always have the right test strips and the pricing is the best in the area. Very dependable pharmacy.",
    initials: "SR",
    color: "from-pink-500 to-rose-700",
  },
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = () => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goTo = (i: number) => {
    setDirection(i > current ? 1 : -1);
    setCurrent(i);
  };

  useEffect(() => {
    intervalRef.current = setInterval(next, 4500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const t = testimonials[current];

  return (
    <section id="testimonials" className="py-20 lg:py-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-4">
            Testimonials
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
            What Our{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Customers Say
            </span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Real stories from the families who trust Ayush Medico every day.
          </p>
        </div>

        <div className="relative">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 rounded-3xl blur-xl" />

          <div className="relative bg-card border border-border rounded-3xl shadow-xl shadow-primary/5 overflow-hidden p-8 sm:p-12">
            {/* Quote icon */}
            <div className="absolute top-6 right-8 opacity-10">
              <Quote size={80} className="text-primary" />
            </div>

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg`}>
                    {t.initials}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>{t.name}</h4>
                    <p className="text-sm text-muted-foreground">{t.location}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                  </div>
                </div>

                <blockquote className="text-foreground text-lg sm:text-xl leading-relaxed italic font-medium">
                  "{t.text}"
                </blockquote>
              </motion.div>
            </AnimatePresence>

            {/* Controls */}
            <div className="flex items-center justify-between mt-10">
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    data-testid={`testimonial-dot-${i}`}
                    onClick={() => goTo(i)}
                    className={`transition-all duration-300 rounded-full ${
                      i === current ? "w-8 h-2.5 bg-primary" : "w-2.5 h-2.5 bg-border hover:bg-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  data-testid="testimonial-prev"
                  onClick={prev}
                  className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  data-testid="testimonial-next"
                  onClick={next}
                  className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mini cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          {testimonials.map((t, i) => (
            <motion.button
              key={i}
              data-testid={`testimonial-mini-${i}`}
              onClick={() => goTo(i)}
              whileHover={{ scale: 1.03 }}
              className={`p-3 rounded-xl border transition-all duration-200 text-left ${
                i === current
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card hover:border-primary/20"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold mb-2`}>
                {t.initials}
              </div>
              <p className="text-xs font-semibold text-foreground truncate">{t.name}</p>
              <p className="text-[10px] text-muted-foreground">{t.location}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
