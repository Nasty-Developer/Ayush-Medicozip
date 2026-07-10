import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Sun, Menu, X, Phone, Sparkles, Award, Pill, Send, User,
  ChevronDown, ChevronRight, ClipboardList, LogOut, UserCircle,
  Tag, AlertCircle, Loader2,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { useAnnouncement } from "@/context/AnnouncementContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import SignInModal from "@/components/customer/SignInModal";
import MyOrdersModal from "@/components/customer/MyOrdersModal";
import MyProfileModal from "@/components/customer/MyProfileModal";
import { useCategories } from "@/hooks/useCategories";

/* ── Static nav links ─────────────────────────────────────────────────────── */
const navLinks = [
  { label: "Home",         href: "#home" },
  { label: "About",        href: "#about" },
  { label: "Services",     href: "#services" },
  { label: "Categories",   href: "#categories" }, // ← live dropdown
  { label: "Why Us",       href: "#why-us" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact",      href: "#contact" },
];

// Extra quick-access items shown only in the mobile hamburger menu
const mobileQuickLinks = [
  { icon: Sparkles, label: "New Medicine Arrivals",       href: "#new-arrivals" },
  { icon: Award,    label: "Special Medicines",            href: "#special-medicines" },
  { icon: Pill,     label: "Check Medicine Availability",  href: "#medicine-search" },
  { icon: Send,     label: "Request a Medicine",           href: "#request-medicine" },
];

/* ── Logo ─────────────────────────────────────────────────────────────────── */
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

/* ── Category dropdown body (desktop) ────────────────────────────────────── */
/**
 * Separated into its own component so it has no conditional-hook risk.
 * Renders loading skeletons, error state, or the live category list.
 */
function CategoryDropdownBody({
  categories,
  loading,
  error,
  onSelect,
}: {
  categories: ReturnType<typeof useCategories>["categories"];
  loading: boolean;
  error: string | null;
  onSelect: () => void;
}) {
  return (
    <>
      {/* ── "View all" header row ── */}
      <button
        onClick={onSelect}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Tag size={13} className="text-primary" />
        </div>
        All Categories
        <ChevronRight size={12} className="ml-auto text-muted-foreground" />
      </button>

      <div className="mx-4 my-1 h-px bg-border" />

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="px-4 py-2 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={11} className="animate-spin" />
            Loading categories…
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <div className="w-7 h-7 rounded-lg bg-muted animate-pulse flex-shrink-0" />
              <div className="h-3 bg-muted animate-pulse rounded flex-1" style={{ width: `${55 + i * 12}%` }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Firestore error ── */}
      {!loading && error && (
        <div className="px-4 py-3 flex items-start gap-2 text-xs text-destructive">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          <span>Could not load categories. Check your connection and try again.</span>
        </div>
      )}

      {/* ── Empty state (loaded, no categories published) ── */}
      {!loading && !error && categories.length === 0 && (
        <div className="px-4 py-3 text-xs text-muted-foreground">
          No categories published yet.
        </div>
      )}

      {/* ── Category list ── */}
      {!loading && !error && categories.length > 0 && (
        <div className="max-h-72 overflow-y-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={onSelect}
              data-testid={`nav-category-${cat.slug ?? cat.id}`}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <span
                className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-base flex-shrink-0 leading-none"
                role="img"
                aria-label={cat.name}
              >
                {cat.icon || "💊"}
              </span>
              <span className="truncate">{cat.name}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ── Main Header ──────────────────────────────────────────────────────────── */
export default function Header() {
  const { theme, setTheme }             = useTheme();
  const { enabled: announcementEnabled } = useAnnouncement();
  const { user, signOut }               = useCustomerAuth();

  // Live, published-only categories from Firestore (real-time)
  const { categories, loading: catsLoading, error: catsError } = useCategories(true);

  const [scrolled,           setScrolled]          = useState(false);
  const [mobileOpen,         setMobileOpen]         = useState(false);
  const [accountMenuOpen,    setAccountMenuOpen]    = useState(false);
  const [categoriesOpen,     setCategoriesOpen]     = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false); // mobile accordion
  const [showSignIn,         setShowSignIn]         = useState(false);
  const [showMyOrders,       setShowMyOrders]       = useState(false);
  const [showMyProfile,      setShowMyProfile]      = useState(false);

  const categoriesRef = useRef<HTMLDivElement>(null);
  const accountRef    = useRef<HTMLDivElement>(null);

  /* ── Scroll shadow ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Click-outside closes both dropdowns ── */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoriesRef.current && !categoriesRef.current.contains(e.target as Node)) {
        setCategoriesOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── Smooth scroll + close menus ── */
  const scrollTo = (href: string) => {
    setMobileOpen(false);
    setCategoriesOpen(false);
    setCategoriesExpanded(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const firstName = (user?.displayName || user?.email || "Account").split(/\s+/)[0];

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

            {/* ── Desktop nav ──────────────────────────────────────────────── */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                if (link.label === "Categories") {
                  /* Categories — live dropdown from Firestore */
                  return (
                    <div key="Categories" className="relative" ref={categoriesRef}>
                      <button
                        onClick={() => setCategoriesOpen((v) => !v)}
                        data-testid="nav-link-categories"
                        aria-haspopup="listbox"
                        aria-expanded={categoriesOpen}
                        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                          categoriesOpen
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                        }`}
                      >
                        Categories
                        <ChevronDown
                          size={13}
                          className={`transition-transform duration-200 ${categoriesOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      <AnimatePresence>
                        {categoriesOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 top-full mt-2 w-64 bg-card border border-border rounded-2xl shadow-xl shadow-black/10 py-2 z-50 overflow-hidden"
                          >
                            <CategoryDropdownBody
                              categories={categories}
                              loading={catsLoading}
                              error={catsError}
                              onSelect={() => scrollTo("#categories")}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                /* All other links — plain scroll buttons */
                return (
                  <button
                    key={link.label}
                    onClick={() => scrollTo(link.href)}
                    data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5 transition-all duration-200"
                  >
                    {link.label}
                  </button>
                );
              })}
            </nav>

            {/* ── Right-side actions ─────────────────────────────────────── */}
            <div className="flex items-center gap-2">
              <a
                href="tel:+919833273838"
                data-testid="header-call-btn"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-sm shadow-primary/30 transition-all duration-200"
              >
                <Phone size={14} />
                Call Now
              </a>

              {/* Account menu (desktop) */}
              <div className="relative hidden md:block" ref={accountRef}>
                {user ? (
                  <>
                    <button
                      onClick={() => setAccountMenuOpen((v) => !v)}
                      data-testid="button-my-account"
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5 transition-all duration-200"
                    >
                      <User size={15} /> My Account <ChevronDown size={13} />
                    </button>
                    <AnimatePresence>
                      {accountMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-1.5 z-50"
                        >
                          <p className="px-3 py-1.5 text-xs text-muted-foreground truncate border-b border-border mb-1">{firstName}</p>
                          <button
                            onClick={() => { setShowMyOrders(true); setAccountMenuOpen(false); }}
                            data-testid="menu-my-orders"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                          >
                            <ClipboardList size={14} /> My Orders
                          </button>
                          <button
                            onClick={() => { setShowMyProfile(true); setAccountMenuOpen(false); }}
                            data-testid="menu-my-profile"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                          >
                            <UserCircle size={14} /> My Profile
                          </button>
                          <button
                            onClick={() => { signOut(); setAccountMenuOpen(false); }}
                            data-testid="menu-logout"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors"
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
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5 transition-all duration-200"
                  >
                    <User size={15} /> Sign In
                  </button>
                )}
              </div>

              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                data-testid="theme-toggle"
                className="flex items-center justify-center w-9 h-9 rounded-xl border border-border text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* Hamburger (mobile only) */}
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

      {/* ── Mobile menu ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className={`fixed ${
              announcementEnabled ? "top-28" : "top-16"
            } left-0 right-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border shadow-lg md:hidden`}
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link) => {
                if (link.label === "Categories") {
                  /* Categories accordion — shows live Firestore categories */
                  return (
                    <div key="Categories">
                      <button
                        onClick={() => setCategoriesExpanded((v) => !v)}
                        aria-expanded={categoriesExpanded}
                        aria-controls="mobile-categories-menu"
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-200"
                      >
                        <span>Categories</span>
                        <ChevronDown
                          size={14}
                          className={`text-muted-foreground transition-transform duration-200 ${categoriesExpanded ? "rotate-180" : ""}`}
                        />
                      </button>

                      <AnimatePresence>
                        {categoriesExpanded && (
                          <motion.div
                            id="mobile-categories-menu"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-4 pb-1 space-y-0.5">
                              {/* View all */}
                              <button
                                onClick={() => scrollTo("#categories")}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 rounded-xl transition-all duration-200"
                              >
                                <Tag size={14} className="flex-shrink-0" />
                                All Categories
                              </button>

                              {/* Loading */}
                              {catsLoading && (
                                <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
                                  <Loader2 size={11} className="animate-spin" />
                                  Loading…
                                </div>
                              )}

                              {/* Error */}
                              {!catsLoading && catsError && (
                                <div className="flex items-center gap-2 px-4 py-2 text-xs text-destructive">
                                  <AlertCircle size={11} />
                                  Could not load categories
                                </div>
                              )}

                              {/* Category list */}
                              {!catsLoading && !catsError && categories.map((cat) => (
                                <button
                                  key={cat.id}
                                  onClick={() => scrollTo("#categories")}
                                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-200"
                                >
                                  <span className="text-base leading-none w-5 text-center flex-shrink-0" role="img" aria-label={cat.name}>
                                    {cat.icon || "💊"}
                                  </span>
                                  {cat.name}
                                </button>
                              ))}
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
                    className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-200"
                  >
                    {link.label}
                  </button>
                );
              })}

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

              {/* Account section */}
              <div className="mt-3 pt-3 border-t border-border">
                {user ? (
                  <>
                    <p className="px-4 pb-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {firstName}
                    </p>
                    <button
                      onClick={() => { setShowMyOrders(true); setMobileOpen(false); }}
                      data-testid="mobile-menu-my-orders"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-200"
                    >
                      <ClipboardList size={15} className="text-primary flex-shrink-0" /> My Orders
                    </button>
                    <button
                      onClick={() => { setShowMyProfile(true); setMobileOpen(false); }}
                      data-testid="mobile-menu-my-profile"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-200"
                    >
                      <UserCircle size={15} className="text-primary flex-shrink-0" /> My Profile
                    </button>
                    <button
                      onClick={() => { signOut(); setMobileOpen(false); }}
                      data-testid="mobile-menu-logout"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5 rounded-xl transition-all duration-200"
                    >
                      <LogOut size={15} className="flex-shrink-0" /> Logout
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setShowSignIn(true); setMobileOpen(false); }}
                    data-testid="mobile-menu-sign-in"
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-200"
                  >
                    <User size={15} className="text-primary flex-shrink-0" /> Sign In
                  </button>
                )}
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

      {showSignIn    && <SignInModal    onClose={() => setShowSignIn(false)} />}
      {showMyOrders  && <MyOrdersModal  onClose={() => setShowMyOrders(false)} />}
      {showMyProfile && <MyProfileModal onClose={() => setShowMyProfile(false)} />}
    </>
  );
}
