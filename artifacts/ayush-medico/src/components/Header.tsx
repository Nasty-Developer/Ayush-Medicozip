import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, Menu, X, Phone, Sparkles, Award, Pill, Send } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { announcementConfig } from "@/config/announcement";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Products", href: "#categories" },
  { label: "Why Us", href: "#why-us" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
];

// Extra quick-access items shown only in the mobile hamburger menu
const mobileQuickLinks = [
  { icon: Sparkles, label: "New Medicine Arrivals", href: "#new-arrivals" },
  { icon: Award, label: "Special Medicines", href: "#special-medicines" },
  { icon: Pill, label: "Check Medicine Availability", href: "#medicine-search" },
  { icon: Send, label: "Request a Medicine", href: "#request-medicine" },
];

function Logo() {
  return (
    <a href="#home" className="flex items-center gap-2.5 group">
      <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-md shadow-primary/25 group-hover:shadow-primary/40 transition-shadow duration-300">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="8" y="2" width="6" height="18" rx="2" fill="white" />
          <rect x="2" y="8" width="18" height="6" rx="2" fill="white" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Ayush <span className="text-primary">Medico</span>
        </span>
        <span className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">Kurla West</span>
      </div>
    </a>
  );
}

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-sm"
            : "bg-transparent"
        }`}
      >
        <AnnouncementBanner />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Logo />

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  data-testid={`nav-link-${link.label.toLowerCase()}`}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5 transition-all duration-200"
                >
                  {link.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <a
                href="tel:+919833273838"
                data-testid="header-call-btn"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-sm shadow-primary/30 transition-all duration-200"
              >
                <Phone size={14} />
                Call Now
              </a>

              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                data-testid="theme-toggle"
                className="flex items-center justify-center w-9 h-9 rounded-xl border border-border text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                data-testid="mobile-menu-toggle"
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-border text-muted-foreground"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className={`fixed ${
              announcementConfig.enabled ? "top-28" : "top-16"
            } left-0 right-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border shadow-lg md:hidden`}
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-200"
                >
                  {link.label}
                </button>
              ))}

              {/* Quick-access section */}
              <div className="mt-3 pt-3 border-t border-border">
                <p className="px-4 pb-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Quick Access
                </p>
                {mobileQuickLinks.map(({ icon: Icon, label, href }) => (
                  <button
                    key={label}
                    onClick={() => scrollTo(href)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-200"
                  >
                    <Icon size={15} className="text-primary flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </div>

              <a
                href="tel:+919833273838"
                className="mt-3 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl transition-all duration-200"
              >
                <Phone size={14} /> Call +91 98332 73838
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
