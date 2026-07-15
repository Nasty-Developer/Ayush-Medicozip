import { Phone, MapPin, Clock, MessageCircle, Instagram, Facebook, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const quickLinks = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Medicine Catalog", href: "/categories" },
  { label: "Why Choose Us", href: "#why-us" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const categories = [
  { label: "General Medicines", href: "/categories" },
  { label: "Diabetes Care", href: "/categories" },
  { label: "Baby Care", href: "/categories" },
  { label: "Skin & Hair Care", href: "/categories" },
  { label: "Vitamins & Nutrition", href: "/categories" },
  { label: "Medical Devices", href: "/categories" },
  { label: "Ayurvedic", href: "/categories" },
  { label: "Personal Care", href: "/categories" },
];

function scrollTo(href: string) {
  if (href.startsWith("/")) return;
  const el = document.querySelector(href);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

export default function Footer() {
  return (
    <footer className="bg-foreground text-background/80">
      {/* Top CTA strip */}
      <div className="bg-gradient-to-r from-primary via-primary/95 to-secondary py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Need Medicines Delivered?
              </h3>
              <p className="text-white/80 text-sm">Call, WhatsApp, or order online — we deliver same day.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <a
                href="tel:+919833273838"
                className="flex items-center gap-2 px-6 py-3 bg-white text-primary font-semibold rounded-xl text-sm hover:bg-white/90 hover:-translate-y-0.5 transition-all duration-200 shadow-lg"
              >
                <Phone size={16} />
                Call Now
              </a>
              <a
                href="https://wa.me/919833273838"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white font-semibold rounded-xl text-sm hover:bg-[#22c55e] hover:-translate-y-0.5 transition-all duration-200 shadow-lg"
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer body */}
      <div className="pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">

            {/* Brand — takes 2 cols */}
            <div className="sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="8" y="2" width="6" height="18" rx="2" fill="white" />
                    <rect x="2" y="8" width="18" height="6" rx="2" fill="white" />
                  </svg>
                </div>
                <div>
                  <span className="text-lg font-bold text-background" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    Ayush Medico
                  </span>
                  <p className="text-[10px] text-background/50 tracking-widest uppercase">Kurla West · Mumbai</p>
                </div>
              </div>
              <p className="text-sm text-background/60 leading-relaxed mb-5 max-w-xs">
                Your trusted neighborhood pharmacy in Kurla West, Mumbai. Serving the community with genuine medicines and quality healthcare since 2013.
              </p>

              {/* Trust badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/10 border border-background/10 mb-5 w-fit">
                <ShieldCheck size={14} className="text-secondary" />
                <span className="text-xs text-background/70 font-medium">Licensed Retail Pharmacy · Since 2013</span>
              </div>

              {/* Social icons */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {[
                  { href: "tel:+919833273838", icon: Phone, bg: "bg-primary/25 hover:bg-primary", label: "Call" },
                  { href: "https://wa.me/919833273838", icon: MessageCircle, bg: "bg-[#25D366]/25 hover:bg-[#25D366]", label: "WhatsApp" },
                  { href: "https://maps.google.com/?q=Ayush+Medico+Kurla+West", icon: MapPin, bg: "bg-secondary/25 hover:bg-secondary", label: "Map" },
                  { href: "https://www.instagram.com/", icon: Instagram, bg: "bg-pink-500/25 hover:bg-pink-500", label: "Instagram" },
                  { href: "https://www.facebook.com/", icon: Facebook, bg: "bg-blue-500/25 hover:bg-blue-500", label: "Facebook" },
                ].map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    target={s.href.startsWith("http") ? "_blank" : undefined}
                    rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    title={s.label}
                    className={`flex items-center justify-center w-9 h-9 rounded-xl ${s.bg} text-background transition-all duration-200 hover:scale-110`}
                  >
                    <s.icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-background font-semibold mb-5 text-sm tracking-wide" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Quick Links
              </h4>
              <ul className="space-y-2">
                {quickLinks.map(link => (
                  <li key={link.label}>
                    {link.href.startsWith("/") ? (
                      <Link href={link.href} className="text-sm text-background/55 hover:text-background flex items-center gap-1.5 group transition-colors duration-200">
                        <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        {link.label}
                      </Link>
                    ) : (
                      <button
                        onClick={() => scrollTo(link.href)}
                        className="text-sm text-background/55 hover:text-background flex items-center gap-1.5 group transition-colors duration-200"
                      >
                        <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        {link.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h4 className="text-background font-semibold mb-5 text-sm tracking-wide" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Categories
              </h4>
              <ul className="space-y-2">
                {categories.map(c => (
                  <li key={c.label}>
                    <Link href={c.href} className="text-sm text-background/55 hover:text-background flex items-center gap-1.5 group transition-colors duration-200">
                      <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact + Hours */}
            <div>
              <h4 className="text-background font-semibold mb-5 text-sm tracking-wide" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Visit Us
              </h4>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin size={15} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-background/60 leading-relaxed">
                      Shop No 67, Halav Pool Rd,<br />Makad Wala Chawl,<br />Kurla West, Mumbai 400070
                    </p>
                    <a
                      href="https://maps.google.com/?q=Ayush+Medico+Kurla+West"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      Open in Maps →
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={15} className="text-primary flex-shrink-0" />
                  <a href="tel:+919833273838" className="text-sm text-background/60 hover:text-background transition-colors">
                    +91 98332 73838
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <Clock size={15} className="text-secondary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-background/80 font-medium">Mon – Sun</p>
                    <p className="text-xs text-background/55">8:00 AM – 10:00 PM</p>
                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary/20 text-secondary rounded-full text-[10px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                      Open Every Day
                    </div>
                  </div>
                </div>
              </div>

              {/* Legal */}
              <div className="mt-5 pt-5 border-t border-background/10 space-y-1">
                <p className="text-[10px] text-background/35 font-semibold uppercase tracking-wider">Legal</p>
                <p className="text-[11px] text-background/45">Drug License: [DL No. Pending]</p>
                <p className="text-[11px] text-background/45">GST: [GSTIN Pending]</p>
                <p className="text-[11px] text-background/45">Licensed Retail Pharmacy</p>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-background/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-background/35 text-center sm:text-left">
              © 2025 Ayush Medico. All rights reserved. | Trusted pharmacy in Kurla West, Mumbai.
            </p>
            <p className="text-xs text-background/35">
              Made with ❤️ for the community · Shop No 67, Kurla West
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
