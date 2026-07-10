import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Sun, Menu, X, Phone, Sparkles, Award, Pill, Send, User,
  ChevronDown, ClipboardList, LogOut, UserCircle, Tag, ShoppingCart,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { useAnnouncement } from "@/context/AnnouncementContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useCart } from "@/context/CartContext";
import SignInModal from "@/components/customer/SignInModal";
import MyOrdersModal from "@/components/customer/MyOrdersModal";
import MyProfileModal from "@/components/customer/MyProfileModal";

/* ─────────────────────────────────────────────────────────────────────────────
   Nav data
───────────────────────────────────────────────────────────────────────────── */
const navLinks = [
  { label: "Home",         href: "#home" },
  { label: "About",        href: "#about" },
  { label: "Services",     href: "#services" },
  { label: "Categories",   href: "/categories" },  // ← dedicated page
  { label: "Why Us",       href: "#why-us" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact",      href: "#contact" },
];

const mobileQuickLinks = [
  { icon: Sparkles, label: "New Medicine Arrivals",       href: "#new-arrivals" },
  { icon: Award,    label: "Special Medicines",            href: "#special-medicines" },
  { icon: Pill,     label: "Check Medicine Availability",  href: "#medicine-search" },
  { icon: Send,     label: "Request a Medicine",           href: "#request-medicine" },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Logo
───────────────────────────────────────────────────────────────────────────── */
function Logo() {
  return (
    <a href="/" className="flex items-center gap-2.5 group flex-shrink-0">
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

/* ─────────────────────────────────────────────────────────────────────────────
   Header
───────────────────────────────────────────────────────────────────────────── */
export default function Header() {
  const { theme, setTheme }              = useTheme();
  const { enabled: announcementEnabled } = useAnnouncement();
  const { user, signOut }                = useCustomerAuth();
  const { summary, openCart }            = useCart();
  const [location, navigate]             = useLocation();

  const [scrolled,        setScrolled]        = useState(false);
  const [mobileOpen,      setMobileOpen]       = useState(false);
  const [accountMenuOpen, setAccountMenuOpen]  = useState(false);
  const [showSignIn,      setShowSignIn]       = useState(false);
  const [showMyOrders,    setShowMyOrders]     = useState(false);
  const [showMyProfile,   setShowMyProfile]    = useState(false);

  const accountRef = useRef<HTMLDivElement>(null);

  /* ── Scroll shadow ── */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* ── Click-outside closes account dropdown ── */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node))
        setAccountMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Escape key ── */
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setAccountMenuOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  /**
   * handleNav — route-aware navigation.
   * Anchor links (#…) scroll on the homepage; on other pages they navigate
   * to the homepage first. Page links (/…) always navigate directly.
   */
  const handleNav = (href: string) => {
    setMobileOpen(false);

    if (href.startsWith("/")) {
      navigate(href);
      return;
    }

    // Anchor link
    if (location !== "/") {
      navigate("/");
      // Give the homepage a moment to mount its sections before scrolling
      setTimeout(() => {
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } else {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const firstName = (user?.displayName || user?.email || "Account").split(/\s+/)[0];

  /* ── Is a link "active"? ── */
  const isActive = (href: string) =>
    href.startsWith("/") && location === href;

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          Sticky header
      ════════════════════════════════════════════════════════════════════ */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? "bg-background/85 backdrop-blur-xl border-b border-border shadow-sm"
            : "bg-transparent"
        }`}
      >
        <AnnouncementBanner />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20 gap-4">

            <Logo />

            {/* ── Desktop nav ──────────────────────────────────────────── */}
            <nav className="hidden md:flex items-center gap-0.5 lg:gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNav(link.href)}
                  data-testid={`nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
                              transition-all duration-200 ${
                    isActive(link.href)
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  {link.label === "Categories" && <Tag size={13} />}
                  {link.label}
                </button>
              ))}
            </nav>

            {/* ── Right actions ─────────────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-shrink-0">

              {/* Cart icon */}
              <button
                onClick={openCart}
                data-testid="header-cart-btn"
                aria-label="Open cart"
                className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-border
                           text-muted-foreground hover:text-primary hover:border-primary/30
                           hover:bg-primary/5 transition-all duration-200"
              >
                <ShoppingCart size={16} />
                {summary.itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1
                                   flex items-center justify-center rounded-full
                                   bg-primary text-white text-[10px] font-bold leading-none">
                    {summary.itemCount > 99 ? "99+" : summary.itemCount}
                  </span>
                )}
              </button>

              {/* Call Now */}
              <a
                href="tel:+919833273838"
                data-testid="header-call-btn"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold
                           text-white bg-primary hover:bg-primary/90 rounded-xl
                           shadow-sm shadow-primary/30 transition-all duration-200"
              >
                <Phone size={14} /> Call Now
              </a>

              {/* Account (desktop) */}
              <div className="relative hidden md:block" ref={accountRef}>
                {user ? (
                  <>
                    <button
                      onClick={() => setAccountMenuOpen((v) => !v)}
                      data-testid="button-my-account"
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium
                                 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5
                                 transition-all duration-200"
                    >
                      <User size={15} /> My Account <ChevronDown size={13} />
                    </button>
                    <AnimatePresence>
                      {accountMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.13 }}
                          className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-1.5 z-50"
                        >
                          <p className="px-3 py-1.5 text-xs text-muted-foreground truncate border-b border-border mb-1">
                            {firstName}
                          </p>
                          <button
                            onClick={() => { setShowMyOrders(true); setAccountMenuOpen(false); }}
                            data-testid="menu-my-orders"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm
                                       text-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                          >
                            <ClipboardList size={14} /> My Orders
                          </button>
                          <button
                            onClick={() => { setShowMyProfile(true); setAccountMenuOpen(false); }}
                            data-testid="menu-my-profile"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm
                                       text-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                          >
                            <UserCircle size={14} /> My Profile
                          </button>
                          <button
                            onClick={() => { signOut(); setAccountMenuOpen(false); }}
                            data-testid="menu-logout"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm
                                       text-destructive hover:bg-destructive/5 transition-colors"
                          >
                            <LogOut size={14} /> Logout
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <button
                    onClick={() => setShowSignIn(true)}
                    data-testid="button-sign-in"
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium
                               text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5
                               transition-all duration-200"
                  >
                    <User size={15} /> Sign In
                  </button>
                )}
              </div>

              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                data-testid="theme-toggle"
                aria-label="Toggle theme"
                className="flex items-center justify-center w-9 h-9 rounded-xl border border-border
                           text-muted-foreground hover:text-primary hover:border-primary/30
                           hover:bg-primary/5 transition-all duration-200"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* Hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                data-testid="mobile-menu-toggle"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl
                           border border-border text-muted-foreground"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ═══════════════════════════════════════════════════════════════════
          Mobile menu
      ════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className={`fixed ${
              announcementEnabled ? "top-28" : "top-16"
            } left-0 right-0 z-30 bg-background/97 backdrop-blur-xl
              border-b border-border shadow-lg md:hidden`}
          >
            <div className="px-4 py-4 flex flex-col gap-0.5 max-h-[calc(100vh-5rem)] overflow-y-auto">

              {/* ── Nav links ─────────────────────────────────────────── */}
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNav(link.href)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium
                              rounded-xl transition-all duration-200 ${
                    isActive(link.href)
                      ? "text-primary bg-primary/10"
                      : "text-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  {link.label === "Categories" && (
                    <Tag size={15} className="text-primary flex-shrink-0" />
                  )}
                  {link.label}
                </button>
              ))}

              {/* ── Quick access ──────────────────────────────────────── */}
              <div className="mt-3 pt-3 border-t border-border">
                <p className="px-4 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Quick Access
                </p>
                {mobileQuickLinks.map(({ icon: Icon, label, href }) => (
                  <button
                    key={label}
                    onClick={() => handleNav(href)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                               text-foreground hover:text-primary hover:bg-primary/5
                               rounded-xl transition-all duration-200"
                  >
                    <Icon size={15} className="text-primary flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Account ───────────────────────────────────────────── */}
              <div className="mt-3 pt-3 border-t border-border">
                {user ? (
                  <>
                    <p className="px-4 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {firstName}
                    </p>
                    <button
                      onClick={() => { setShowMyOrders(true); setMobileOpen(false); }}
                      data-testid="mobile-menu-my-orders"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                                 text-foreground hover:text-primary hover:bg-primary/5
                                 rounded-xl transition-all duration-200"
                    >
                      <ClipboardList size={15} className="text-primary flex-shrink-0" /> My Orders
                    </button>
                    <button
                      onClick={() => { setShowMyProfile(true); setMobileOpen(false); }}
                      data-testid="mobile-menu-my-profile"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                                 text-foreground hover:text-primary hover:bg-primary/5
                                 rounded-xl transition-all duration-200"
                    >
                      <UserCircle size={15} className="text-primary flex-shrink-0" /> My Profile
                    </button>
                    <button
                      onClick={() => { signOut(); setMobileOpen(false); }}
                      data-testid="mobile-menu-logout"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                                 text-destructive hover:bg-destructive/5
                                 rounded-xl transition-all duration-200"
                    >
                      <LogOut size={15} className="flex-shrink-0" /> Logout
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setShowSignIn(true); setMobileOpen(false); }}
                    data-testid="mobile-menu-sign-in"
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                               text-foreground hover:text-primary hover:bg-primary/5
                               rounded-xl transition-all duration-200"
                  >
                    <User size={15} className="text-primary flex-shrink-0" /> Sign In
                  </button>
                )}
              </div>

              {/* Call CTA */}
              <a
                href="tel:+919833273838"
                className="mt-3 flex items-center justify-center gap-2 px-4 py-3
                           text-sm font-semibold text-white bg-primary hover:bg-primary/90
                           rounded-xl transition-all duration-200"
              >
                <Phone size={14} /> Call +91 98332 73838
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showSignIn    && <SignInModal    onClose={() => setShowSignIn(false)} />}
      {showMyOrders  && <MyOrdersModal  onClose={() => setShowMyOrders(false)} />}
      {showMyProfile && <MyProfileModal onClose={() => setShowMyProfile(false)} />}
    </>
  );
}
