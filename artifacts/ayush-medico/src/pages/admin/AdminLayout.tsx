import { useEffect, useState } from "react";
import { Route, Switch, useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Pill, Megaphone, MessageSquare, HelpCircle,
  Star, Settings, LogOut, Menu, X, ChevronRight, ExternalLink,
  Shield, Tag, Building2, Sparkles, Award, Home, ClipboardList, ShoppingCart,
  RefreshCw, Scale,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import DashboardPage from "./DashboardPage";
import MedicinesPage from "./MedicinesPage";
import CategoriesPage from "./CategoriesPage";
import BrandsPage from "./BrandsPage";
import NewArrivalsPage from "./NewArrivalsPage";
import SpecialMedicinesPage from "./SpecialMedicinesPage";
import HomepageManagerPage from "./HomepageManagerPage";
import AnnouncementPage from "./AnnouncementPage";
import InquiriesPage from "./InquiriesPage";
import MedicineRequestsPage from "./MedicineRequestsPage";
import OrdersPage from "./OrdersPage";
import FAQPage from "./FAQPage";
import TestimonialsPage from "./TestimonialsPage";
import SettingsPage from "./SettingsPage";
import LegalCompliancePage from "./LegalCompliancePage";
import AdminLogin from "./AdminLogin";
import InventorySyncPage from "./InventorySyncPage";

type NavItemDef = {
  divider?: string;
  icon?: React.ElementType;
  label?: string;
  href?: string;
  badge?: number;
};

function buildNavItems(newInquiries: number, pendingRequests: number): NavItemDef[] {
  return [
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
    { divider: "Catalog" },
    { icon: Pill,       label: "Medicines",   href: "/admin/medicines" },
    { icon: Tag,        label: "Categories",  href: "/admin/categories" },
    { icon: Building2,  label: "Brands",      href: "/admin/brands" },
    { divider: "Homepage" },
    { icon: Home,       label: "Homepage",         href: "/admin/homepage" },
    { icon: Sparkles,   label: "New Arrivals",      href: "/admin/new-arrivals" },
    { icon: Award,      label: "Special Medicines", href: "/admin/special-medicines" },
    { divider: "Customer" },
    { icon: ShoppingCart,   label: "Orders",             href: "/admin/orders" },
    { icon: ClipboardList,  label: "Medicine Requests", href: "/admin/medicine-requests", badge: pendingRequests },
    { icon: MessageSquare,  label: "Inquiries",          href: "/admin/inquiries",          badge: newInquiries },
    { divider: "Content" },
    { icon: Scale,       label: "Legal & Compliance", href: "/admin/legal" },
    { icon: Megaphone,   label: "Announcement", href: "/admin/announcement" },
    { icon: HelpCircle,  label: "FAQ",          href: "/admin/faq" },
    { icon: Star,        label: "Testimonials", href: "/admin/testimonials" },
    { icon: Settings,    label: "Settings",     href: "/admin/settings" },
    { divider: "Inventory" },
    { icon: RefreshCw,   label: "Inventory Sync", href: "/admin/inventory-sync" },
  ];
}

function Sidebar({
  open,
  onClose,
  newInquiries,
  pendingRequests,
}: {
  open: boolean;
  onClose: () => void;
  newInquiries: number;
  pendingRequests: number;
}) {
  const [location] = useLocation();
  const { signOut, user } = useAuth();
  const navItems = buildNavItems(newInquiries, pendingRequests);

  const isActive = (href: string) =>
    href === "/admin" ? location === "/admin" : location.startsWith(href);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40 flex flex-col lg:translate-x-0 lg:transition-none"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Shield size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Ayush Medico
              </p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Admin Panel</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navItems.map((item, idx) => {
            if (item.divider) {
              return (
                <p key={idx} className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 pt-4 pb-1.5">
                  {item.divider}
                </p>
              );
            }

            const Icon = item.icon!;
            const active = isActive(item.href!);

            return (
              <Link key={item.href} href={item.href!}>
                <a
                  onClick={() => onClose()}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl mb-0.5 transition-all duration-150 group relative ${
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="text-sm flex-1">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-full bg-primary text-white text-[10px] font-bold animate-pulse">
                      {item.badge}
                    </span>
                  )}
                  {active && <ChevronRight size={12} className="flex-shrink-0 opacity-50" />}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border p-3 space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground text-sm transition-all"
          >
            <ExternalLink size={15} />
            <span>View Website</span>
          </a>
          {user && (
            <div className="px-3 py-2 rounded-xl bg-muted/50">
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 text-sm font-medium transition-all"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Desktop static sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40 flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 h-14 border-b border-border flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Shield size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-none" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Ayush Medico
            </p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navItems.map((item, idx) => {
            if (item.divider) {
              return (
                <p key={idx} className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 pt-4 pb-1.5">
                  {item.divider}
                </p>
              );
            }

            const Icon = item.icon!;
            const active = isActive(item.href!);

            return (
              <Link key={item.href} href={item.href!}>
                <a
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl mb-0.5 transition-all duration-150 group relative ${
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="text-sm flex-1">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-full bg-primary text-white text-[10px] font-bold animate-pulse">
                      {item.badge}
                    </span>
                  )}
                  {active && <ChevronRight size={12} className="flex-shrink-0 opacity-50" />}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border p-3 space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground text-sm transition-all"
          >
            <ExternalLink size={15} />
            <span>View Website</span>
          </a>
          {user && (
            <div className="px-3 py-2 rounded-xl bg-muted/50">
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 text-sm font-medium transition-all"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newInquiries, setNewInquiries] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);

  // Poll PostgreSQL inquiry counts for sidebar badges (replaces Firestore subscription)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fetchCounts = async () => {
      try {
        const token = await user.getIdToken?.();
        const res = await fetch("/api/inquiries/counts", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok || cancelled) return;
        const data = await res.json() as { newInquiries: number; pendingRequests: number };
        setNewInquiries(data.newInquiries ?? 0);
        setPendingRequests(data.pendingRequests ?? 0);
      } catch {
        // silently ignore — badges are non-critical
      }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30_000); // refresh every 30s
    return () => { cancelled = true; clearInterval(interval); };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AdminLogin />;
  }

  // Optional email allowlist: set VITE_ADMIN_EMAIL to restrict which
  // Firebase account can access the admin panel. If the env var is not
  // set, any authenticated user is allowed (signup must be disabled in
  // Firebase Console → Authentication → Settings → User actions).
  const allowedEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
  if (allowedEmail && user.email !== allowedEmail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <Shield size={40} className="text-destructive" />
        <p className="text-lg font-semibold text-foreground">Access denied</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your account (<span className="font-mono">{user.email}</span>) is not authorised to access the admin panel.
        </p>
        <a href="/" className="text-sm text-primary hover:underline">← Back to website</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        newInquiries={newInquiries}
        pendingRequests={pendingRequests}
      />

      <div className="lg:ml-64">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Menu size={18} />
          </button>

          {/* Mobile badges */}
          <div className="lg:hidden flex items-center gap-2">
            {pendingRequests > 0 && (
              <Link
                href="/admin/medicine-requests"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold"
              >
                <ClipboardList size={13} />
                {pendingRequests} Pending
              </Link>
            )}
            {newInquiries > 0 && (
              <Link
                href="/admin/inquiries"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/10 text-secondary text-xs font-semibold"
              >
                <MessageSquare size={13} />
                {newInquiries} New
              </Link>
            )}
          </div>

          <div className="flex-1" />

          {/* Total badge — desktop */}
          {(pendingRequests + newInquiries) > 0 && (
            <div className="hidden lg:flex items-center gap-2">
              {pendingRequests > 0 && (
                <Link
                  href="/admin/medicine-requests"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-all"
                >
                  <ClipboardList size={13} />
                  {pendingRequests} pending request{pendingRequests !== 1 ? "s" : ""}
                </Link>
              )}
              {newInquiries > 0 && (
                <Link
                  href="/admin/inquiries"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary text-xs font-semibold hover:bg-secondary/20 transition-all"
                >
                  <MessageSquare size={13} />
                  {newInquiries} new {newInquiries === 1 ? "inquiry" : "inquiries"}
                </Link>
              )}
            </div>
          )}
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Switch>
            <Route path="/admin" component={DashboardPage} />
            <Route path="/admin/medicines" component={MedicinesPage} />
            <Route path="/admin/categories" component={CategoriesPage} />
            <Route path="/admin/brands" component={BrandsPage} />
            <Route path="/admin/homepage" component={HomepageManagerPage} />
            <Route path="/admin/new-arrivals" component={NewArrivalsPage} />
            <Route path="/admin/special-medicines" component={SpecialMedicinesPage} />
            <Route path="/admin/announcement" component={AnnouncementPage} />
            <Route path="/admin/orders" component={OrdersPage} />
            <Route path="/admin/medicine-requests" component={MedicineRequestsPage} />
            <Route path="/admin/inquiries" component={InquiriesPage} />
            <Route path="/admin/legal" component={LegalCompliancePage} />
            <Route path="/admin/faq" component={FAQPage} />
            <Route path="/admin/testimonials" component={TestimonialsPage} />
            <Route path="/admin/settings" component={SettingsPage} />
            <Route path="/admin/inventory-sync" component={InventorySyncPage} />
            <Route path="/admin/login" component={AdminLogin} />
          </Switch>
        </main>
      </div>
    </div>
  );
}
