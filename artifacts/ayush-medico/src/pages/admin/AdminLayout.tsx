import { useEffect, useState } from "react";
import { Route, Switch, useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Pill, Megaphone, MessageSquare, HelpCircle,
  Star, Settings, LogOut, Menu, X, ChevronRight, ExternalLink,
  Shield, Tag, Building2, Sparkles, Award, Home
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToCollection, where } from "@/lib/firestoreHelpers";
import DashboardPage from "./DashboardPage";
import MedicinesPage from "./MedicinesPage";
import CategoriesPage from "./CategoriesPage";
import BrandsPage from "./BrandsPage";
import NewArrivalsPage from "./NewArrivalsPage";
import SpecialMedicinesPage from "./SpecialMedicinesPage";
import HomepageManagerPage from "./HomepageManagerPage";
import AnnouncementPage from "./AnnouncementPage";
import InquiriesPage from "./InquiriesPage";
import FAQPage from "./FAQPage";
import TestimonialsPage from "./TestimonialsPage";
import SettingsPage from "./SettingsPage";
import AdminLogin from "./AdminLogin";

type NavItemDef = {
  divider?: string;
  icon?: React.ElementType;
  label?: string;
  href?: string;
  badge?: number;
};

function buildNavItems(newInquiries: number): NavItemDef[] {
  return [
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
    { divider: "Catalog" },
    { icon: Pill,       label: "Medicines",   href: "/admin/medicines" },
    { icon: Tag,        label: "Categories",  href: "/admin/categories" },
    { icon: Building2,  label: "Brands",      href: "/admin/brands" },
    { divider: "Homepage" },
    { icon: Home,       label: "Homepage",    href: "/admin/homepage" },
    { icon: Sparkles,   label: "New Arrivals",    href: "/admin/new-arrivals" },
    { icon: Award,      label: "Special Medicines",href: "/admin/special-medicines" },
    { divider: "Content" },
    { icon: Megaphone,      label: "Announcement", href: "/admin/announcement" },
    { icon: MessageSquare,  label: "Inquiries",    href: "/admin/inquiries", badge: newInquiries },
    { icon: HelpCircle,     label: "FAQ",          href: "/admin/faq" },
    { icon: Star,           label: "Testimonials", href: "/admin/testimonials" },
    { icon: Settings,       label: "Settings",     href: "/admin/settings" },
  ];
}

function Sidebar({
  open,
  onClose,
  newInquiries,
}: {
  open: boolean;
  onClose: () => void;
  newInquiries: number;
}) {
  const [location] = useLocation();
  const { signOut } = useAuth();
  const navItems = buildNavItems(newInquiries);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md flex-shrink-0">
            <Shield size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-bold text-foreground truncate"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Ayush Medico
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Admin Panel
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item, idx) => {
            if (item.divider) {
              return (
                <div key={idx} className="pt-3 pb-1 px-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {item.divider}
                  </p>
                </div>
              );
            }
            const Icon = item.icon!;
            const href = item.href!;
            const active =
              location === href ||
              (href !== "/admin" && location.startsWith(href));
            return (
              <Link key={href} href={href}>
                <a
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-primary text-white shadow-md shadow-primary/25"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon size={17} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span
                      className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                        active
                          ? "bg-white text-primary"
                          : "bg-primary text-white"
                      }`}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                  {active && !item.badge && (
                    <ChevronRight size={14} className="ml-auto" />
                  )}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
          >
            <ExternalLink size={17} />
            View Website
          </a>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-200"
          >
            <LogOut size={17} />
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

  // Real-time badge for new inquiries
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToCollection(
      "inquiries",
      [where("status", "==", "new")],
      (docs) => setNewInquiries(docs.length),
      () => setNewInquiries(0)
    );
    return unsub;
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
      />

      <div className="lg:ml-64">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Menu size={18} />
          </button>

          {/* Mobile: Inquiries badge in header */}
          {newInquiries > 0 && (
            <Link href="/admin/inquiries">
              <a className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                <MessageSquare size={13} />
                {newInquiries} New
              </a>
            </Link>
          )}

          <div className="flex-1" />
          <div className="text-xs text-muted-foreground truncate max-w-[180px]">{user.email}</div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <Switch>
              <Route path="/admin" component={DashboardPage} />
              <Route path="/admin/medicines" component={MedicinesPage} />
              <Route path="/admin/categories" component={CategoriesPage} />
              <Route path="/admin/brands" component={BrandsPage} />
              <Route path="/admin/new-arrivals" component={NewArrivalsPage} />
              <Route path="/admin/special-medicines" component={SpecialMedicinesPage} />
              <Route path="/admin/homepage" component={HomepageManagerPage} />
              <Route path="/admin/announcement" component={AnnouncementPage} />
              <Route path="/admin/inquiries" component={InquiriesPage} />
              <Route path="/admin/faq" component={FAQPage} />
              <Route path="/admin/testimonials" component={TestimonialsPage} />
              <Route path="/admin/settings" component={SettingsPage} />
            </Switch>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
