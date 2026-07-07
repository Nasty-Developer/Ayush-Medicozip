import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Search, LogIn, FileImage, Send, ClipboardCheck, CreditCard, CheckCircle2, Package } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Search Medicine",
    description: "Type your medicine name. We'll show you what's available.",
    color: "from-primary to-primary/80",
  },
  {
    icon: LogIn,
    title: "Login / Sign Up",
    description: "Sign in with your phone or email to place a request.",
    color: "from-violet-500 to-violet-400",
  },
  {
    icon: FileImage,
    title: "Upload Prescription",
    description: "Take a photo or upload a PDF of your doctor's prescription.",
    color: "from-blue-500 to-blue-400",
  },
  {
    icon: Send,
    title: "Submit Request",
    description: "Confirm your delivery address and submit the request.",
    color: "from-cyan-500 to-cyan-400",
  },
  {
    icon: ClipboardCheck,
    title: "Admin Verifies",
    description: "Our pharmacist checks the prescription and medicine availability.",
    color: "from-amber-500 to-amber-400",
  },
  {
    icon: CreditCard,
    title: "Payment Link",
    description: "You receive a secure payment link via WhatsApp.",
    color: "from-orange-500 to-orange-400",
  },
  {
    icon: CheckCircle2,
    title: "Payment Success",
    description: "Complete payment and your order is confirmed instantly.",
    color: "from-emerald-500 to-emerald-400",
  },
  {
    icon: Package,
    title: "Medicine Delivered",
    description: "Your medicines arrive at your doorstep, same day.",
    color: "from-secondary to-secondary/80",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} id="how-it-works" className="py-16 lg:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-4">
            <ClipboardCheck size={14} />
            Simple Process
          </div>
          <h2
            className="text-3xl sm:text-4xl font-bold text-foreground mb-3"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            How It{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Works
            </span>
          </h2>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            From searching your medicine to getting it delivered — here's the complete journey.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="relative"
            >
              {/* Connector line (desktop, horizontal) */}
              {i % 4 !== 3 && (
                <div className="hidden lg:block absolute top-7 left-[calc(100%-8px)] w-full h-px bg-gradient-to-r from-border to-transparent z-0 pointer-events-none" />
              )}

              <div className="relative z-10 flex flex-col items-start gap-4 p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                {/* Step number badge + icon */}
                <div className="flex items-center gap-3 w-full">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-md flex-shrink-0`}>
                    <step.icon size={22} className="text-white" />
                  </div>
                  <span className="text-3xl font-black text-muted-foreground/20 leading-none" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">{step.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>

              {/* Arrow between steps on mobile */}
              {i < steps.length - 1 && (
                <div className="lg:hidden flex justify-center my-1 text-muted-foreground/30">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 12L2 6h12L8 12z" />
                  </svg>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
