import { motion } from "framer-motion";
import { FileText, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function TermsPage() {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45 }}>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft size={14} /> Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <FileText size={20} className="text-primary" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legal</p>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Terms &amp; Conditions
          </h1>
          <p className="text-sm text-muted-foreground mb-10">Last updated: January 2025 · Ayush Medico, Kurla West, Mumbai</p>

          <div className="space-y-8">
            <PolicyNote />

            <PolicySection title="1. Acceptance of Terms">
              <p>By accessing or using the Ayush Medico website and services, you agree to be bound by these Terms and Conditions. If you do not agree, please discontinue use immediately.</p>
            </PolicySection>

            <PolicySection title="2. Services Provided">
              <p>Ayush Medico provides retail pharmacy services including sale of over-the-counter (OTC) medicines, prescription medicines (subject to valid prescription), healthcare products, and same-day delivery within eligible pincodes in Mumbai.</p>
            </PolicySection>

            <PolicySection title="3. Prescription Medicines">
              <p>Prescription-only medicines (Schedule H, H1, and X) will only be dispensed against a valid, current prescription from a registered medical practitioner. Submitting a forged or expired prescription is a violation of the Drugs and Cosmetics Act, 1940, and may result in cancellation of your order and reporting to relevant authorities.</p>
            </PolicySection>

            <PolicySection title="4. Pricing and Availability">
              <p>All prices displayed are inclusive of applicable taxes. Prices are subject to change without prior notice. Product availability is subject to stock levels. We reserve the right to cancel orders for out-of-stock products with a full refund.</p>
            </PolicySection>

            <PolicySection title="5. User Responsibilities">
              <ul>
                <li>Provide accurate personal and delivery information.</li>
                <li>Upload genuine and valid prescriptions where required.</li>
                <li>Not use the service for any unlawful purpose.</li>
                <li>Accept responsibility for all activities under your account.</li>
              </ul>
            </PolicySection>

            <PolicySection title="6. Limitation of Liability">
              <p>Ayush Medico shall not be liable for any indirect, incidental, or consequential damages arising out of your use of our services. Our liability is limited to the value of the products purchased in any single transaction.</p>
            </PolicySection>

            <PolicySection title="7. Governing Law">
              <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.</p>
            </PolicySection>

            <PolicySection title="8. Contact">
              <p>
                <strong>Ayush Medico</strong><br />
                Shop No. 67, Halav Pool Rd, Makad Wala Chawl, Kurla West, Mumbai – 400070<br />
                Phone: +91 98332 73838
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
      <strong>Sample Policy Template — </strong>This is a placeholder document. Please review and update this policy with the help of a qualified legal professional before going live.
    </div>
  );
}
