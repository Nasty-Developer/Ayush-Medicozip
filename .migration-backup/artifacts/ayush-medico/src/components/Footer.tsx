import { Phone, MapPin, Clock, MessageCircle } from "lucide-react";

const quickLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Products", href: "#categories" },
  { label: "Why Choose Us", href: "#why-us" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
];

function scrollTo(href: string) {
  const el = document.querySelector(href);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

export default function Footer() {
  return (
    <footer className="bg-foreground text-background/80 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-md">
                <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                  <rect x="8" y="2" width="6" height="18" rx="2" fill="white" />
                  <rect x="2" y="8" width="18" height="6" rx="2" fill="white" />
                </svg>
              </div>
              <div>
                <span className="text-lg font-bold text-background" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Ayush Medico
                </span>
                <p className="text-[10px] text-background/50 tracking-widest uppercase">Kurla West</p>
              </div>
            </div>
            <p className="text-sm text-background/60 leading-relaxed mb-4">
              Your trusted neighborhood pharmacy in Kurla West, Mumbai. Serving the community with genuine medicines and quality healthcare products since 2013.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="tel:+919833273838"
                data-testid="footer-call-btn"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all duration-200"
              >
                <Phone size={16} />
              </a>
              <a
                href="https://wa.me/919833273838"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="footer-whatsapp-btn"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all duration-200"
              >
                <MessageCircle size={16} />
              </a>
              <a
                href="https://maps.google.com/?q=Shop+No+67,+Halav+Pool+Rd,+Makad+Wala+Chawl,+Kurla+West,+Mumbai"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="footer-directions-btn"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-secondary/20 text-secondary hover:bg-secondary hover:text-white transition-all duration-200"
              >
                <MapPin size={16} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-background font-semibold mb-5 text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>Quick Links</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => scrollTo(link.href)}
                    className="text-sm text-background/60 hover:text-background transition-colors duration-200"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-background font-semibold mb-5 text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>Contact Info</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-background/60 leading-relaxed">
                  Shop No 67, Halav Pool Rd, Makad Wala Chawl, Kurla West, Mumbai 400070
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-primary flex-shrink-0" />
                <a href="tel:+919833273838" className="text-sm text-background/60 hover:text-background transition-colors">
                  +91 98332 73838
                </a>
              </div>
              <div className="flex items-center gap-3">
                <MessageCircle size={16} className="text-[#25D366] flex-shrink-0" />
                <a href="https://wa.me/919833273838" target="_blank" rel="noopener noreferrer" className="text-sm text-background/60 hover:text-background transition-colors">
                  WhatsApp Us
                </a>
              </div>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-background font-semibold mb-5 text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>Working Hours</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock size={16} className="text-secondary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-background/80 font-medium">Mon – Sun</p>
                  <p className="text-sm text-background/60">8:00 AM – 10:00 PM</p>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-secondary/20 text-secondary rounded-full text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                Open Every Day
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-background/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-background/40 text-center sm:text-left">
            © 2025 Ayush Medico. All rights reserved. Trusted pharmacy in Kurla West, Mumbai.
          </p>
          <p className="text-xs text-background/40">
            Shop No 67, Kurla West, Mumbai — 400070
          </p>
        </div>
      </div>
    </footer>
  );
}
