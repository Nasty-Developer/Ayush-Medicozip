import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Sun, Menu, X, Phone, Sparkles, Award, Pill, Send, User,
  ChevronDown, ClipboardList, LogOut, UserCircle,
  Tag, AlertCircle, Loader2, ArrowRight,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { useAnnouncement } from "@/context/AnnouncementContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import SignInModal from "@/components/customer/SignInModal";
import MyOrdersModal from "@/components/customer/MyOrdersModal";
import MyProfileModal from "@/components/customer/MyProfileModal";
import { useCategories, type Category } from "@/hooks/useCategories";
import { useMedicineCounts } from "@/hooks/useMedicineCounts";

/* ─────────────────────────────────────────────────────────────────────────────
   Static nav data
───────────────────────────────────────────────────────────────────────────── */
const navLinks = [
  { label: "Home",         href: "#home" },
  { label: "About",        href: "#about" },
  { label: "Services",     href: "#services" },
  { label: "Categories",   href: "#categories" },   // ← live Firestore dropdown
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
    <a href="#home" className="flex items-center gap-2.5 group flex-shrink-0">
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
   Premium Categories Dropdown Body
   Separated to avoid conditional-hook risk inside the map().
   Receives pre-fetched data; renders three states: loading / error / content.
───────────────────────────────────────────────────────────────────────────── */
function CategoryDropdownBody({
  categories,
  loading,
  error,
  counts,
  onSelect,
}: {
  categories: Category[];
  loading: boolean;
  error: string | null;
  counts: Record<string, number>;
  onSelect: () => void;
}) {
  // ≥ 5 categories → 2-column grid; fewer → single column list
  const twoCol = categories.length >= 5;

  return (
    <div className="flex flex-col">

      {/* ── Panel header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/60">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Medicine Categories
          </p>
          {!loading && !error && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {categories.length > 0
                ? `${categories.length} categor${categories.length === 1 ? "y" : "ies"} available`
                : "No categories published yet"}
            </p>
          )}
        </div>
        <button
          onClick={onSelect}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          View all <ArrowRight size={11} />
        </button>
      </div>

      {/* ── Loading — skeleton grid ───────────────────────────────────── */}
      {loading && (
        <div className={`p-3 grid gap-1.5 ${twoCol ? "grid-cols-2" : "grid-cols-1"}`}>
          {Array.from({ length: twoCol ? 4 : 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-muted animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted animate-pulse rounded w-4/5" />
                <div className="h-2.5 bg-muted animate-pulse rounded w-3/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Firestore error ───────────────────────────────────────────── */}
      {!loading && error && (
        <div className="flex items-start gap-2.5 px-5 py-4 text-sm text-destructive">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Could not load categories</p>
            <p className="text-xs text-muted-foreground mt-0.5">Check your connection or Firestore Security Rules.</p>
          </div>
        </div>
      )}

      {/* ── Empty ────────────────────────────────────────────────────── */}
      {!loading && !error && categories.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-5 py-6 text-center">
          <Tag size={20} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No categories published yet.</p>
          <p className="text-xs text-muted-foreground/60">Add categories in the Admin Panel.</p>
        </div>
      )}

      {/* ── Category grid ─────────────────────────────────────────────── */}
      {!loading && !error && categories.length > 0 && (
        <div
          className={`p-3 grid gap-1.5 overflow-y-auto ${twoCol ? "grid-cols-2" : "grid-cols-1"}`}
          style={{ maxHeight: "min(320px, 60vh)" }}
        >
          {categories.map((cat, i) => {
            const count = counts[cat.name];
            return (
              <motion.button
                key={cat.id}
                onClick={onSelect}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: i * 0.04 }}
                whileHover={{ y: -1 }}
                data-testid={`nav-category-${cat.slug ?? cat.id}`}
                className="group flex items-center gap-3 p-3 rounded-xl text-left
                           border border-transparent
                           hover:bg-primary/5 hover:border-primary/10
                           transition-all duration-200"
              >
                {/* Emoji icon in a coloured bubble */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center
                              text-xl leading-none flex-shrink-0
                              bg-muted group-hover:bg-primary/10
                              transition-colors duration-200"
                  role="img"
                  aria-label={cat.name}
                >
                  {cat.icon || "💊"}
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary
                                truncate transition-colors duration-150 leading-snug">
                    {cat.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
                    {count !== undefined
                      ? `${count} medicine${count !== 1 ? "s" : ""}`
                      : cat.description
                        ? cat.description.slice(0, 28) + (cat.description.length > 28 ? "…" : "")
                        : "View medicines"}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* ── Footer "Browse all" ───────────────────────────────────────── */}
      {!loading && !error && categories.length > 0 && (
        <div className="px-4 pt-1 pb-3 border-t border-border/60">
          <button
            onClick={onSelect}
            className="w-full flex items-center justify-center gap-2
                       py-2.5 rounded-xl text-sm font-semibold text-primary
                       hover:bg-primary/5 transition-colors duration-200"
          >
            Browse all {categories.length} categories
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Header
───────────────────────────────────────────────────────────────────────────── */
export default function Header() {
  const { theme, setTheme }              = useTheme();
  const { enabled: announcementEnabled } = useAnnouncement();
  const { user, signOut }                = useCustomerAuth();

  // ── Data: live from Firestore, real-time ──────────────────────────────────
  const { categories, loading: catsLoading, error: catsError } = useCategories(true);
  const medicineCounts = useMedicineCounts();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [scrolled,           setScrolled]          = useState(false);
  const [mobileOpen,         setMobileOpen]         = useState(false);
  const [accountMenuOpen,    setAccountMenuOpen]    = useState(false);
  const [categoriesOpen,     setCategoriesOpen]     = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [showSignIn,         setShowSignIn]         = useState(false);
  const [showMyOrders,       setShowMyOrders]       = useState(false);
  const [showMyProfile,      setShowMyProfile]      = useState(false);

  const categoriesRef = useRef<HTMLDivElement>(null);
  const accountRef    = useRef<HTMLDivElement>(null);

  // ── Scroll shadow ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // ── Click-outside closes dropdowns ────────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (categoriesRef.current && !categoriesRef.current.contains(e.target as Node))
        setCategoriesOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node))
        setAccountMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Keyboard: Escape closes open dropdowns ────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCategoriesOpen(false);
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const scrollTo = (href: string) => {
    setMobileOpen(false);
    setCategoriesOpen(false);
    setCategoriesExpanded(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const firstName = (user?.displayName || user?.email || "Account").split(/\s+/)[0];

  // Dropdown panel width: wider when we'll use 2 columns
  const dropdownWide = categories.length >= 5;

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          Desktop + sticky header
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
              {navLinks.map((link) => {

                /* ── Categories — premium dropdown ── */
                if (link.label === "Categories") {
                  return (
                    <div key="Categories" className="relative" ref={categoriesRef}>

                      {/* Trigger */}
                      <button
                        onClick={() => setCategoriesOpen((v) => !v)}
                        data-testid="nav-link-categories"
                        aria-haspopup="listbox"
                        aria-expanded={categoriesOpen}
                        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg
                                    transition-all duration-200 select-none ${
                          categoriesOpen
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                        }`}
                      >
                        Categories
                        <ChevronDown
                          size={13}
                          className={`transition-transform duration-200 flex-shrink-0 ${categoriesOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Dropdown panel */}
                      <AnimatePresence>
                        {categoriesOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ duration: 0.14, ease: "easeOut" }}
                            className={`absolute left-0 top-full mt-2.5 z-50
                                        bg-card border border-border rounded-2xl
                                        shadow-2xl shadow-black/10
                                        overflow-hidden ${dropdownWide ? "w-[480px]" : "w-[300px]"}`}
                          >
                            <CategoryDropdownBody
                              categories={categories}
                              loading={catsLoading}
                              error={catsError}
                              counts={medicineCounts}
                              onSelect={() => scrollTo("#categories")}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                /* ── All other nav links ── */
                return (
                  <button
                    key={link.label}
                    onClick={() => scrollTo(link.href)}
                    data-testid={`nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="px-3 py-2 text-sm font-medium text-muted-foreground
                               hover:text-primary rounded-lg hover:bg-primary/5
                               transition-all duration-200"
                  >
                    {link.label}
                  </button>
                );
              })}
            </nav>

            {/* ── Right actions ─────────────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-shrink-0">

              {/* Call Now */}
              <a
                href="tel:+919833273838"
                data-testid="header-call-btn"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold
                           text-white bg-primary hover:bg-primary/90 rounded-xl
                           shadow-sm shadow-primary/30 transition-all duration-200"
              >
                <Phone size={14} />
                Call Now
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
                className="flex items-center justify-center w-9 h-9 rounded-xl border border-border
                           text-muted-foreground hover:text-primary hover:border-primary/30
                           hover:bg-primary/5 transition-all duration-200"
                aria-label="Toggle theme"
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
              {navLinks.map((link) => {

                if (link.label === "Categories") {
                  return (
                    <div key="Categories">
                      {/* Accordion trigger */}
                      <button
                        onClick={() => setCategoriesExpanded((v) => !v)}
                        aria-expanded={categoriesExpanded}
                        aria-controls="mobile-categories-menu"
                        className="w-full flex items-center justify-between px-4 py-3
                                   text-sm font-medium text-foreground hover:text-primary
                                   hover:bg-primary/5 rounded-xl transition-all duration-200"
                      >
                        <span className="flex items-center gap-2">
                          <Tag size={15} className="text-primary" />
                          Categories
                          {!catsLoading && categories.length > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                              {categories.length}
                            </span>
                          )}
                          {catsLoading && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
                        </span>
                        <ChevronDown
                          size={14}
                          className={`text-muted-foreground transition-transform duration-200 ${categoriesExpanded ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Accordion body */}
                      <AnimatePresence>
                        {categoriesExpanded && (
                          <motion.div
                            id="mobile-categories-menu"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-1 pb-2 pl-4 pr-2 space-y-0.5">

                              {/* View all */}
                              <button
                                onClick={() => scrollTo("#categories")}
                                className="w-full flex items-center gap-3 px-4 py-2.5
                                           text-sm font-semibold text-primary hover:bg-primary/5
                                           rounded-xl transition-colors"
                              >
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Tag size={13} className="text-primary" />
                                </div>
                                All Categories
                                <ArrowRight size={13} className="ml-auto" />
                              </button>

                              {/* Error */}
                              {!catsLoading && catsError && (
                                <div className="flex items-center gap-2 px-4 py-2 text-xs text-destructive">
                                  <AlertCircle size={12} />
                                  Could not load categories
                                </div>
                              )}

                              {/* Empty */}
                              {!catsLoading && !catsError && categories.length === 0 && (
                                <p className="px-4 py-2 text-xs text-muted-foreground">
                                  No categories published yet
                                </p>
                              )}

                              {/* Category list */}
                              {!catsLoading && !catsError && categories.map((cat) => {
                                const count = medicineCounts[cat.name];
                                return (
                                  <button
                                    key={cat.id}
                                    onClick={() => scrollTo("#categories")}
                                    className="w-full flex items-center gap-3 px-4 py-2.5
                                               text-sm text-foreground hover:text-primary
                                               hover:bg-primary/5 rounded-xl transition-all duration-200 group"
                                  >
                                    <span
                                      className="w-8 h-8 rounded-lg bg-muted group-hover:bg-primary/10
                                                 flex items-center justify-center text-lg leading-none flex-shrink-0
                                                 transition-colors"
                                      role="img"
                                      aria-label={cat.name}
                                    >
                                      {cat.icon || "💊"}
                                    </span>
                                    <span className="flex-1 text-left min-w-0">
                                      <span className="block truncate font-medium">{cat.name}</span>
                                      {count !== undefined && (
                                        <span className="block text-[11px] text-muted-foreground">
                                          {count} medicine{count !== 1 ? "s" : ""}
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                return (
                  <button
                    key={link.label}
                    onClick={() => scrollTo(link.href)}
                    className="w-full text-left px-4 py-3 text-sm font-medium
                               text-foreground hover:text-primary hover:bg-primary/5
                               rounded-xl transition-all duration-200"
                  >
                    {link.label}
                  </button>
                );
              })}

              {/* ── Quick access ──────────────────────────────────────── */}
              <div className="mt-3 pt-3 border-t border-border">
                <p className="px-4 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Quick Access
                </p>
                {mobileQuickLinks.map(({ icon: Icon, label, href }) => (
                  <button
                    key={label}
                    onClick={() => scrollTo(href)}
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
                      <ClipboardList size={15} className="text-primary flex-shrink-0" />
                      My Orders
                    </button>
                    <button
                      onClick={() => { setShowMyProfile(true); setMobileOpen(false); }}
                      data-testid="mobile-menu-my-profile"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                                 text-foreground hover:text-primary hover:bg-primary/5
                                 rounded-xl transition-all duration-200"
                    >
                      <UserCircle size={15} className="text-primary flex-shrink-0" />
                      My Profile
                    </button>
                    <button
                      onClick={() => { signOut(); setMobileOpen(false); }}
                      data-testid="mobile-menu-logout"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                                 text-destructive hover:bg-destructive/5
                                 rounded-xl transition-all duration-200"
                    >
                      <LogOut size={15} className="flex-shrink-0" />
                      Logout
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
                    <User size={15} className="text-primary flex-shrink-0" />
                    Sign In
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

      {/* Modals */}
      {showSignIn    && <SignInModal    onClose={() => setShowSignIn(false)} />}
      {showMyOrders  && <MyOrdersModal  onClose={() => setShowMyOrders(false)} />}
      {showMyProfile && <MyProfileModal onClose={() => setShowMyProfile(false)} />}
    </>
  );
}
