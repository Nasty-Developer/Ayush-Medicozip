import { motion } from "framer-motion";
import { Phone, MapPin, MessageCircle, ShieldCheck, Clock, Star } from "lucide-react";
import MedicineSearch from "@/components/MedicineSearch";
import PWAInstallButtons from "@/components/PWAInstallButtons";
import { useAnnouncement } from "@/context/AnnouncementContext";

const floatingPills = [
  { color: "from-primary/20 to-primary/10", size: "w-16 h-6", top: "15%", left: "8%", delay: 0, rotate: -20 },
  { color: "from-secondary/20 to-secondary/10", size: "w-20 h-7", top: "25%", right: "6%", delay: 0.5, rotate: 15 },
  { color: "from-accent/20 to-accent/10", size: "w-12 h-5", top: "60%", left: "5%", delay: 1, rotate: 30 },
  { color: "from-primary/15 to-secondary/15", size: "w-14 h-5", bottom: "20%", right: "8%", delay: 1.5, rotate: -10 },
  { color: "from-secondary/20 to-accent/10", size: "w-10 h-4", top: "40%", right: "12%", delay: 0.8, rotate: 5 },
];

const statCards = [
  { icon: ShieldCheck, value: "100%", label: "Genuine Medicines", color: "text-primary" },
  { icon: Clock, value: "10+", label: "Years of Trust", color: "text-secondary" },
  { icon: Star, value: "50K+", label: "Happy Customers", color: "text-accent" },
];

export default function Hero() {
  const { enabled: announcementEnabled } = useAnnouncement();

  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      className={`relative min-h-screen flex items-center overflow-hidden ${
        announcementEnabled ? "pt-36" : "pt-20"
      }`}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-primary/10 via-accent/5 to-transparent blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-secondary/10 to-transparent blur-3xl" />

      {/* Floating pills */}
      {floatingPills.map((pill, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full bg-gradient-to-r ${pill.color} ${pill.size} hidden lg:block`}
          style={{
            top: pill.top,
            left: (pill as any).left,
            right: (pill as any).right,
            bottom: (pill as any).bottom,
            rotate: pill.rotate,
          }}
          animate={{ y: [0, -14, 0], rotate: [pill.rotate, pill.rotate + 5, pill.rotate] }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: pill.delay, ease: "easeInOut" }}
        />
      ))}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Trusted Pharmacy in Kurla West
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-foreground mb-6"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Your Trusted{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Medical Store
              </span>{" "}
              in Kurla West
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg"
            >
              Fast medicine availability, genuine medicines, healthcare essentials, friendly service and trusted support — right here in your neighborhood.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-3"
            >
              <a
                href="tel:+919833273838"
                data-testid="hero-call-btn"
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-200"
              >
                <Phone size={18} />
                Call Now
              </a>
              <a
                href="https://maps.google.com/?q=Shop+No+67,+Halav+Pool+Rd,+Makad+Wala+Chawl,+Kurla+West,+Mumbai"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="hero-directions-btn"
                className="flex items-center gap-2 px-6 py-3 bg-secondary text-white font-semibold rounded-xl shadow-lg shadow-secondary/30 hover:bg-secondary/90 hover:-translate-y-0.5 transition-all duration-200"
              >
                <MapPin size={18} />
                Get Directions
              </a>
              <a
                href="https://wa.me/919833273838"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="hero-whatsapp-btn"
                className="flex items-center gap-2 px-6 py-3 bg-card text-foreground font-semibold rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 hover:-translate-y-0.5 transition-all duration-200"
              >
                <MessageCircle size={18} className="text-[#25D366]" />
                WhatsApp
              </a>
            </motion.div>

            {/* PWA Install & APK Download Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-1"
            >
              <PWAInstallButtons />
            </motion.div>

            {/* Quick Medicine Search */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8"
            >
              <MedicineSearch />
            </motion.div>

            {/* Stat Row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap gap-6 mt-10 pt-8 border-t border-border"
            >
              {statCards.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-current/10`} style={{ color: "transparent" }}>
                    <s.icon size={20} className={s.color} />
                  </div>
                  <div>
                    <p className={`text-xl font-bold ${s.color}`} style={{ fontFamily: "'Poppins', sans-serif" }}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden lg:block relative"
          >
            <div className="relative w-full aspect-square max-w-[480px] mx-auto">
              {/* Large glow */}
              <div className="absolute inset-8 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 blur-2xl" />

              {/* Main card */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 via-card to-secondary/5 border border-border backdrop-blur-sm overflow-hidden shadow-2xl shadow-primary/10">
                {/* Inner cross pattern */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    <div className="absolute inset-y-8 left-1/2 -translate-x-1/2 w-16 rounded-2xl bg-gradient-to-b from-primary to-secondary opacity-20" />
                    <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-16 rounded-2xl bg-gradient-to-r from-primary to-secondary opacity-20" />
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute inset-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-xl shadow-primary/40"
                    >
                      <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                        <rect x="18" y="4" width="16" height="44" rx="5" fill="white" />
                        <rect x="4" y="18" width="44" height="16" rx="5" fill="white" />
                      </svg>
                    </motion.div>
                  </div>
                </div>

                {/* Floating glass cards */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-6 right-6 bg-background/80 backdrop-blur-sm border border-border rounded-2xl px-4 py-3 shadow-lg"
                >
                  <p className="text-xs text-muted-foreground">Customer Rating</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map(n => <Star key={n} size={12} className="text-yellow-400 fill-yellow-400" />)}
                  </div>
                  <p className="text-sm font-bold text-foreground mt-1">4.9 / 5.0</p>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute bottom-6 left-6 bg-background/80 backdrop-blur-sm border border-border rounded-2xl px-4 py-3 shadow-lg"
                >
                  <p className="text-xs text-muted-foreground">Medicines Available</p>
                  <p className="text-2xl font-bold text-primary mt-1" style={{ fontFamily: "'Poppins', sans-serif" }}>5,000+</p>
                </motion.div>

                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute bottom-8 right-8 bg-secondary/90 rounded-xl px-3 py-2 shadow-lg"
                >
                  <p className="text-xs text-white font-semibold">Open Today</p>
                  <p className="text-sm text-white/80">8am – 10pm</p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.button
          onClick={() => scrollTo("#about")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 8, 0] }}
          transition={{ opacity: { delay: 1 }, y: { duration: 1.8, repeat: Infinity } }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
        >
          <span className="text-xs font-medium">Scroll down</span>
          <div className="w-5 h-8 rounded-full border-2 border-current flex items-start justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-current" />
          </div>
        </motion.button>
      </div>
    </section>
  );
}
