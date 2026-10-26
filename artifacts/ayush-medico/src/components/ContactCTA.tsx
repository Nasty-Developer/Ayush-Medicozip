/**
 * ContactCTA — compact homepage contact call-to-action.
 * Replaces the full Contact section on the homepage; links to /contact for more info.
 */
import { Phone, MapPin, MessageCircle, ArrowRight, Clock } from "lucide-react";
import { Link } from "wouter";

export default function ContactCTA() {
  return (
    <section id="contact-cta" className="relative py-20 lg:py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-secondary/6" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-6">
          <Clock size={14} />
          Open Mon – Sun · 8 AM – 10 PM
        </div>

        <h2
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          Ready to{" "}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Order?
          </span>
        </h2>
        <p className="text-muted-foreground text-base lg:text-lg mb-10 max-w-xl mx-auto">
          Call, WhatsApp, or visit us — we're always ready to help with your medicine needs.
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <a
            href="tel:+919833273838"
            className="flex items-center gap-2 px-6 py-3.5 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 hover:-translate-y-0.5 transition-all duration-200"
          >
            <Phone size={18} /> Call Now
          </a>
          <a
            href="https://wa.me/919833273838"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3.5 bg-[#25D366] text-white font-semibold rounded-xl shadow-lg shadow-green-500/30 hover:bg-[#128C7E] hover:-translate-y-0.5 transition-all duration-200"
          >
            <MessageCircle size={18} /> WhatsApp
          </a>
          <a
            href="https://maps.google.com/?q=Shop+No+67,+Halav+Pool+Rd,+Makad+Wala+Chawl,+Kurla+West,+Mumbai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3.5 bg-secondary text-white font-semibold rounded-xl shadow-lg shadow-secondary/30 hover:bg-secondary/90 hover:-translate-y-0.5 transition-all duration-200"
          >
            <MapPin size={18} /> Get Directions
          </a>
        </div>

        {/* Link to full contact page */}
        <Link
          href="/contact"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary font-medium transition-colors duration-200"
        >
          View full contact information <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
