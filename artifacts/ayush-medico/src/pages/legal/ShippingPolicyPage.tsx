import { motion } from "framer-motion";
import { Truck, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ShippingPolicyPage() {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45 }}>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft size={14} /> Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Truck size={20} className="text-primary" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legal</p>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Shipping &amp; Delivery Policy
          </h1>
          <p className="text-sm text-muted-foreground mb-10">Last updated: January 2025 · Ayush Medico, Kurla West, Mumbai</p>

          <div className="space-y-8">
            <PolicyNote />

            <PolicySection title="1. Delivery Area">
              <p>We currently deliver to select pincodes within the Kurla West area and surrounding Mumbai localities. Delivery eligibility is confirmed at checkout based on your pincode.</p>
            </PolicySection>

            <PolicySection title="2. Same-Day Delivery">
              <p>Same-day delivery is available for orders placed before <strong>6:00 PM</strong>, subject to product availability and delivery area eligibility. Orders placed after 6:00 PM will be delivered the following day.</p>
            </PolicySection>

            <PolicySection title="3. Delivery Timelines">
              <ul>
                <li><strong>In-stock OTC products:</strong> Same day (order before 6 PM).</li>
                <li><strong>Prescription medicines:</strong> Delivered after prescription verification, typically within 2–4 hours of approval.</li>
                <li><strong>Special order items:</strong> 1–3 business days depending on availability.</li>
              </ul>
            </PolicySection>

            <PolicySection title="4. Delivery Charges">
              <p>Delivery charges (if applicable) are displayed at checkout before you confirm your order. Delivery may be free above a minimum order value — check the website for current promotions.</p>
            </PolicySection>

            <PolicySection title="5. Delivery Attempt">
              <p>Our delivery personnel will make one delivery attempt. If you are unavailable, we will contact you via WhatsApp/phone to reschedule. Unclaimed orders may be cancelled after 24 hours.</p>
            </PolicySection>

            <PolicySection title="6. Damaged or Missing Orders">
              <p>If your order arrives damaged or items are missing, contact us within <strong>24 hours</strong> at +91 98332 73838 with photos. We will arrange a replacement or refund as appropriate.</p>
            </PolicySection>

            <PolicySection title="7. Contact">
              <p>
                <strong>Ayush Medico</strong><br />
                Shop No. 67, Halav Pool Rd, Makad Wala Chawl, Kurla West, Mumbai – 400070<br />
                Phone / WhatsApp: +91 98332 73838
              </p>
            </PolicySection>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border pb-8">
      <h2 className="text-lg font-bold text-foreground mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>{title}</h2>
      <div className="space-y-3 text-muted-foreground text-sm leading-relaxed [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  );
}

function PolicyNote() {
  return (
    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
      <strong>Sample Policy Template — </strong>This is a placeholder document. Please review and update with a qualified legal professional before going live.
    </div>
  );
}
