/**
 * Admin Dashboard
 *
 * All stats now pull from a single source of truth: /api/admin/stats
 * (PostgreSQL) — medicines, categories, companies, drug groups, inquiries,
 * FAQs, and testimonials all live in SQL.
 *
 * The dashboard re-fetches stats whenever the page mounts and also listens for
 * the custom "ayush:sync-complete" window event fired by InventorySyncPage after
 * a successful inventory sync — so counts update without a full page reload.
 */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Pill, MessageSquare, Megaphone, Star, HelpCircle,
  TrendingUp, Clock, CheckCircle2, Tag, Building2, FlaskConical, RefreshCw,
} from "lucide-react";
import { Link } from "wouter";

type Stats = {
  medicines:  number;
  categories: number;
  companies:  number;
  drugGroups: number;
  inquiries:  number;
  newInquiries: number;
  faqs:        number;
  testimonials: number;
};

function StatCard({
  icon: Icon, label, value, sub, color, href,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
  color: string; href: string;
}) {
  return (
    <Link href={href}>
      <a>
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-2.5 rounded-xl ${color}`}>
              <Icon size={20} />
            </div>
            <TrendingUp size={14} className="text-muted-foreground" />
          </div>
          <p
            className="text-2xl font-bold text-foreground mb-1"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </motion.div>
      </a>
    </Link>
  );
}

const quickLinks = [
  { label: "Add Medicine",         href: "/admin/medicines",    icon: Pill,         desc: "Manage your medicine catalog" },
  { label: "View Inquiries",       href: "/admin/inquiries",    icon: MessageSquare,desc: "Customer medicine requests" },
  { label: "Update Announcement",  href: "/admin/announcement", icon: Megaphone,    desc: "Control the banner" },
  { label: "Manage Categories",    href: "/admin/categories",   icon: Tag,          desc: "Medicine categories" },
  { label: "Manage Companies",     href: "/admin/brands",       icon: Building2,    desc: "Pharmaceutical companies" },
  { label: "Manage FAQs",          href: "/admin/faq",          icon: HelpCircle,   desc: "Edit common questions" },
  { label: "Testimonials",         href: "/admin/testimonials", icon: Star,         desc: "Customer reviews" },
  { label: "Store Settings",       href: "/admin/settings",     icon: Clock,        desc: "Hours, phone, address" },
];

const INIT: Stats = {
  medicines: 0, categories: 0, companies: 0, drugGroups: 0,
  inquiries: 0, newInquiries: 0, faqs: 0, testimonials: 0,
};

export default function DashboardPage() {
  const [stats,   setStats]   = useState<Stats>(INIT);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      const data = res.ok ? await res.json() as Stats : INIT;
      setStats(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Re-fetch whenever inventory sync completes
  useEffect(() => {
    const handler = () => fetchStats();
    window.addEventListener("ayush:sync-complete", handler);
    return () => window.removeEventListener("ayush:sync-complete", handler);
  }, [fetchStats]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back! Here's what's happening at Ayush Medico.
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Inventory stats (PostgreSQL) ─────────────────────────────── */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Inventory Catalogue
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Pill}         label="Medicines"    value={stats.medicines}   sub="Active in catalogue"    color="bg-primary/10 text-primary"       href="/admin/medicines" />
            <StatCard icon={Tag}          label="Categories"   value={stats.categories}  sub="Product groups"         color="bg-accent/10 text-accent"          href="/admin/categories" />
            <StatCard icon={Building2}    label="Companies"    value={stats.companies}   sub="Manufacturers"          color="bg-purple-500/10 text-purple-500"  href="/admin/brands" />
            <StatCard icon={FlaskConical} label="Drug Groups"  value={stats.drugGroups}  sub="Generic formulations"   color="bg-teal-500/10 text-teal-500"      href="/admin/medicines" />
          </div>

          {/* ── Engagement stats (Firestore) ─────────────────────────────── */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Customer Engagement
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard icon={MessageSquare}label="Inquiries"    value={stats.inquiries}    sub={`${stats.newInquiries} new`} color="bg-secondary/10 text-secondary" href="/admin/inquiries" />
            <StatCard icon={HelpCircle}   label="FAQs"         value={stats.faqs}         sub="Published"               color="bg-orange-500/10 text-orange-500"  href="/admin/faq" />
            <StatCard icon={Star}         label="Reviews"      value={stats.testimonials} sub="Testimonials"             color="bg-pink-500/10 text-pink-500"      href="/admin/testimonials" />
          </div>
        </>
      )}

      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Quick Actions</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {quickLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <a>
              <motion.div
                whileHover={{ y: -2 }}
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                  <item.icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                </div>
              </motion.div>
            </a>
          </Link>
        ))}
      </div>

      <div className="mt-8 p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={14} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Store Hours</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Mon – Sun: <span className="font-medium text-foreground">8:00 AM – 10:00 PM</span>
        </p>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-secondary" />
          Update hours anytime from the Settings page.
        </p>
      </div>
    </motion.div>
  );
}
