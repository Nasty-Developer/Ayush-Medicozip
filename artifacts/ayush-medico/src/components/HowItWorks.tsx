import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Search, LogIn, FileImage, Send, ClipboardCheck, CreditCard, CheckCircle2, Package } from "lucide-react";

const steps = [
  { icon: Search,        title: "Search Medicine",     description: "Browse our 5,000+ catalogue or type the medicine name to check availability.", color: "from-primary to-blue-600",       num: "01" },
  { icon: LogIn,         title: "Sign In",             description: "Quick sign-in with your phone or email — takes under 30 seconds.",             color: "from-violet-500 to-purple-600",   num: "02" },
  { icon: FileImage,     title: "Upload Prescription", description: "Click a photo or upload a PDF of your doctor's prescription.",                 color: "from-blue-500 to-cyan-500",       num: "03" },
  { icon: Send,          title: "Submit Request",      description: "Confirm your delivery address and submit. We take it from here.",               color: "from-cyan-500 to-teal-500",       num: "04" },
  { icon: ClipboardCheck,title: "Pharmacist Verifies", description: "Our licensed pharmacist reviews the prescription and confirms availability.",   color: "from-amber-500 to-orange-500",    num: "05" },
  { icon: CreditCard,    title: "Secure Payment",      description: "Pay via UPI, card, or Cash on Delivery — your choice.",                        color: "from-orange-500 to-rose-500",     num: "06" },
  { icon: CheckCircle2,  title: "Order Confirmed",     description: "You'll receive an instant confirmation on WhatsApp.",                           color: "from-emerald-500 to-green-600",   num: "07" },
  { icon: Package,       title: "Delivered Fast",      description: "Your medicines arrive at your doorstep — same day if ordered before 6 PM.",   color: "from-secondary to-emerald-600",   num: "08" },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px" });

  return (
    <section ref={ref} id="how-it-works" className="py-20 lg:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ y: 24 }}
          animate={inView ? { y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-4">
            <ClipboardCheck size={14} />
            Simple Process
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            How It{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Works
            </span>
          </h2>
          <p className="text-muted-foreground text-base lg:text-lg max-w-lg mx-auto">
            From searching to delivery — 8 simple steps to get your medicines.
          </p>
        </motion.div>

        {/* Steps — two rows of 4 */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {steps.slice(0, 4).map((step, i) => (
            <StepCard key={step.title} step={step} index={i} inView={inView} />
          ))}
        </div>

        {/* Connector arrow between rows */}
        <div className="hidden lg:flex justify-end pr-6 my-0 -translate-y-2">
          <div className="flex items-center gap-2 text-muted-foreground/40">
            <div className="w-32 h-px bg-gradient-to-l from-secondary/40 to-transparent" />
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 18L0.339746 0.75L17.6603 0.75L9 18Z" fill="currentColor" />
            </svg>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.slice(4).map((step, i) => (
            <StepCard key={step.title} step={step} index={i + 4} inView={inView} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ y: 16 }}
          animate={inView ? { y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-14 text-center"
        >
          <a
            href="#request-medicine"
            onClick={e => { e.preventDefault(); document.getElementById("request-medicine")?.scrollIntoView({ behavior: "smooth" }); }}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all duration-200"
          >
            Start Your Order Now →
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function StepCard({ step, index, inView }: { step: typeof steps[0]; index: number; inView: boolean }) {
  const isEven = index % 2 === 0;
  return (
    <motion.div
      initial={{ y: 20 }}
      animate={inView ? { y: 0 } : {}}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="group relative flex flex-col gap-4 p-6 rounded-2xl border border-border bg-card shadow-sm hover:shadow-xl hover:shadow-primary/8 hover:-translate-y-1.5 hover:border-primary/20 transition-all duration-300"
    >
      {/* Step number — watermark */}
      <span
        className="absolute top-4 right-5 text-5xl font-black text-muted-foreground/8 leading-none select-none pointer-events-none"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        {step.num}
      </span>

      {/* Icon */}
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        <step.icon size={24} className="text-white" />
      </div>

      {/* Content */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Step {step.num}</span>
        </div>
        <p className="text-sm font-bold text-foreground mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
          {step.title}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
      </div>

      {/* Connector dot on desktop */}
      {index % 4 !== 3 && (
        <div className="hidden lg:block absolute top-[3.5rem] -right-3 w-6 h-6 rounded-full border-2 border-border bg-card z-10 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-primary/40" />
        </div>
      )}
    </motion.div>
  );
}
