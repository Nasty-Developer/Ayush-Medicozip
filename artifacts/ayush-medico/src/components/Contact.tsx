import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, Phone, MessageCircle, Clock, ExternalLink } from "lucide-react";

export default function Contact() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="contact" ref={ref} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-4">
            Contact Us
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Visit or{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Get in Touch
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We are located in the heart of Kurla West. Walk in, call us, or drop a WhatsApp message.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Contact info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2 space-y-4"
          >
            {/* Address Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
                  <MapPin size={20} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>Store Address</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Shop No 67, Halav Pool Rd,<br />
                    Makad Wala Chawl, Kurla West,<br />
                    Mumbai, Maharashtra 400070
                  </p>
                  <a
                    href="https://maps.google.com/?q=Shop+No+67,+Halav+Pool+Rd,+Makad+Wala+Chawl,+Kurla+West,+Mumbai"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="contact-directions-btn"
                    className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary hover:underline"
                  >
                    <ExternalLink size={12} />
                    Get Directions
                  </a>
                </div>
              </div>
            </div>

            {/* Phone Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-secondary/20 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-secondary/10 flex-shrink-0">
                  <Phone size={20} className="text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>Phone</p>
                  <p className="text-muted-foreground text-sm">+91 98332 73838</p>
                </div>
                <a
                  href="tel:+919833273838"
                  data-testid="contact-call-btn"
                  className="px-4 py-2 bg-secondary text-white text-sm font-semibold rounded-xl shadow-sm shadow-secondary/25 hover:bg-secondary/90 hover:-translate-y-0.5 transition-all duration-200"
                >
                  Call Now
                </a>
              </div>
            </div>

            {/* WhatsApp Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100 dark:bg-green-950/30 flex-shrink-0">
                  <MessageCircle size={20} className="text-[#25D366]" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>WhatsApp</p>
                  <p className="text-muted-foreground text-sm">Message us anytime</p>
                </div>
                <a
                  href="https://wa.me/919833273838"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="contact-whatsapp-btn"
                  className="px-4 py-2 bg-[#25D366] text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-[#22c35e] hover:-translate-y-0.5 transition-all duration-200"
                >
                  Chat
                </a>
              </div>
            </div>

            {/* Hours Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-accent/10 flex-shrink-0">
                  <Clock size={20} className="text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>Working Hours</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monday – Sunday</span>
                      <span className="text-foreground font-medium">8:00 AM – 10:00 PM</span>
                    </div>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/10 text-secondary rounded-full text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                    Open Now
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-3 rounded-2xl overflow-hidden border border-border shadow-lg shadow-primary/5 min-h-[400px]"
          >
            <iframe
              title="Ayush Medico Location"
              data-testid="contact-map"
              src="https://maps.google.com/maps?q=Ayush+Medico,+Shop+No+67+Halav+Pool+Rd,+Kurla+West+Mumbai+400070&output=embed&z=16"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: "420px" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
