import { motion } from "framer-motion";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function RefundPolicyPage() {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45 }}>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft size={14} /> Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <RefreshCw size={20} className="text-primary" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legal</p>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-sm text-muted-foreground mb-10">Last updated: January 2025 · Ayush Medico, Kurla West, Mumbai</p>

          <div className="space-y-8">
            <PolicyNote />

            <PolicySection title="1. Order Cancellation">
              <p>You may cancel your order before it is dispatched for delivery. Once dispatched, cancellation is not possible. To cancel, contact us immediately via phone or WhatsApp at +91 98332 73838.</p>
            </PolicySection>

            <PolicySection title="2. Eligible Returns">
              <p>We accept returns only in the following circumstances:</p>
              <ul>
                <li>Wrong product delivered (different from what was ordered).</li>
                <li>Damaged or broken packaging upon delivery.</li>
                <li>Expired product delivered (expiry date passed at time of delivery).</li>
              </ul>
              <p>Returns must be reported within <strong>24 hours of delivery</strong> with photographic evidence.</p>
            </PolicySection>

            <PolicySection title="3. Non-Returnable Items">
              <p>The following products cannot be returned or refunded due to health and safety regulations:</p>
              <ul>
                <li>Prescription medicines once dispensed and delivered.</li>
                <li>Opened or partially used products.</li>
                <li>Products with broken or tampered safety seals (unless received that way).</li>
                <li>Baby care products, diagnostic kits, and thermometers.</li>
                <li>Perishable items.</li>
              </ul>
            </PolicySection>

            <PolicySection title="4. Refund Process">
              <p>Approved refunds will be processed within <strong>5–7 business days</strong> to the original payment method:</p>
              <ul>
                <li>UPI / online payments: refunded to the source account.</li>
                <li>Cash on Delivery: store credit or bank transfer (NEFT/IMPS) on provision of bank details.</li>
              </ul>
            </PolicySection>

            <PolicySection title="5. How to Initiate a Return">
              <p>Contact us within 24 hours of delivery:<br />
                Phone / WhatsApp: <strong>+91 98332 73838</strong><br />
                Mention your order ID, describe the issue, and share photos.
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
