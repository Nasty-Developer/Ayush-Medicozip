import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Pill, MessageSquare, Megaphone, Star, HelpCircle, TrendingUp, Clock, CheckCircle2, Tag, Building2 } from "lucide-react";
import { Link } from "wouter";
import { getCollection, orderBy } from "@/lib/firestoreHelpers";

type Stats = {
  medicines: number;
  inquiries: number;
  newInquiries: number;
  faqs: number;
  testimonials: number;
  categories: number;
  brands: number;
};

function StatCard({ icon: Icon, label, value, sub, color, href }: {
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
          <p className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>{value}</p>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </motion.div>
      </a>
    </Link>
  );
}

const quickLinks = [
  { label: "Add Medicine", href: "/admin/medicines", icon: Pill, desc: "Manage your medicine catalog" },
  { label: "View Inquiries", href: "/admin/inquiries", icon: MessageSquare, desc: "Customer medicine requests" },
  { label: "Update Announcement", href: "/admin/announcement", icon: Megaphone, desc: "Control the banner" },
  { label: "Manage Categories", href: "/admin/categories", icon: Tag, desc: "Medicine categories" },
  { label: "Manage Brands", href: "/admin/brands", icon: Building2, desc: "Featured brands" },
  { label: "Manage FAQs", href: "/admin/faq", icon: HelpCircle, desc: "Edit common questions" },
  { label: "Testimonials", href: "/admin/testimonials", icon: Star, desc: "Customer reviews" },
  { label: "Store Settings", href: "/admin/settings", icon: Clock, desc: "Hours, phone, address" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    medicines: 0, inquiries: 0, newInquiries: 0,
    faqs: 0, testimonials: 0, categories: 0, brands: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getCollection("medicines", [], "medicines"),
      getCollection("inquiries", [orderBy("createdAt", "desc")], "inquiries"),
      getCollection("faqs", [], "faqs"),
      getCollection("testimonials", [], "testimonials"),
      getCollection("categories", [], "categories"),
      getCollection("brands", [], "brands"),
    ]).then(([meds, inquiries, faqs, testimonials, categories, brands]) => {
      setStats({
        medicines: meds.length,
        inquiries: inquiries.length,
        newInquiries: inquiries.filter((i) => i.status === "new").length,
        faqs: faqs.length,
        testimonials: testimonials.length,
        categories: categories.length,
        brands: brands.length,
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back! Here's what's happening at Ayush Medico.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Pill} label="Medicines" value={stats.medicines} sub="In catalog" color="bg-primary/10 text-primary" href="/admin/medicines" />
          <StatCard icon={MessageSquare} label="Inquiries" value={stats.inquiries} sub={`${stats.newInquiries} new`} color="bg-secondary/10 text-secondary" href="/admin/inquiries" />
          <StatCard icon={Tag} label="Categories" value={stats.categories} sub="Product groups" color="bg-accent/10 text-accent" href="/admin/categories" />
          <StatCard icon={Building2} label="Brands" value={stats.brands} sub="Featured" color="bg-purple-500/10 text-purple-500" href="/admin/brands" />
          <StatCard icon={HelpCircle} label="FAQs" value={stats.faqs} sub="Published" color="bg-orange-500/10 text-orange-500" href="/admin/faq" />
          <StatCard icon={Star} label="Reviews" value={stats.testimonials} sub="Testimonials" color="bg-pink-500/10 text-pink-500" href="/admin/testimonials" />
        </div>
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
        <p className="text-sm text-muted-foreground">Mon – Sun: <span className="font-medium text-foreground">8:00 AM – 10:00 PM</span></p>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-secondary" />
          Update hours anytime from the Settings page.
        </p>
      </div>
    </motion.div>
  );
}
