import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Sun, Menu, X, Phone, Pill, Send, User,
  ChevronDown, ClipboardList, LogOut, UserCircle, Tag, ShoppingCart,
  Info, Wrench, Truck, HelpCircle, Mail, ShieldCheck, FileText,
  MessageCircle, Home, ChevronRight, Package,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { useAnnouncement } from "@/context/AnnouncementContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/hooks/use-toast";
import SignInModal from "@/components/customer/SignInModal";
import MyOrdersModal from "@/components/customer/MyOrdersModal";
import MyProfileModal from "@/components/customer/MyProfileModal";

/* ─────────────────────────────────────────────────────────────────────────────
   Nav data
───────────────────────────────────────────────────────────────────────────── */

/** Primary desktop nav — lean, page-based links */
const desktopNav = [
  { label: "Home",       href: "/",           icon: Home },
  { label: "Categories", href: "/categories", icon: Tag },
  { label: "About",      href: "/about",      icon: Info },
  { label: "Services",   href: "/services",   icon: Wrench },
  { label: "Contact",    href: "/contact",    icon: Mail },
];

/** Sidebar sections for mobile drawer */
const sidebarSections = [
  {
    heading: "Navigate",
    links: [
      { icon: Home,       label: "Home",              href: "/" },
      { icon: Tag,        label: "Medicine Categories",href: "/categories" },
      { icon: Info,       label: "About Us",           href: "/about" },
      { icon: Wrench,     label: "Our Services",       href: "/services" },
      { icon: Truck,      label: "Delivery & How It Works", href: "/delivery" },
      { icon: HelpCircle, label: "FAQ",                href: "/faq" },
      { icon: Mail,       label: "Contact Us",         href: "/contact" },
    ],
  },
  {
    heading: "Quick Actions",
    links: [
      { icon: Pill,    label: "Request a Medicine",   href: "/request-medicine" },
      { icon: Send,    label: "General Inquiry",      href: "/inquiry" },
      { icon: Package, label: "Explore All Medicines", href: "/categories" },
    ],
  },
  {
    heading: "Compliance & Legal",
    links: [
      { icon: ShieldCheck, label: "Trust & Compliance",   href: "/compliance" },
      { icon: FileText,    label: "Privacy Policy",       href: "/privacy-policy" },
      { icon: FileText,    label: "Terms & Conditions",   href: "/terms-conditions" },
      { icon: FileText,    label: "Refund Policy",        href: "/refund-policy" },
      { icon: FileText,    label: "Shipping Policy",      href: "/shipping-policy" },
      { icon: FileText,    label: "Prescription Policy",  href: "/prescription-policy" },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Logo
───────────────────────────────────────────────────────────────────────────── */
function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
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
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Header
───────────────────────────────────────────────────────────────────────────── */
export default function Header() {
  const { theme, setTheme }                                   = useTheme();
  const { enabled: announcementEnabled }                      = useAnnouncement();
  const { user, signOut, redirectError, clearRedirectError }  = useCustomerAuth();
  const { summary, openCart }                                 = useCart();
  const [location]                                            = useLocation();
  const { toast }                                             = useToast();

  const [scrolled,        setScrolled]        = useState(false);
  const [mobileOpen,      setMobileOpen]       = useState(false);
  const [accountMenuOpen, setAccountMenuOpen]  = useState(false);
  const [showSignIn,      setShowSignIn]       = useState(false);
  const [showMyOrders,    setShowMyOrders]     = useState(false);
  const [showMyProfile,   setShowMyProfile]    = useState(false);

  const accountRef = useRef<HTMLDivElement>(null);

  /* ── Surface redirect-based sign-in errors as a toast ── */
  useEffect(() => {
    if (!redirectError) return;
    toast({ variant: "destructive", title: "Sign in failed", description: redirectError });
    clearRedirectError();
  }, [redirectError, toast, clearRedirectError]);

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
      if (e.key === "Escape") { setAccountMenuOpen(false); setMobileOpen(false); }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  /* ── Lock body scroll when sidebar is open ── */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const firstName = (user?.displayName || user?.email || "Account").split(/\s+/)[0];
  const isActive  = (href: string) => href === "/" ? location === "/" : location.startsWith(href);

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
              {desktopNav.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
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
                </Link>
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
                className="flex items-center justify-center w-9 h-9 rounded-xl
                           border border-border text-muted-foreground hover:text-primary
                           hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ═══════════════════════════════════════════════════════════════════
          Mobile sidebar drawer (slides in from the right)
      ════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            {/* Sidebar panel */}
            <motion.aside
              key="sidebar"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[90vw]
                         bg-background border-l border-border shadow-2xl flex flex-col"
            >
              {/* Sidebar header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                <Logo />
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="flex items-center justify-center w-9 h-9 rounded-xl border border-border
                             text-muted-foreground hover:text-primary hover:border-primary/30
                             hover:bg-primary/5 transition-all duration-200"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable nav sections */}
              <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                {sidebarSections.map((section) => (
                  <div key={section.heading}>
                    <p className="px-2 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {section.heading}
                    </p>
                    <div className="space-y-0.5">
                      {section.links.map(({ icon: Icon, label, href }) => (
                        <Link
                          key={label}
                          href={href}
                          onClick={() => setMobileOpen(false)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium
                                      rounded-xl transition-all duration-200 ${
                            isActive(href)
                              ? "text-primary bg-primary/10"
                              : "text-foreground hover:text-primary hover:bg-primary/5"
                          }`}
                        >
                          <Icon size={15} className="text-primary flex-shrink-0" />
                          <span className="flex-1">{label}</span>
                          <ChevronRight size={13} className="text-muted-foreground/50" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Account section */}
                <div>
                  <p className="px-2 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Account
                  </p>
                  {user ? (
                    <div className="space-y-0.5">
                      <p className="px-3 py-1.5 text-xs text-muted-foreground truncate">{firstName}</p>
                      <button
                        onClick={() => { setShowMyOrders(true); setMobileOpen(false); }}
                        data-testid="mobile-menu-my-orders"
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium
                                   text-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-200"
                      >
                        <ClipboardList size={15} className="text-primary flex-shrink-0" />
                        <span className="flex-1">My Orders</span>
                        <ChevronRight size={13} className="text-muted-foreground/50" />
                      </button>
                      <button
                        onClick={() => { setShowMyProfile(true); setMobileOpen(false); }}
                        data-testid="mobile-menu-my-profile"
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium
                                   text-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-200"
                      >
                        <UserCircle size={15} className="text-primary flex-shrink-0" />
                        <span className="flex-1">My Profile</span>
                        <ChevronRight size={13} className="text-muted-foreground/50" />
                      </button>
                      <button
                        onClick={() => { signOut(); setMobileOpen(false); }}
                        data-testid="mobile-menu-logout"
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium
                                   text-destructive hover:bg-destructive/5 rounded-xl transition-all duration-200"
                      >
                        <LogOut size={15} className="flex-shrink-0" />
                        <span className="flex-1">Logout</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setShowSignIn(true); setMobileOpen(false); }}
                      data-testid="mobile-menu-sign-in"
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium
                                 text-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-200"
                    >
                      <User size={15} className="text-primary flex-shrink-0" />
                      <span className="flex-1">Sign In</span>
                      <ChevronRight size={13} className="text-muted-foreground/50" />
                    </button>
                  )}
                </div>
              </nav>

              {/* Sidebar footer — Call CTA */}
              <div className="flex-shrink-0 px-5 py-4 border-t border-border space-y-2">
                <a
                  href="tel:+919833273838"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3
                             text-sm font-semibold text-white bg-primary hover:bg-primary/90
                             rounded-xl transition-all duration-200 shadow-sm shadow-primary/30"
                >
                  <Phone size={15} /> Call +91 98332 73838
                </a>
                <a
                  href="https://wa.me/919833273838"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3
                             text-sm font-semibold text-white bg-[#25D366] hover:bg-[#128C7E]
                             rounded-xl transition-all duration-200"
                >
                  <MessageCircle size={15} /> WhatsApp Us
                </a>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {showSignIn    && <SignInModal    onClose={() => setShowSignIn(false)} />}
      {showMyOrders  && <MyOrdersModal  onClose={() => setShowMyOrders(false)} />}
      {showMyProfile && <MyProfileModal onClose={() => setShowMyProfile(false)} />}
    </>
  );
}
